/**
 * ==========================================================================
 * Travel Manager App / Swiss Family Odyssey
 * Google Apps Script (GAS) API Proxy (高容錯多旅程同步強健版 v3)
 * ==========================================================================
 * 特性：
 * 1. 支援多場旅遊計畫 (tripId 隔離)，同一份 Sheet 儲存所有旅程資料
 * 2. 自動防搶寫併發鎖 (LockService)
 * 3. 分頁不存在時自動建立，欄位不存在時自動建立標題列
 * 4. UPDATE 操作支援 Upsert (找不到 ID 或分頁為空時自動新增，絕不報「分頁無資料」)
 * 5. 支援行程日程分頁 (Itinerary) 與 TimeBlocks JSON 批次同步
 * 6. doGet / doPost 密鑰安全驗證 (Secret Key)
 */

// 自訂防護密鑰 (必須與前端一致)
var SCRIPT_SECRET = "SWISS_ODYSSEY_2027_SECRET";

// 各分頁標準預設標題列 (全新自動建立)
var DEFAULT_HEADERS = {
  TripConfig: ["tripId", "key", "value", "updatedAt"],
  Expenses: ["tripId", "id", "timestamp", "dayNumber", "category", "amount", "currency", "note", "paidBy"],
  Checklist: ["tripId", "id", "category", "categoryLabel", "item", "checked", "priority", "assignedTo", "altitudeRange"],
  Bookmarks: ["tripId", "id", "locationId", "locationName", "notes", "timestamp"],
  Accommodations: ["tripId", "id", "baseId", "baseNameZh", "hotelName", "roomType", "checkInDate", "checkOutDate", "nights", "bookingPlatform", "confirmationCode", "totalPrice", "currency", "paymentStatus", "paymentStatusLabel", "address", "checkInTimeNotice", "keyPickupNotice", "garbageRulesNotice", "kitchenRulesNotice", "notes"],
  Transports: ["tripId", "id", "category", "categoryLabel", "title", "routeFrom", "routeTo", "departureTime", "operatorNumber", "bookingReference", "seatsInfo", "ticketType", "platformNotice", "luggageNotice", "boardingNotice", "notes"],
  Itinerary: ["tripId", "dayId", "day", "baseId", "title", "subtitle", "highlights", "timeBlocksJson", "foodNotesJson", "updatedAt"],
  Locations: ["tripId", "id", "name", "nameZh", "category", "lat", "lng", "altitude", "description", "dayNumbers", "stpNote"]
};

/**
 * 取得或自動建立分頁
 */
function getOrCreateSheet(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    var defHeaders = DEFAULT_HEADERS[sheetName];
    if (defHeaders && defHeaders.length > 0) {
      sheet.getRange(1, 1, 1, defHeaders.length).setValues([defHeaders]);
    }
  }
  return sheet;
}

/**
 * 確保分頁有最新標準標題列 (具備自動升級舊架構能力)
 */
function ensureHeaders(sheet, sheetName, sampleObj) {
  var defHeaders = DEFAULT_HEADERS[sheetName];
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    if (!defHeaders || defHeaders.length === 0) {
      defHeaders = Object.keys(sampleObj || {});
      if (defHeaders.length === 0) defHeaders = ["tripId", "id", "timestamp"];
    }
    sheet.getRange(1, 1, 1, defHeaders.length).setValues([defHeaders]);
    return defHeaders;
  }

  var existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // 若為系統已知標準分頁，檢查標題是否符合最新架構
  if (defHeaders && defHeaders.length > 0) {
    var hasTripId = existingHeaders.indexOf("tripId") > -1;
    var isItineraryValid = sheetName !== "Itinerary" || existingHeaders.indexOf("timeBlocksJson") > -1;

    // 若缺少關鍵欄位 (如 tripId 或 timeBlocksJson)，自動升級標題列為最新標準標題
    if (!hasTripId || !isItineraryValid) {
      sheet.getRange(1, 1, 1, Math.max(existingHeaders.length, defHeaders.length)).clearContent();
      sheet.getRange(1, 1, 1, defHeaders.length).setValues([defHeaders]);
      return defHeaders;
    }
  }

  return existingHeaders;
}

