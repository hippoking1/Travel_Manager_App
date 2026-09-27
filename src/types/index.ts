// ============================================================
// 旅遊規劃 App (Travel Manager App) — TypeScript 全域型別定義
// ============================================================

/** 旅行全域配置 (彈性支援任何旅行) */
export interface TripConfig {
  tripName: string;            // 旅行名稱 (e.g. "Swiss Family Odyssey 2027")
  subtitle: string;            // 副標題 (e.g. "瑞士 16 天阿爾卑斯三代同堂慢遊")
  startDate: string | null;    // 起始日期 (ISO 'YYYY-MM-DD'，null 表示相對 Day 1)
  totalDays: number;           // 總天數 (預設 16)
  travelers: TravelerProfile[];
  bases: BaseInfo[];           // 住宿基地清單 (動態支援任何國家/城市)
  currencies: CurrencyConfig;
}

/** 旅客成員檔案 (支援多代長者與幼童設計) */
export interface TravelerProfile {
  id: string;
  name: string;
  role: 'senior' | 'adult' | 'kid';
  roleLabel: string;           // "長輩", "成人", "兒童"
  age: number;
  tags: PersonaTag[];
  notes?: string;
}

/** 基地住宿設定 */
export interface BaseInfo {
  id: string;
  name: string;                // e.g. "Luzern"
  nameZh: string;              // e.g. "盧塞恩 / 琉森"
  days: number[];              // e.g. [1, 2, 3, 4]
  color: string;               // 基地色彩識別 (Hex)
  hotelName: string;           // 住宿飯店/公寓名稱
  hotelAddress?: string;
  checkIn?: string;
  checkOut?: string;
  notes?: string;
}

/** 幣別與匯率設定 */
export interface CurrencyConfig {
  primary: 'CHF' | 'EUR' | 'TWD' | string;
  rates: {
    CHF_TWD: number;           // e.g. 36.5
    EUR_TWD: number;           // e.g. 34.2
    EUR_CHF: number;           // e.g. 0.94
    [key: string]: number;
  };
  lastUpdated?: string;
}

// ============================================================
// 行程資料 (Itinerary)
// ============================================================

export type PersonaTag = 
  | 'senior-friendly'   // 🧓 長輩友善 (平坦健行、無障礙纜車、適度休息)
  | 'kids-highlight'    // 🧒 兒童亮點 (高山卡丁車、飛天椅、滑草、湖畔玩水)
  | 'budget-shopping'   // 🛒 購物省錢 (Coop/Migros 自煮、dm、退稅)
  | 'scenic-train';     // 🚂 景觀列車 (冰河列車、黃金列車、全景車廂)

export interface PersonaMeta {
  emoji: string;
  label: string;
  color: string;
  bgLight: string;
}

export const PERSONA_CONFIG: Record<PersonaTag, PersonaMeta> = {
  'senior-friendly': {
    emoji: '🧓',
    label: '長輩友善',
    color: '#10B981',
    bgLight: 'rgba(16, 185, 129, 0.12)',
  },
  'kids-highlight': {
    emoji: '🧒',
    label: '兒童亮點',
    color: '#F59E0B',
    bgLight: 'rgba(245, 158, 11, 0.12)',
  },
  'budget-shopping': {
    emoji: '🛒',
    label: '超市/購物',
    color: '#8B5CF6',
    bgLight: 'rgba(139, 92, 246, 0.12)',
  },
  'scenic-train': {
    emoji: '🚂',
    label: '景觀交通',
    color: '#EF4444',
    bgLight: 'rgba(239, 68, 68, 0.12)',
  },
};

export type TransportType = 
  | 'train' 
  | 'cogwheel' 
  | 'cable-car' 
  | 'funicular' 
  | 'boat' 
  | 'bus' 
  | 'walk' 
  | 'car'
  | 'flight';

export type STPCoverage = 'free' | 'half-price' | 'not-covered';

