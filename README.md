# 🇨🇭 Swiss Family Odyssey 2027 | 旅遊規劃與多代家庭慢遊 App

> 專為 16 天瑞士阿爾卑斯三代同堂家庭旅行 (7 位成員：2 長輩、2 成人、3 兒童) 設計的高互動性響應式 (RWD) 旅遊規劃 Web 應用程式。支援 **GitHub Pages 免費靜態託管** 並以 **Google 試算表 (Google Sheets)** 作為無伺服器即時雲端資料庫。

- 🌐 **線上部署展示網址**：[https://hippoking1.github.io/Travel_Manager_App/](https://hippoking1.github.io/Travel_Manager_App/)
- 📱 **多裝置支援**：手機端 (底部拇指快速導覽 / 抽屜式更多選單 / 觸控優化 / iOS Safe Area)、平板端 (彈性格線)、桌機端 (大螢幕雙欄地圖 / 看板時間軸 / A4 列印 PDF 匯出)。
- 🔄 **雲端與離線雙向同步**：無網路時由 LocalStorage 離線快取與佇列紀錄，連線時透過 Google Apps Script 零秒同步。

---

## ✨ 核心功能模組

### 1. 互動式日程看板與時間軸 (Itinerary Planner & Timeline)
- **看板 (Board) / 時間軸 (Timeline) 雙視圖切換**：自由切換橫向天數看板或單日詳細時間軸。
- **全寬清爽佈局**：待排景點池獨立至專屬頁面，大幅擴增每日行程閱讀與拖拉排程視野。
- **Persona 成員角色標籤過濾**：
  - 🧓 **長輩友善**：平緩健走、直達電梯與無障礙全景纜車
  - 🧒 **兒童亮點**：旱地卡丁車、萊湖水上漂浮木筏、冰川宮殿雪圈
  - 🛒 **超市/購物**：Coop/Migros 自煮省錢採買、德國 dm 藥妝大掃貨
  - 🚂 **景觀交通**：冰河列車路線、黃金列車全景車廂、世界最陡 110% 纜車
- **智慧排程輔助**：相鄰時段衝突自動警示、一鍵「自動排時程」依照活動時間自動順序化。

### 2. 景點與景點池管理中心 (Attractions & Backlog Hub) ⭐ *New*
- **雙分頁切換**：像「住宿與交通」一樣集中管理「行程景點」與「待排景點池 (Backlog)」。
- **行程天數篩選**：快速切換檢視全部天數或指定 Day 1 ~ Day N 之活動景點。
- **地理地圖次標籤多重篩選**：
  - 支援同時複選 **高山名峰 (peak)**、**歷史文化 (culture)**、**超市購物 (shopping)**、**親子風景 (attraction)** 進行聯集篩選，並即時顯示分類點位統計數量。
- **Google Maps 導航整合**：每個景點卡片一鍵開啟 Google 地圖精確導航，亦可一鍵跳轉至內建「地理地圖」聚焦圖釘。
- **靈感池快速調配**：景點池卡片支援一鍵指定排入 Day X，或將日程卡片隨時移入景點池暫存。

### 3. 活動景點編輯與精準定位 (Activity Editor) ⭐ *New*
- **Google Maps URL 智慧解析**：支援在新增/編輯活動時填入 Google Maps 連結，系統自動解析 `!3d{lat}!4d{lng}` data 參數、`destination=` 與 `@lat,lng` 座標，確保地圖 100% 精確定位與導航。
- **景觀交通次標籤**：在「景觀交通」主標籤下提供高山名峰、歷史文化、超市購物、親子風景次標籤，讓地理地圖點位分類完全準確，避免誤判為單純交通站點。

### 4. 互動式地理探索地圖 (Interactive Geographic Map View)
- 採用 **Leaflet / React-Leaflet**，免 API Key 自由切換「標準地圖」、「地形等高線」與「衛星影像」三大圖磚圖層。
- 標記全行程真實住宿基地、景點群、高山觀景台與超市站點。
- 支援「路線天數軌跡 (Polyline)」與「分類圖釘 (Category Pins)」，點擊跳出彈窗卡片並提供外部 WebCam 與 Google 地圖導航。

### 5. 住宿與車票須知管理 (Bookings & Transports Hub)
- **住宿預訂管理**：記錄各大飯店、公寓門鎖密碼盒 (Keybox)、垃圾專用袋分類與廚房復原須知。
- **交通車票管理**：匯整跨國航班、全景景觀列車劃位 (Seats)、登車月台與大件行李放置規定。

### 6. 智能 Swiss Travel Pass (STP) & 預算記帳中心
- **預載官方票價省錢規則**：
  - 4 位成人 15-Day STP；3 位兒童持有 Swiss Family Card 全程免票。
  - Stoos 與 Rigi Kulm 100% 全額免費覆蓋；Pilatus, First, Gornergrat, Glacier Paradise 享 50% 折扣。
  - 自動累計全家 7 人省下的交通費用看板。
- **德國邊境 19% 跨境退稅估算**：於 Jestetten dm / ALDI 購物滿 €50 自動試算退稅金。
- **多幣別即時記帳器**：支援 CHF、EUR、TWD 幣別切換與匯率自訂，背景自動雙向同步至 Google Sheets 的 `Expenses` 工作表。

### 7. 高海拔與天氣安全中心 (High-Altitude & Safety)
- 6 大名峰即時 WebCam 傳送門 (冰川天堂 3,883m、Gornergrat 3,089m、First 2,168m、Pilatus 2,132m 等)。
- 洋蔥式 (Onion-style) 穿搭全海拔指南 (0m - 3,883m) 與 UV 8+ 防雪盲警訊。
- 家庭行李備品清單打勾，支援多人雲端即時同步。

### 8. 策馬特馬特洪金頂日出特輯 (Matterhorn Guide)
- 晨曦金頂日出 (Golden Sunrise) 時間推估 (約 05:30 AM)。
- 陽台縮時攝影與手機曝光鎖定三步驟 SOP。
- 利菲爾湖 (Riffelsee) 倒影拍攝最佳無風時機與拍照機位圖鑑。

### 9. 旅行彈性設定 (Settings)
- 支援多旅程管理與切換，自由新增或重設示範行程。
- 彈性旅行出發日期選擇器 (可隨時調整首日，所有 16 天自動計算；亦可清空轉為相對天數展示)。
- Google Apps Script Web App URL 綁定與測試連線。

---

## 🛠️ 技術堆疊

- **核心框架**：React 18 + Vite 6 + TypeScript 5
- **樣式與圖示**：Tailwind CSS 4 + Lucide React
- **拖拉互動**：@dnd-kit (core / sortable / utilities)
- **地圖系統**：Leaflet 1.9 + React-Leaflet 4
- **狀態管理與持久化**：Zustand 5 (支援 LocalStorage 離線快取)
- **資料庫與後端**：Google Sheets (試算表) + Google Apps Script (REST API Proxy)
- **自動化 CI/CD**：GitHub Actions 自動構建與部署至 GitHub Pages

---

## 🚀 本地開發與啟動

```bash
# 1. 複製專案庫
git clone https://github.com/hippoking1/Travel_Manager_App.git
cd Travel_Manager_App

# 2. 安裝依賴套件
npm install

# 3. 啟動本地開發伺服器
npm run dev

# 4. 執行型別檢查與測試
npm run typecheck
npm run test

# 5. 建置生產環境版本 (測試 GitHub Pages bundle)
npm run build
```

---

## 📊 Google Sheets 資料庫設定指南

請參閱專案目錄下的 [`google-apps-script/SETUP.md`](./google-apps-script/SETUP.md) 獲取完整 6 大工作表欄位結構與 Apps Script 一鍵部署說明。