/**
 * HTTP GET：讀取試算表資料 (支援 tripId 隔離篩選與 Secret 防護)
 */
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetParam = e && e.parameter ? e.parameter.sheet : null;
    var tripIdParam = e && e.parameter ? e.parameter.tripId : null;
    var secretParam = e && e.parameter ? e.parameter.secret : null;

    // 若設定了 secret 且前端有傳入，驗證防護
    if (secretParam && secretParam !== SCRIPT_SECRET) {
      return jsonResponse({ success: false, error: "密鑰驗證失敗 (Unauthorized)" }, 401);
    }

    function filterRows(rows) {
      if (!tripIdParam) return rows;
      return rows.filter(function (r) {
        // 若資料列無 tripId 則代表舊版共用資料，依然予以保留相容
        return !r.tripId || String(r.tripId) === String(tripIdParam);
      });
    }

    if (sheetParam) {
      var ws = ss.getSheetByName(sheetParam);
      if (!ws) {
        return jsonResponse({ success: true, data: [] });
      }
      return jsonResponse({ success: true, data: filterRows(sheetToObjects(ws)) });
    }

    // 一次拉取全部分頁
    var result = {};
    var sheets = ss.getSheets();
    for (var i = 0; i < sheets.length; i++) {
      var s = sheets[i];
      result[s.getName()] = filterRows(sheetToObjects(s));
    }

    return jsonResponse({ success: true, data: result });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() }, 500);
  }
}

