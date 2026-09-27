# 🚀 Google Sheets 試算表資料庫與 Apps Script 設定教學

本應用程式採用 **「無伺服器架構」**：前端 SPA 託管於 GitHub Pages，後端直接利用 **Google 試算表 (Google Sheets)** 搭配 **Google Apps Script (GAS)** 作為免費、免維護、支援多人同時編輯的即時雲端資料庫。

---

## 步驟一：建立 Google 試算表 (Google Sheets)

1. 開啟 [Google 試算表 (Google Sheets)](https://sheets.new) 建立一份新的試算表。
2. 將試算表命名為：`Swiss_Odyssey_Travel_DB`（或自訂）。
3. 依序新增以下 **6 個工作表分頁 (Tabs)**，並在各分頁的 **第 1 列 (Row 1)** 填入精確的欄位名稱：

### 1. 分頁名稱：`TripConfig`
用於儲存旅行的全域配置（例如旅行出發日期、幣別匯率）：
| key | value |
| :--- | :--- |
| tripName | 瑞士阿爾卑斯家庭壯遊 2027 |
| startDate | 2027-06-15 |
| totalDays | 16 |
| primaryCurrency | CHF |
| CHF_TWD | 36.5 |
| EUR_TWD | 34.2 |
| EUR_CHF | 0.94 |

### 2. 分頁名稱：`Expenses`
用於多人即時記帳：
| id | timestamp | dayNumber | category | amount | currency | note | paidBy |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| *(留空)* | *(留空)* | *(留空)* | *(留空)* | *(留空)* | *(留空)* | *(留空)* | *(留空)* |

### 3. 分頁名稱：`Checklist`
用於行前準備、洋蔥式穿搭與行李清單打勾：
| id | category | item | checked | assignedTo | priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| *(留空)* | *(留空)* | *(留空)* | *(留空)* | *(留空)* | *(留空)* |

### 4. 分頁名稱：`Bookmarks`
用於家庭成員標記與收藏的最愛景點：
| id | locationId | locationName | notes | timestamp |
| :--- | :--- | :--- | :--- | :--- |
| *(留空)* | *(留空)* | *(留空)* | *(留空)* | *(留空)* |

### 5. 分頁名稱：`Itinerary` (選填)
若日後想完全透過 Google Sheets 修改行程，可參照此欄位：
| day | base | title | subtitle | morning | afternoon | evening | food | tags | notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |

### 6. 分頁名稱：`Locations` (選填)
地圖圖釘經緯度與資訊：
| id | name | nameZh | lat | lng | category | description | dayNumbers | altitude | stpCoverage | webcamUrl |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |

---

## 步驟二：部屬 Google Apps Script (GAS)

1. 在該試算表中，點擊上方工具列的 **「擴充功能 (Extensions)」** ➔ **「Apps Script」**。
2. 刪除編輯器中預設的代碼，將專案中的 `google-apps-script/Code.gs` 完整內容貼上。
3. 檢查或自訂頂部的密鑰：
   ```javascript
   var SCRIPT_SECRET = "SWISS_ODYSSEY_2027_SECRET";
   ```
4. 點擊右上角藍色按鈕 **「部署 (Deploy)」** ➔ **「新增部署 (New deployment)」**。
5. 點擊左側齒輪 ⚙️ 圖示，選擇 **「網頁應用程式 (Web app)」**。
6. 設定欄位（**關鍵步驟！**）：
   - **說明 (Description)**：`Travel Manager API v1`
   - **執行身分 (Execute as)**：選擇 **「我 (Me - 你的 Gmail 帳號)」**
   - **誰可以存取 (Who has access)**：選擇 **「所有人 (Anyone)」** *(包含未登入使用者，這樣任何家庭成員開網頁就能記帳，免登入 Google)*
7. 點擊 **「部署 (Deploy)」**，初次部署時 Google 會跳出「授予權限」視窗：
   - 點擊「審查權限 (Review Permissions)」➔ 選擇你的 Google 帳戶。
   - 若跳出「Google 尚未驗證此應用程式」，點擊左下角「進階 (Advanced)」➔ 點擊「前往... (不安全)」。
   - 點擊「允許 (Allow)」。
8. 複製最後產生的 **網頁應用程式網址 (Web App URL)**，格式如：
   `https://script.google.com/macros/s/AKfycbx.../exec`

---

## 步驟三：配置前端環境變數

在本地開發或 GitHub 部署時：
1. 本地建立 `.env.local` 檔案（或直接在設定頁面輸入）：
   ```env
   VITE_GAS_URL=https://script.google.com/macros/s/你的ID/exec
   VITE_FAMILY_SECRET=SWISS_ODYSSEY_2027_SECRET
   ```
2. 當網頁連上 GAS 時，右上方連線指示燈會顯示綠色 🟢「雲端同步中」，所有修改（記帳、清單、日期）都會即時雙向同步！
