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
  | 'car';

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

export interface ChecklistItem {
  id: string;
  category: 'clothing' | 'documents' | 'medicine' | 'electronics' | 'kids' | 'seniors';
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