export interface TransportDetail {
  type: TransportType;
  from: string;
  to: string;
  duration?: string;
  stpCoverage: STPCoverage;
  discountNote?: string;       // e.g. "STP 免費", "STP 50% 折扣"
  lineInfo?: string;           // e.g. "IR 75 / 月台 4"
  notes?: string;
}

export interface TimeBlock {
  id?: string;
  period: 'morning' | 'afternoon' | 'evening';
  periodLabel: string;         // "上午 08:30 - 12:00"
  title: string;
  description: string;
  locationName?: string;
  coordinates?: [number, number]; // [lat, lng]
  altitude?: number;           // 海拔公尺
  transport?: TransportDetail;
  tags: PersonaTag[];
  tips?: string[];
}

export interface FoodNote {
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  mealLabel: string;           // "午餐"
  suggestion: string;
  type: 'self-cook' | 'restaurant' | 'supermarket' | 'takeaway';
  costEstimate?: string;       // e.g. "CHF 20-35 / 人"
  location?: string;
  highlight?: boolean;
}

export interface DayItinerary {
  day: number;                 // 1-16
  baseId: string;              // 對應 BaseInfo.id
  title: string;
  subtitle: string;
  highlights: string[];
  timeBlocks: TimeBlock[];
  foodNotes: FoodNote[];
  supermarketTips?: string[];
  weatherAlert?: string;
  packingReminders?: string[];
  customNotes?: string;        // 自由備註筆記
}

// ============================================================
// 住宿預訂與須知管理 (Accommodation Bookings)
// ============================================================

export interface AccommodationBooking {
  id: string;
  baseId: string;              // 所屬基地 (luzern, grindelwald, zermatt, zurich)
  baseNameZh: string;
  hotelName: string;
  roomType: string;            // 房型 (e.g. "景觀家庭雙臥室公寓 (7人入住)")
  checkInDate: string;         // "2027-06-15"
  checkOutDate: string;        // "2027-06-19"
  nights: number;              // 入住晚數
  bookingPlatform: string;     // Booking.com, Airbnb, 官網
  confirmationCode: string;    // 訂單編號 / 預約確認號
  totalPrice: number;
  currency: string;            // CHF, EUR, TWD
  paymentStatus: 'paid' | 'pay_at_property' | 'deposit_paid'; // 付款狀態
  paymentStatusLabel: string;
  address: string;
  googleMapsUrl?: string;
  contactPhone?: string;
  contactEmail?: string;
  // 重要入住與須知細節
  checkInTimeNotice: string;   // e.g. "入住 15:00-20:00 / 退房 10:00 前"
  keyPickupNotice: string;     // e.g. "門口 Keybox 密碼鎖，密碼 4821#"
  garbageRulesNotice: string;  // e.g. "需使用蘇黎世/瓦萊州專用收費垃圾袋，生鮮垃圾需分開"
  kitchenRulesNotice: string;  // e.g. "自煮完畢需開啟洗碗機，退房需清空冰箱"
  notes?: string;              // 其他備忘
}

// ============================================================
// 交通安排與訂票乘車須知 (Transport Bookings)
// ============================================================

export interface TransportBooking {
  id: string;
  category: 'flight' | 'scenic_train' | 'mountain_rail' | 'cable_car' | 'ferry' | 'car_rental';
  categoryLabel: string;
  title: string;               // e.g. "台北 ➔ 蘇黎世 國際長途直飛航班"
  routeFrom: string;
  routeTo: string;
  departureTime: string;       // e.g. "2027-06-15 08:30"
  arrivalTime?: string;
  operatorNumber: string;      // 班次/車次號 (e.g. "BR087", "Glacier Express 902")
  bookingReference: string;    // 訂位代碼 / PNR / 電子車票號
  seatsInfo?: string;          // e.g. "車廂 4 / 座位 11, 12, 13, 14, 15, 16, 17"
  ticketType: string;          // e.g. "STP 免費涵蓋 + 景觀席強制劃位", "個人電子機票"
  totalPrice?: number;
  currency?: string;
  // 重要乘車與搭乘須知
  platformNotice?: string;     // e.g. "蘇黎世火車站月台 4，提前 15 分鐘候車"
  luggageNotice?: string;      // e.g. "大件行李置於車廂玄關專屬大行李架，貴重物品隨身"
  boardingNotice?: string;     // e.g. "需出示護照正本 + STP QR Code + 訂位憑證電子檔"
  notes?: string;
}

