/**
 * ==========================================================================
 * Swiss Family Odyssey 2027 / Travel Manager App
 * Google Apps Script (GAS) API Proxy
 * ==========================================================================
 * 說明：
 * 本腳本掛載在 Google Sheets (試算表) 的擴充功能 Apps Script 中，
 * 部署為「網頁應用程式 (Web App)」，為 React 前端提供零伺服器、全免登入的讀寫 REST API。
 */

// 自訂密鑰 (必須與前端 .env 的 VITE_FAMILY_SECRET 一致，防範外部惡意亂寫)
var SCRIPT_SECRET = "SWISS_ODYSSEY_2027_SECRET";

/**
 * HTTP GET：讀取試算表資料
 * - 支援 ?sheet=Expenses 撈取單一分頁
 * - 若無參數，則批次一次回傳全部分頁 (減少前端 Round-trip 與冷啟動延遲)
 */
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetParam = e && e.parameter ? e.parameter.sheet : null;

    if (sheetParam) {
      var ws = ss.getSheetByName(sheetParam);
      if (!ws) {
        return jsonResponse({ success: false, error: "分頁不存在: " + sheetParam }, 404);
      }
      return jsonResponse({ success: true, data: sheetToObjects(ws) });
    }

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
 * 前端使用 Content-Type: text/plain;charset=utf-8 繞過瀏覽器 OPTIONS preflight CORS 限制
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  // 等待最多 15 秒以防多人搶寫衝突 (Concurrency Lock)
  if (!lock.tryLock(15000)) {
    return jsonResponse({ success: false, error: "系統忙碌中，請稍候重試" }, 503);
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, error: "缺少請求酬載 (Payload)" }, 400);
    }

    var payload = JSON.parse(e.postData.contents);

    // 檢查密鑰
    if (payload.secret !== SCRIPT_SECRET) {
      return jsonResponse({ success: false, error: "密鑰驗證失敗 (Unauthorized)" }, 401);
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = payload.action;

    // 1. 新增一筆紀錄 (APPEND)
    if (action === "APPEND") {
      var sheet = ss.getSheetByName(payload.sheet);
      if (!sheet) return jsonResponse({ success: false, error: "分頁不存在: " + payload.sheet }, 404);

      var headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
      var rowObj = payload.row || {};
      
      // 自動填寫 id 與 timestamp 若無提供
      if (!rowObj.id) rowObj.id = Utilities.getUuid();
      if (!rowObj.timestamp) rowObj.timestamp = new Date().toISOString();

      var newRow = headers.map(function (h) {
        return rowObj[h] !== undefined ? rowObj[h] : "";
      });

      sheet.appendRow(newRow);
      return jsonResponse({ success: true, action: "APPEND", id: rowObj.id, row: rowObj });
    }

    // 2. 根據 ID 更新欄位 (UPDATE)
    if (action === "UPDATE") {
      var targetSheet = ss.getSheetByName(payload.sheet);
      if (!targetSheet) return jsonResponse({ success: false, error: "分頁不存在: " + payload.sheet }, 404);

      var data = targetSheet.getDataRange().getValues();
      if (data.length < 2) return jsonResponse({ success: false, error: "分頁無資料" }, 404);

      var headersList = data[0];
      var idIndex = headersList.indexOf("id");
      if (idIndex === -1) return jsonResponse({ success: false, error: "資料表無 id 欄位" }, 400);

      var updates = payload.updates || {};
      updates.updatedAt = new Date().toISOString();

      for (var r = 1; r < data.length; r++) {
        if (String(data[r][idIndex]) === String(payload.id)) {
          var rowIndex = r + 1; // 1-indexed
          for (var c = 0; c < headersList.length; c++) {
            var colName = headersList[c];
            if (updates[colName] !== undefined) {
              targetSheet.getRange(rowIndex, c + 1).setValue(updates[colName]);
            }
          }
          return jsonResponse({ success: true, action: "UPDATE", id: payload.id });
        }
      }
      return jsonResponse({ success: false, error: "找不到指定 ID 的資料: " + payload.id }, 404);
    }

    // 3. 根據 ID 刪除一列 (DELETE)
    if (action === "DELETE") {
      var delSheet = ss.getSheetByName(payload.sheet);
      if (!delSheet) return jsonResponse({ success: false, error: "分頁不存在: " + payload.sheet }, 404);

      var allData = delSheet.getDataRange().getValues();
      var idCol = allData[0].indexOf("id");
      if (idCol === -1) return jsonResponse({ success: false, error: "資料表無 id 欄位" }, 400);

      for (var rowNum = 1; rowNum < allData.length; rowNum++) {
        if (String(allData[rowNum][idCol]) === String(payload.id)) {
          delSheet.deleteRow(rowNum + 1);
          return jsonResponse({ success: true, action: "DELETE", id: payload.id });
        }
      }
      return jsonResponse({ success: false, error: "找不到欲刪除的 ID: " + payload.id }, 404);
    }

    // 4. 批次執行多個操作 (BATCH)
    if (action === "BATCH") {
      var operations = payload.operations || [];
      var results = [];
      for (var opIndex = 0; opIndex < operations.length; opIndex++) {
        var op = operations[opIndex];
        try {
          var opSheet = ss.getSheetByName(op.sheet);
          if (!opSheet) throw new Error("分頁不存在: " + op.sheet);

          if (op.action === "APPEND") {
            var opHeaders = opSheet.getRange(1, 1, 1, opSheet.getLastColumn()).getValues()[0];
            var opRowObj = op.row || {};
            if (!opRowObj.id) opRowObj.id = Utilities.getUuid();
            var opRow = opHeaders.map(function (col) {
              return opRowObj[col] !== undefined ? opRowObj[col] : "";
            });
            opSheet.appendRow(opRow);
            results.push({ success: true, id: opRowObj.id });
          } else {
            results.push({ success: false, error: "BATCH 目前支援 APPEND" });
          }
        } catch (opErr) {
          results.push({ success: false, error: opErr.toString() });
        }
      }
      return jsonResponse({ success: true, action: "BATCH", results: results });
    }

    return jsonResponse({ success: false, error: "未知的 action: " + action }, 400);
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() }, 500);
  } finally {
    lock.releaseLock();
  }
}

/**
 * 將指定試算表轉換為 JavaScript 物件陣列 (首列為 Key)
 */
function sheetToObjects(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
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

/**
 * 格式化 JSON 回應
 */
function jsonResponse(data, statusCode) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