/**
 * HTTP POST：寫入 / 更新 / 刪除試算表資料 (支援 tripId 與 Upsert)
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return jsonResponse({ success: false, error: "系統忙碌中，請稍候重試" }, 503);
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, error: "缺少請求酬載 (Payload)" }, 400);
    }

    var payload = JSON.parse(e.postData.contents);

    // 檢查密鑰
    if (payload.secret && payload.secret !== SCRIPT_SECRET) {
      return jsonResponse({ success: false, error: "密鑰驗證失敗 (Unauthorized)" }, 401);
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = payload.sheet || "General";
    var sheet = getOrCreateSheet(ss, sheetName);
    var action = payload.action;
    var tripId = payload.tripId || "";

    // 1. 新增 (APPEND)
    if (action === "APPEND") {
      var rowObj = payload.row || {};
      if (tripId && !rowObj.tripId) rowObj.tripId = tripId;
      if (!rowObj.id && !rowObj.key) rowObj.id = Utilities.getUuid();
      if (!rowObj.timestamp) rowObj.timestamp = new Date().toISOString();

      var headers = ensureHeaders(sheet, sheetName, rowObj);

      var newRow = headers.map(function (h) {
        return rowObj[h] !== undefined ? rowObj[h] : "";
      });

      sheet.appendRow(newRow);
      return jsonResponse({ success: true, action: "APPEND", id: rowObj.id || rowObj.key, row: rowObj });
    }

    // 2. 更新或自動新增 (UPDATE / UPSERT)
    if (action === "UPDATE") {
      var targetId = payload.id !== undefined ? payload.id : payload.key;
      var updates = payload.updates || {};
      if (tripId && !updates.tripId) updates.tripId = tripId;
      updates.updatedAt = new Date().toISOString();

      var headersList = ensureHeaders(sheet, sheetName, updates);

      // 尋找 ID 欄位
      var idColIdx = headersList.indexOf("id");
      if (idColIdx === -1) idColIdx = headersList.indexOf("key");
      if (idColIdx === -1) idColIdx = headersList.indexOf("dayId");
      if (idColIdx === -1) {
        headersList.unshift("id");
        sheet.getRange(1, 1, 1, headersList.length).setValues([headersList]);
        idColIdx = 0;
      }

      var tripIdColIdx = headersList.indexOf("tripId");

      var lastRow = sheet.getLastRow();
      var foundRowIndex = -1;

      if (lastRow >= 2) {
        var idValues = sheet.getRange(2, idColIdx + 1, lastRow - 1, 1).getValues();
        var tripValues = tripIdColIdx !== -1 ? sheet.getRange(2, tripIdColIdx + 1, lastRow - 1, 1).getValues() : null;

        for (var r = 0; r < idValues.length; r++) {
          if (String(idValues[r][0]) === String(targetId)) {
            // 若有 tripId 則必須匹配相同 tripId
            if (!tripId || !tripValues || String(tripValues[r][0]) === String(tripId) || !tripValues[r][0]) {
              foundRowIndex = r + 2;
              break;
            }
          }
        }
      }

      // A. 若找到該列，逐欄更新
      if (foundRowIndex > -1) {
        for (var c = 0; c < headersList.length; c++) {
          var colName = headersList[c];
          if (updates[colName] !== undefined) {
            sheet.getRange(foundRowIndex, c + 1).setValue(updates[colName]);
          }
        }
        return jsonResponse({ success: true, action: "UPDATE", id: targetId, row: updates });
      }

      // B. 找不到 ID：自動 UPSERT 新增
      var upsertRow = headersList.map(function (colName) {
        if (colName === "id" || colName === "key" || colName === "dayId") {
          return targetId;
        }
        if (colName === "tripId") {
          return tripId;
        }
        return updates[colName] !== undefined ? updates[colName] : "";
      });

      sheet.appendRow(upsertRow);
      return jsonResponse({ success: true, action: "UPSERT_APPEND", id: targetId, row: updates });
    }

    // 3. 刪除 (DELETE)
    if (action === "DELETE") {
      var delId = payload.id !== undefined ? payload.id : payload.key;
      var lastR = sheet.getLastRow();
      if (lastR < 2) {
        return jsonResponse({ success: true, action: "DELETE", note: "分頁本無資料可刪" });
      }

      var headersDel = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var idIdxDel = headersDel.indexOf("id");
      if (idIdxDel === -1) idIdxDel = headersDel.indexOf("key");
      if (idIdxDel === -1) idIdxDel = headersDel.indexOf("dayId");
      if (idIdxDel === -1) return jsonResponse({ success: false, error: "無 ID/KEY 欄位" }, 400);

      var rowsDel = sheet.getRange(2, idIdxDel + 1, lastR - 1, 1).getValues();
      for (var d = 0; d < rowsDel.length; d++) {
        if (String(rowsDel[d][0]) === String(delId)) {
          sheet.deleteRow(d + 2);
          return jsonResponse({ success: true, action: "DELETE", id: delId });
        }
      }
      return jsonResponse({ success: true, action: "DELETE", note: "ID 已不存在" });
    }

    // 4. 整份旅程原子化全量同步 (BATCH_SYNC_TRIP，一次性將行程、住宿、交通、清單寫入試算表)
    if (action === "BATCH_SYNC_TRIP") {
      var tripData = payload.tripData || payload;
      var currentTripId = tripId || tripData.id || "trip_main";
      var stats = { itinerary: 0, accommodations: 0, transports: 0, checklist: 0, expenses: 0, config: 0, locations: 0, bookmarks: 0 };

      // 輔助函式：全量替換某分頁中屬於 currentTripId 的資料列 (記憶體過濾 + 單次批次寫入，極速避免超時)
      function syncSheetRows(targetSheetName, rawRows, rowMapper) {
        var ws = getOrCreateSheet(ss, targetSheetName);
        var headerRow = ensureHeaders(ws, targetSheetName);
        var lastR = ws.getLastRow();
        var lastC = ws.getLastColumn();
        if (lastC === 0) lastC = headerRow.length;

        var tColIdx = headerRow.indexOf("tripId");

        // 1. 在記憶體中篩選保留其他旅程的資料 (避免逐列 deleteRow 造成超時)
        var retainedRows = [];
        if (lastR >= 2 && lastC >= 1) {
          var existingData = ws.getRange(2, 1, lastR - 1, lastC).getValues();
          if (tColIdx > -1) {
            retainedRows = existingData.filter(function (row) {
              var rTrip = String(row[tColIdx]).trim();
              return rTrip !== "" && rTrip !== String(currentTripId);
            });
          } else {
            // 若原有資料無 tripId 欄位，代表為舊版衝突表格，不保留任何髒資料
            retainedRows = [];
          }
        }

        // 2. 映射本次新資料為二維陣列
        var newRows = [];
        if (rawRows && rawRows.length > 0) {
          newRows = rawRows.map(function (item) {
            var mapped = rowMapper(item);
            mapped.tripId = currentTripId;
            return headerRow.map(function (col) {
              return mapped[col] !== undefined ? mapped[col] : "";
            });
          });
        }

        // 3. 一次性清空第 2 列以後舊資料 (僅 1 次 RPC)
        if (lastR >= 2 && lastC >= 1) {
          ws.getRange(2, 1, lastR - 1, lastC).clearContent();
        }

        // 4. 一次性整批寫入合併後的資料列 (僅 1 次 RPC)
        var combinedRows = retainedRows.concat(newRows);
        if (combinedRows.length > 0) {
          ws.getRange(2, 1, combinedRows.length, headerRow.length).setValues(combinedRows);
        }

        return newRows.length;
      }

      // A. 同步 TripConfig
      var configItems = [];
      if (tripData.config) {
        if (tripData.config.tripName) configItems.push({ key: "tripName", value: tripData.config.tripName });
        if (tripData.config.startDate) configItems.push({ key: "startDate", value: tripData.config.startDate });
        if (tripData.config.totalDays) configItems.push({ key: "totalDays", value: tripData.config.totalDays });
        if (tripData.destination) configItems.push({ key: "destination", value: tripData.destination });
        if (tripData.config.currencies && tripData.config.currencies.primary) {
          configItems.push({ key: "primaryCurrency", value: tripData.config.currencies.primary });
        }
        if (tripData.config.bases) {
          configItems.push({ key: "basesJson", value: JSON.stringify(tripData.config.bases) });
        }
      } else if (tripData.bases) {
        configItems.push({ key: "basesJson", value: JSON.stringify(tripData.bases) });
      }
      stats.config = syncSheetRows("TripConfig", configItems, function (c) {
        return { key: c.key, value: String(c.value), updatedAt: new Date().toISOString() };
      });

      // B. 同步 Itinerary (日程與時段)
      if (Array.isArray(tripData.itinerary)) {
        stats.itinerary = syncSheetRows("Itinerary", tripData.itinerary, function (day) {
          return {
            dayId: day.id || ("day_" + day.day),
            day: day.day,
            baseId: day.baseId || "",
            title: day.title || "",
            subtitle: day.subtitle || "",
            highlights: Array.isArray(day.highlights) ? day.highlights.join("; ") : "",
            timeBlocksJson: JSON.stringify(day.timeBlocks || []),
            foodNotesJson: JSON.stringify(day.foodNotes || []),
            updatedAt: new Date().toISOString()
          };
        });
      }

      // C. 同步 Accommodations (住宿預訂)
      if (Array.isArray(tripData.accommodations)) {
        stats.accommodations = syncSheetRows("Accommodations", tripData.accommodations, function (acc) {
          return {
            id: acc.id,
            baseId: acc.baseId,
            baseNameZh: acc.baseNameZh || "",
            hotelName: acc.hotelName || "",
            roomType: acc.roomType || "",
            checkInDate: acc.checkInDate || "",
            checkOutDate: acc.checkOutDate || "",
            nights: acc.nights || 1,
            bookingPlatform: acc.bookingPlatform || "",
            confirmationCode: acc.confirmationCode || "",
            totalPrice: acc.totalPrice || 0,
            currency: acc.currency || "TWD",
            paymentStatus: acc.paymentStatus || "",
            paymentStatusLabel: acc.paymentStatusLabel || "",
            address: acc.address || "",
            checkInTimeNotice: acc.checkInTimeNotice || "",
            keyPickupNotice: acc.keyPickupNotice || "",
            garbageRulesNotice: acc.garbageRulesNotice || "",
            kitchenRulesNotice: acc.kitchenRulesNotice || "",
            notes: acc.notes || ""
          };
        });
      }

      // D. 同步 Transports (交通預訂)
      if (Array.isArray(tripData.transports)) {
        stats.transports = syncSheetRows("Transports", tripData.transports, function (tra) {
          return {
            id: tra.id,
            category: tra.category || "",
            categoryLabel: tra.categoryLabel || "",
            title: tra.title || "",
            routeFrom: tra.routeFrom || "",
            routeTo: tra.routeTo || "",
            departureTime: tra.departureTime || "",
            operatorNumber: tra.operatorNumber || "",
            bookingReference: tra.bookingReference || "",
            seatsInfo: tra.seatsInfo || "",
            ticketType: tra.ticketType || "",
            platformNotice: tra.platformNotice || "",
            luggageNotice: tra.luggageNotice || "",
            boardingNotice: tra.boardingNotice || "",
            notes: tra.notes || ""
          };
        });
      }

      // E. 同步 Checklist (行前清單)
      if (Array.isArray(tripData.checklist)) {
        stats.checklist = syncSheetRows("Checklist", tripData.checklist, function (chk) {
          return {
            id: chk.id,
            category: chk.category || "",
            categoryLabel: chk.categoryLabel || "",
            item: chk.item || "",
            checked: chk.checked ? "TRUE" : "FALSE",
            priority: chk.priority || "medium",
            assignedTo: chk.assignedTo || "",
            altitudeRange: chk.altitudeRange || ""
          };
        });
      }

      // F. 同步 Expenses (花費)
      if (Array.isArray(tripData.expenses) && tripData.expenses.length > 0) {
        stats.expenses = syncSheetRows("Expenses", tripData.expenses, function (exp) {
          return {
            id: exp.id,
            timestamp: exp.timestamp || new Date().toISOString(),
            dayNumber: exp.dayNumber || "",
            category: exp.category || "other",
            amount: exp.amount || 0,
            currency: exp.currency || "TWD",
            note: exp.note || "",
            paidBy: exp.paidBy || ""
          };
        });
      }

      // G. 同步 Locations (景點與地理地圖點位)
      if (Array.isArray(tripData.locations)) {
        stats.locations = syncSheetRows("Locations", tripData.locations, function (loc) {
          return {
            id: loc.id || Utilities.getUuid(),
            name: loc.name || "",
            nameZh: loc.nameZh || loc.name || "",
            category: loc.category || "viewpoint",
            lat: loc.lat !== undefined ? loc.lat : "",
            lng: loc.lng !== undefined ? loc.lng : "",
            altitude: loc.altitude !== undefined ? loc.altitude : "",
            description: loc.description || "",
            dayNumbers: Array.isArray(loc.dayNumbers) ? loc.dayNumbers.join(",") : (loc.dayNumbers || ""),
            stpNote: loc.stpNote || ""
          };
        });
      }

      // H. 同步 Bookmarks (地圖收藏)
      if (Array.isArray(tripData.bookmarks)) {
        stats.bookmarks = syncSheetRows("Bookmarks", tripData.bookmarks, function (bm) {
          var bmId = typeof bm === "string" ? bm : (bm.locationId || bm.id);
          var bmName = typeof bm === "string" ? "" : (bm.locationName || "");
          var bmNotes = typeof bm === "string" ? "" : (bm.notes || "");
          return {
            id: Utilities.getUuid(),
            locationId: bmId,
            locationName: bmName,
            notes: bmNotes,
            timestamp: new Date().toISOString()
          };
        });
      }

      SpreadsheetApp.flush();

      return jsonResponse({
        success: true,
        action: "BATCH_SYNC_TRIP",
        tripId: currentTripId,
        stats: stats,
        message: "全量行程與預訂資料已成功發布至 Google 試算表！"
      });
    }

    // 5. 刪除整場旅程雲端所有分頁資料 (DELETE_TRIP)
    if (action === "DELETE_TRIP") {
      var targetTripId = tripId || payload.id;
      if (!targetTripId) {
        return jsonResponse({ success: false, error: "缺少 tripId" }, 400);
      }
      var sheetNames = Object.keys(DEFAULT_HEADERS);
      var deletedStats = {};
      for (var s = 0; s < sheetNames.length; s++) {
        var sName = sheetNames[s];
        var wsDel = ss.getSheetByName(sName);
        if (!wsDel) continue;
        var lastRDel = wsDel.getLastRow();
        var lastCDel = wsDel.getLastColumn();
        if (lastRDel < 2 || lastCDel < 1) continue;
        var headerRowDel = wsDel.getRange(1, 1, 1, lastCDel).getValues()[0];
        var tColIdxDel = headerRowDel.indexOf("tripId");
        if (tColIdxDel === -1) continue;

        var existingDataDel = wsDel.getRange(2, 1, lastRDel - 1, lastCDel).getValues();
        var retainedDel = [];
        var delCount = 0;
        for (var rDel = 0; rDel < existingDataDel.length; rDel++) {
          var rowTripId = String(existingDataDel[rDel][tColIdxDel]).trim();
          if (rowTripId === String(targetTripId)) {
            delCount++;
          } else {
            retainedDel.push(existingDataDel[rDel]);
          }
        }
        deletedStats[sName] = delCount;
        wsDel.getRange(2, 1, lastRDel - 1, lastCDel).clearContent();
        if (retainedDel.length > 0) {
          wsDel.getRange(2, 1, retainedDel.length, lastCDel).setValues(retainedDel);
        }
      }
      SpreadsheetApp.flush();
      return jsonResponse({
        success: true,
        action: "DELETE_TRIP",
        tripId: targetTripId,
        deletedStats: deletedStats,
        message: "已成功從雲端清除該旅程的所有分頁資料！"
      });
    }

    return jsonResponse({ success: false, error: "未知的 action: " + action }, 400);
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() }, 500);
  } finally {
    lock.releaseLock();
  }
}

/**
 * 試算表轉換物件陣列
 */
function sheetToObjects(sheet) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];

  var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = data[0];
  var rows = [];

  for (var i = 1; i < data.length; i++) {
    var obj = {};
    var hasContent = false;
    for (var j = 0; j < headers.length; j++) {
      var key = String(headers[j]).trim();
      if (key) {
        var val = data[i][j];
        // 若儲存格值為 Date 物件，轉為 yyyy-MM-dd 字串，防止 JSON.stringify 產生 UTC 偏差 ISO 字串 (如 2027-07-09T16:00:00.000Z)
        if (Object.prototype.toString.call(val) === "[object Date]" || val instanceof Date) {
          try {
            var tz = sheet.getParent().getSpreadsheetTimeZone() || Session.getScriptTimeZone() || "Asia/Taipei";
            val = Utilities.formatDate(val, tz, "yyyy-MM-dd");
          } catch (dateErr) {
            val = Utilities.formatDate(val, "GMT+8", "yyyy-MM-dd");
          }
        }
        obj[key] = val;
        if (val !== "" && val !== null && val !== undefined) {
          hasContent = true;
        }
      }
    }
    if (hasContent) {
      rows.push(obj);
    }
  }
  return rows;
}

function jsonResponse(data, statusCode) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
