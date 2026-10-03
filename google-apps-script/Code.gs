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
  Itinerary: ["tripId", "dayId", "day", "baseId", "title", "subtitle", "highlights", "timeBlocksJson", "foodNotesJson", "updatedAt"]
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
 * 確保分頁有標題列
 */
function ensureHeaders(sheet, sheetName, sampleObj) {
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    var defHeaders = DEFAULT_HEADERS[sheetName];
    if (!defHeaders || defHeaders.length === 0) {
      defHeaders = Object.keys(sampleObj || {});
      if (defHeaders.length === 0) defHeaders = ["tripId", "id", "timestamp"];
    }
    sheet.getRange(1, 1, 1, defHeaders.length).setValues([defHeaders]);
    return defHeaders;
  }
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
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
  if (!lock.tryLock(15000)) {
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
