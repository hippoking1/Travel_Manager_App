# 🇨🇭 Swiss Family Odyssey 2027 | 旅遊規劃與多代家庭慢遊 App

> 專為 16 天瑞士阿爾卑斯三代同堂家庭旅行 (7 位成員：2 長輩、2 成人、3 兒童) 設計的高互動性響應式 (RWD) 旅遊規劃 Web 應用程式。支援 **GitHub Pages 免費靜態託管** 並以 **Google 試算表 (Google Sheets)** 作為無伺服器即時雲端資料庫。

- 🌐 **線上部署展示網址**：[https://hippoking1.github.io/Travel_Manager_App/](https://hippoking1.github.io/Travel_Manager_App/)
- 📱 **多裝置支援**：手機端 (底部拇指快速導覽 / 觸控優化 / iOS Safe Area)、平板端 (彈性格線)、桌機端 (大螢幕雙欄地圖 / A4 列印 PDF 匯出)。
- 🔄 **雲端與離線雙向同步**：無網路時由 LocalStorage 離線快取與佇列紀錄，連線時透過 Google Apps Script 零秒同步。

---

## ✨ 核心功能模組

### 1. 互動式行程儀表板 (Interactive Itinerary Dashboard, Day 1 - 16)
- **基地快速篩選**：全部天數 | 盧塞恩 (Days 1-4) | 格林德瓦 (Days 5-7) | 策馬特 (Days 8-11) | 蘇黎世/溫特圖爾 (Days 12-16)
- **四大人格化標籤快速過濾**：
  - 🧓 **長輩友善**：平緩健走、直達電梯與無障礙全景纜車
  - 🧒 **兒童亮點**：旱地卡丁車、萊湖水上漂浮木筏、冰川宮殿雪圈
  - 🛒 **超市/購物**：Coop/Migros 自煮省錢採買、德國 dm 藥妝大掃貨
  - 🚂 **景觀交通**：冰河列車路線、黃金列車全景車廂、世界最陡 110% 纜車
- **折疊式手風琴卡片**：展開可檢視上午/下午/晚上活動、交通換乘月台與 STP 優惠、餐飲自煮推薦、超市小撇步與出門必帶裝備提醒。

### 2. 互動式地理地圖 (Interactive Geographic Map View)
- 採用 **Leaflet / React-Leaflet**，標記 4 大基地木屋、Stoos最陡纜車、First懸崖、馬特洪冰川天堂 (3,883m)、Gornergrat、萊茵瀑布與德國邊境 Jestetten。
- 點擊圖釘跳出彈窗卡片，提供海拔高度、STP 票價備註、外部 WebCam 連結並可一鍵跳轉至對應天數日程。

### 3. 智能 Swiss Travel Pass (STP) & 預算記帳中心
- **預載官方票價省錢規則**：
  - 4 位成人 15-Day STP；3 位兒童持有 Swiss Family Card 全程免票。
  - Stoos 與 Rigi Kulm 100% 全額免費覆蓋。
  - Pilatus, First, Gornergrat, Glacier Paradise 享 50% 折扣。
  - 計算全家 7 人累計省下的交通費用。
- **德國邊境 19% 跨境退稅估算**：於 Jestetten dm / ALDI 購物滿 €50 自動試算退稅金。
- **即時記帳器**：支援 CHF、EUR、TWD 幣別切換與匯率自訂，背景自動同步至 Google Sheets 的 `Expenses` 工作表。

### 4. 高海拔與天氣安全中心 (High-Altitude & Safety)
- 6 大名峰即時 WebCam 傳送門 (冰川天堂 3,883m、Gornergrat 3,089m、First 2,168m、Pilatus 2,132m 等)。
- 洋蔥式 (Onion-style) 穿搭全海拔指南 (0m - 3,883m) 與 UV 8+ 防雪盲警訊。
- 家庭行李備品清單打勾，雲端多人即時同步。

### 5. 陽台馬特洪金頂日出倒數與攝影指南 (Matterhorn Guide)
- 策馬特基地 (Base 3) 專屬：
  - 晨曦金頂日出 (Golden Sunrise) 時間推估 (約 05:30 AM)。
  - 陽台縮時攝影與手機曝光鎖定三步驟 SOP。
  - 利菲爾湖 (Riffelsee) 倒影拍攝最佳無風時機與拍照機位圖鑑。

### 6. 旅行彈性設定 (Settings)
- 彈性旅行出發日期選擇器 (可隨時調整首日，所有 16 天自動計算；亦可清空轉為相對天數展示)。
- Google Apps Script Web App URL 綁定與測試連線。

---

## 🛠️ 技術堆疊

- **核心框架**：React 18 + Vite 6 + TypeScript
- **樣式與圖示**：Tailwind CSS 4 + Lucide React + Framer Motion (平滑折疊過場)
- **地圖系統**：Leaflet 1.9 + React-Leaflet 4
- **狀態管理與持久化**：Zustand 5 (含 persist middleware)
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

# 4. 建置生產環境版本 (測試 GitHub Pages bundle)
npm run build
```

---

## 📊 Google Sheets 資料庫設定指南

請參閱專案目錄下的 [`google-apps-script/SETUP.md`](./google-apps-script/SETUP.md) 獲取完整 6 大工作表欄位結構與 Apps Script 一鍵部署說明。
