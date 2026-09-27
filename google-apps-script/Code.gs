/**
 * ==========================================================================
 * Swiss Family Odyssey 2027 / Travel Manager App
 * Google Apps Script (GAS) API Proxy (高容錯強健版 v2)
 * ==========================================================================
 * 特性：
 * 1. 自動防搶寫併發鎖 (LockService)
 * 2. 分頁不存在時自動建立，欄位不存在時自動建立標題列
 * 3. UPDATE 操作支援 Upsert (找不到 ID 或分頁為空時自動新增，絕不報「分頁無資料」)
 * 4. 同時相容 key-value 結構 (如 TripConfig) 與 id 實體結構 (如 Expenses, Checklist)
 */

// 自訂密鑰 (必須與前端一致)
var SCRIPT_SECRET = "SWISS_ODYSSEY_2027_SECRET";

// 各分頁標準預設標題列 (若分頁全新自動寫入)
var DEFAULT_HEADERS = {
  TripConfig: ["key", "value", "updatedAt"],
  Expenses: ["id", "timestamp", "dayNumber", "category", "amount", "currency", "note", "paidBy"],
  Checklist: ["id", "category", "categoryLabel", "item", "checked", "priority", "assignedTo", "altitudeRange"],
  Bookmarks: ["id", "locationId", "locationName", "notes", "timestamp"],
  Accommodations: ["id", "baseId", "baseNameZh", "hotelName", "roomType", "checkInDate", "checkOutDate", "nights", "bookingPlatform", "confirmationCode", "totalPrice", "currency", "paymentStatus", "paymentStatusLabel", "address", "checkInTimeNotice", "keyPickupNotice", "garbageRulesNotice", "kitchenRulesNotice", "notes"],
  Transports: ["id", "category", "categoryLabel", "title", "routeFrom", "routeTo", "departureTime", "operatorNumber", "bookingReference", "seatsInfo", "ticketType", "platformNotice", "luggageNotice", "boardingNotice", "notes"]
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
      if (defHeaders.length === 0) defHeaders = ["id", "timestamp"];
    }
    sheet.getRange(1, 1, 1, defHeaders.length).setValues([defHeaders]);
    return defHeaders;
  }
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

/**
 * HTTP GET：讀取試算表資料
 */
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetParam = e && e.parameter ? e.parameter.sheet : null;

    if (sheetParam) {
      var ws = ss.getSheetByName(sheetParam);
      if (!ws) {
        return jsonResponse({ success: true, data: [] });
      }
      return jsonResponse({ success: true, data: sheetToObjects(ws) });
    }

    // 一次拉取全部分頁
    var result = {};
    var sheets = ss.getSheets();
    for (var i = 0; i < sheets.length; i++) {
      var s = sheets[i];
      result[s.getName()] = sheetToObjects(s);
    }

    return jsonResponse({ success: true, data: result });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() }, 500);
  }
}

/**
 * HTTP POST：寫入 / 更新 / 刪除試算表資料
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

    // 檢查密鑰 (若有傳送 secret 則檢查)
    if (payload.secret && payload.secret !== SCRIPT_SECRET) {
      return jsonResponse({ success: false, error: "密鑰驗證失敗 (Unauthorized)" }, 401);
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = payload.sheet || "General";
    var sheet = getOrCreateSheet(ss, sheetName);
    var action = payload.action;

    // 1. 新增 (APPEND)
    if (action === "APPEND") {
      var rowObj = payload.row || {};
      var headers = ensureHeaders(sheet, sheetName, rowObj);
      
      if (!rowObj.id && !rowObj.key) rowObj.id = Utilities.getUuid();
      if (!rowObj.timestamp) rowObj.timestamp = new Date().toISOString();

      var newRow = headers.map(function (h) {
        return rowObj[h] !== undefined ? rowObj[h] : "";
      });

      sheet.appendRow(newRow);
      return jsonResponse({ success: true, action: "APPEND", id: rowObj.id || rowObj.key, row: rowObj });
    }

    // 2. 更新或自動新增 (UPDATE / UPSERT) —— 徹底解決「分頁無資料」
    if (action === "UPDATE") {
      var targetId = payload.id !== undefined ? payload.id : payload.key;
      var updates = payload.updates || {};
      updates.updatedAt = new Date().toISOString();

      var headersList = ensureHeaders(sheet, sheetName, updates);
      
      // 比對欄位名稱：支援 id 或 key
      var idColIdx = headersList.indexOf("id");
      if (idColIdx === -1) {
        idColIdx = headersList.indexOf("key");
      }
      if (idColIdx === -1) {
        // 若完全無 id 或 key 欄位，自動將其當作首欄加入
        headersList.unshift("id");
        sheet.getRange(1, 1, 1, headersList.length).setValues([headersList]);
        idColIdx = 0;
      }

      var lastRow = sheet.getLastRow();
      var foundRowIndex = -1;

      if (lastRow >= 2) {
        var dataValues = sheet.getRange(2, idColIdx + 1, lastRow - 1, 1).getValues();
        for (var r = 0; r < dataValues.length; r++) {
          if (String(dataValues[r][0]) === String(targetId)) {
            foundRowIndex = r + 2; // 1-indexed, 跳過首行標題
            break;
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

      // B. 若找不到該 ID 或分頁剛建立為空：自動執行 UPSERT 新增為新列！
      var upsertRow = headersList.map(function (colName) {
        if (colName === "id" || colName === "key") {
          return targetId;
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