// ============================================================
// 地圖點位 (Locations)
// ============================================================

export type LocationCategory = 
  | 'base'           // 住宿基地
  | 'peak'           // 高山群峰 / 觀景台
  | 'culture'        // 歷史人文 / 城堡老城
  | 'shopping'       // 跨境購物 / 大型超市
  | 'attraction'     // 親子景點 / 湖泊風景
  | 'station';       // 重要轉乘大站

export interface MapLocation {
  id: string;
  name: string;
  nameZh: string;
  coordinates: [number, number]; // [lat, lng]
  category: LocationCategory;
  altitude?: number;           // 海拔 (m)
  description: string;
  dayNumbers: number[];        // 出現在第幾天的行程中
  stpNote?: string;            // 瑞士通票優惠備註
  webcamUrl?: string;          // 即時影像連結
  meteoUrl?: string;           // 氣象連結
  tags?: string[];
}

// ============================================================
// 預算與記帳 (Budget & Expenses)
// ============================================================

export type ExpenseCategory = 
  | 'transport' 
  | 'food' 
  | 'activity' 
  | 'shopping' 
  | 'accommodation' 
  | 'other';

export interface ExpenseRecord {
  id: string;
  timestamp: string;
  dayNumber?: number;
  category: ExpenseCategory;
  amount: number;
  currency: 'CHF' | 'EUR' | 'TWD' | string;
  note: string;
  paidBy?: string;
}

export interface STPRuleItem {
  id: string;
  name: string;
  route: string;
  originalPriceCHF: number;
  stpPriceCHF: number;
  discountPercentage: number;  // 100 = 完全免費, 50 = 半價
  familyCardRule: string;      // 兒童免票規則
  notes: string;
}

// ============================================================
// 行李與洋蔥式穿搭清單 (Checklist)
// ============================================================

export type ChecklistCategory = 
  | 'clothing'     // 洋蔥式穿搭
  | 'seniors'      // 長輩專屬
  | 'kids'         // 幼童專屬
  | 'documents'    // 證件檔案
  | 'electronics'  // 電子電器
  | 'medicine'     // 醫藥保健
  | 'other';       // 其他備忘

export interface ChecklistItem {
  id: string;
  category: ChecklistCategory;
  categoryLabel: string;
  item: string;
  checked: boolean;
  priority: 'high' | 'medium' | 'low';
  assignedTo?: string;
  altitudeRange?: string;      // e.g. "0m - 3,883m"
}

// ============================================================
// 雲端同步與系統狀態 (Sync & System)
// ============================================================

export interface SyncStatusState {
  isConfigured: boolean;       // 是否有設定 GAS URL
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  pendingQueueCount: number;
  lastError: string | null;
}

// ============================================================
// 多場旅遊計畫管理 (Multi-Trip Management)
// ============================================================

export interface TripPlan {
  id: string;                    // 旅程唯一 ID
  name: string;                  // 旅程名稱 (e.g. "Swiss Family Odyssey 2027", "日本關西賞櫻慢遊")
  destination: string;           // 目的地國家/地區 (e.g. "瑞士 (Switzerland)", "日本 京都 / 大阪")
  coverEmoji?: string;           // 代表圖標 (e.g. "🇨🇭", "🇯🇵", "✈️")
  createdAt: string;
  updatedAt: string;
  config: TripConfig;
  itinerary: DayItinerary[];
  locations: MapLocation[];
  expenses: ExpenseRecord[];
  checklist: ChecklistItem[];
  accommodations: AccommodationBooking[];
  transports: TransportBooking[];
  bookmarks: string[];
}

export interface CreateTripParams {
  name: string;
  destination?: string;
  coverEmoji?: string;
  startDate?: string | null;
  totalDays?: number;
  template: 'blank' | 'swiss-demo';
}
