import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  TripConfig, 
  DayItinerary, 
  MapLocation, 
  ExpenseRecord, 
  ChecklistItem,
  TimeBlock,
  AccommodationBooking,
  TransportBooking
} from '../types';
import { DEMO_ITINERARY } from '../data/demo-itinerary';
import { DEMO_LOCATIONS } from '../data/demo-locations';
import { DEFAULT_CHECKLIST } from '../data/clothing-checklist';
import { DEMO_ACCOMMODATIONS, DEMO_TRANSPORTS } from '../data/demo-bookings';
import { DEFAULT_CURRENCY_CONFIG } from '../utils/currency';
import { syncManager } from '../services/syncManager';
import { fetchFromSheet, isGasConfigured } from '../services/sheetApi';

export interface TripStoreState {
  config: TripConfig;
  itinerary: DayItinerary[];
  locations: MapLocation[];
  expenses: ExpenseRecord[];
  checklist: ChecklistItem[];
  accommodations: AccommodationBooking[];
  transports: TransportBooking[];
  bookmarks: string[]; // MapLocation.id 清單
  isFetchingRemote: boolean;

  // 基本設定 Actions
  updateConfig: (partial: Partial<TripConfig>) => void;
  setStartDate: (dateStr: string | null) => void;
  
  // 行程自由規劃 Actions (需求 2)
  addDay: (baseId?: string) => void;
  updateDay: (dayNumber: number, updates: Partial<DayItinerary>) => void;
  deleteDay: (dayNumber: number) => void;
  addTimeBlock: (dayNumber: number, block: TimeBlock) => void;
  updateTimeBlock: (dayNumber: number, blockIndex: number, updates: Partial<TimeBlock>) => void;
  deleteTimeBlock: (dayNumber: number, blockIndex: number) => void;
  resetItineraryToDemo: () => void;

  // 住宿訂單管理 Actions (需求 2)
  addAccommodation: (acc: Omit<AccommodationBooking, 'id'>) => void;
  updateAccommodation: (id: string, updates: Partial<AccommodationBooking>) => void;
  deleteAccommodation: (id: string) => void;

  // 交通訂單管理 Actions (需求 2)
  addTransport: (trans: Omit<TransportBooking, 'id'>) => void;
  updateTransport: (id: string, updates: Partial<TransportBooking>) => void;
  deleteTransport: (id: string) => void;

  // 記帳與清單 Actions
  addExpense: (expense: Omit<ExpenseRecord, 'id' | 'timestamp'>) => void;
  deleteExpense: (id: string) => void;
  toggleChecklistItem: (id: string) => void;
  addChecklistItem: (item: Omit<ChecklistItem, 'id'>) => void;
  deleteChecklistItem: (id: string) => void;
  toggleBookmark: (locationId: string) => void;
  fetchLatestFromSheets: () => Promise<boolean>;
}

const INITIAL_CONFIG: TripConfig = {
  tripName: 'Swiss Family Odyssey 2027',
  subtitle: '瑞士 16 天阿爾卑斯三代同堂慢遊 (7人三代同樂)',
  startDate: '2027-06-15',
  totalDays: 16,
  travelers: [
    { id: 't1', name: '爺爺', role: 'senior', roleLabel: '長輩 (70y)', age: 70, tags: ['senior-friendly'], notes: '膝蓋需避開長下坡' },
    { id: 't2', name: '奶奶', role: 'senior', roleLabel: '長輩 (67y)', age: 67, tags: ['senior-friendly'], notes: '喜愛花草湖泊、全景火車' },
    { id: 't3', name: '爸爸 (我)', role: 'adult', roleLabel: '成人 (42y)', age: 42, tags: ['scenic-train'], notes: '總規劃、攝影大師、自煮主廚' },
    { id: 't4', name: '媽媽', role: 'adult', roleLabel: '成人 (40y)', age: 40, tags: ['budget-shopping'], notes: '財務掌門人、藥妝採購總指揮' },
    { id: 't5', name: '哥哥', role: 'kid', roleLabel: '兒童 (12y)', age: 12, tags: ['kids-highlight'], notes: 'First 卡丁車、滑雪圈挑戰' },
    { id: 't6', name: '姐姐', role: 'kid', roleLabel: '兒童 (10y)', age: 10, tags: ['kids-highlight'], notes: '土撥鼠樂園、萊湖水上木筏' },
    { id: 't7', name: '弟弟', role: 'kid', roleLabel: '兒童 (8y)', age: 8, tags: ['kids-highlight'], notes: '冰川宮殿、巧克力冒險' },
  ],
  bases: [
    {
      id: 'luzern',
      name: 'Luzern',
      nameZh: '盧塞恩 / 琉森',
      days: [1, 2, 3, 4],
      color: '#0EA5E9',
      hotelName: 'Luzern Lakeside Family Apartment',
      notes: '卡貝爾木橋、Stoos最陡纜車、瑞吉山',
    },
    {
      id: 'grindelwald',
      name: 'Grindelwald',
      nameZh: '格林德瓦',
      days: [5, 6, 7],
      color: '#10B981',
      hotelName: 'Eiger Chalet Panorama View',
      notes: '菲斯特山天空步道、巴克普湖、哈德昆觀景台',
    },
    {
      id: 'zermatt',
      name: 'Zermatt',
      nameZh: '策馬特',
      days: [8, 9, 10, 11],
      color: '#E53E3E',
      hotelName: 'Chalet Primavista / Jolimont (陽台看日出)',
      notes: '陽台金頂日出、馬特洪冰川天堂、Gornergrat倒影',
    },
    {
      id: 'zurich',
      name: 'Zurich / Winterthur',
      nameZh: '蘇黎世 / 溫特圖爾',
      days: [12, 13, 14, 15, 16],
      color: '#8B5CF6',
      hotelName: 'Hotel Wartmann am Bahnhof (溫特圖爾)',
      notes: '萊茵瀑布、德國Jestetten跨境退稅購物、首都伯恩',
    },
  ],
  currencies: DEFAULT_CURRENCY_CONFIG,
};

export const useTripStore = create<TripStoreState>()(
  persist(
    (set) => ({
      config: INITIAL_CONFIG,
      itinerary: DEMO_ITINERARY,
      locations: DEMO_LOCATIONS,
      expenses: [
        {
          id: 'exp-demo-1',
          timestamp: new Date().toISOString(),
          dayNumber: 1,
          category: 'food',
          amount: 48.5,
          currency: 'CHF',
          note: '盧塞恩車站 Coop 採買全家第一晚自煮食材',
          paidBy: '媽媽',
        },
        {
          id: 'exp-demo-2',
          timestamp: new Date().toISOString(),
          dayNumber: 3,
          category: 'activity',
          amount: 156.0,
          currency: 'CHF',
          note: '皮拉圖斯山齒軌與纜車票 (4位成人 STP 半價，兒童持家庭卡免費)',
          paidBy: '爸爸',
        },
      ],
      checklist: DEFAULT_CHECKLIST,
      accommodations: DEMO_ACCOMMODATIONS,
      transports: DEMO_TRANSPORTS,
      bookmarks: ['loc-stoos', 'loc-first', 'loc-glacier-paradise', 'loc-gornergrat', 'loc-jestetten-dm'],
      isFetchingRemote: false,

      updateConfig: (partial) => {
        set((state) => ({
          config: { ...state.config, ...partial },
        }));
      },

      setStartDate: (dateStr) => {
        set((state) => ({
          config: { ...state.config, startDate: dateStr },
        }));
        if (isGasConfigured()) {
          syncManager.enqueue('TripConfig', 'UPDATE', {
            id: 'startDate',
            key: 'startDate',
            updates: { key: 'startDate', value: dateStr || '' },
          });
        }
      },

      // 行程自由規劃
      addDay: (baseId) => {
        set((state) => {
          const nextDayNum = state.itinerary.length + 1;
          const chosenBase = baseId || state.config.bases[0]?.id || 'luzern';
          const newDay: DayItinerary = {
            day: nextDayNum,
            baseId: chosenBase,
            title: `第 ${nextDayNum} 天 自訂探索日程`,
            subtitle: '點擊此卡片可編輯標題、新增景點時段與交通安排',
            highlights: ['自由探索', '悠閒慢活'],
            timeBlocks: [
              {
                period: 'morning',
                periodLabel: '上午 09:00 - 12:00',
                title: '晨間自由散步與探索',
                description: '請點擊編輯此活動以填寫您規劃的景點、交通方式或美食。',
                tags: ['senior-friendly'],
              }
            ],
            foodNotes: [
              {
                meal: 'lunch',
                mealLabel: '午餐',
                suggestion: '自選當地景觀餐廳或輕食野餐',
                type: 'restaurant',
                costEstimate: '約 CHF 20-30 / 人',
              }
            ],
            supermarketTips: ['查詢附近最近之超市營業時間'],
          };

          const nextItinerary = [...state.itinerary, newDay];
          return {
            itinerary: nextItinerary,
            config: {
              ...state.config,
              totalDays: nextItinerary.length,
            },
          };
        });
      },

      updateDay: (dayNumber, updates) => {
        set((state) => ({
          itinerary: state.itinerary.map((d) =>
            d.day === dayNumber ? { ...d, ...updates } : d
          ),
        }));
      },

      deleteDay: (dayNumber) => {
        set((state) => {
          const filtered = state.itinerary
            .filter((d) => d.day !== dayNumber)
            .map((d, idx) => ({ ...d, day: idx + 1 })); // 重新編號天數
          return {
            itinerary: filtered,
            config: {
              ...state.config,
              totalDays: filtered.length,
            },
          };
        });
      },

      addTimeBlock: (dayNumber, block) => {
        set((state) => ({
          itinerary: state.itinerary.map((d) => {
            if (d.day === dayNumber) {
              return {
                ...d,
                timeBlocks: [...d.timeBlocks, block],
              };
            }
            return d;
          }),
        }));
      },

      updateTimeBlock: (dayNumber, blockIndex, updates) => {
        set((state) => ({
          itinerary: state.itinerary.map((d) => {
            if (d.day === dayNumber) {
              const nextBlocks = [...d.timeBlocks];
              if (nextBlocks[blockIndex]) {
                nextBlocks[blockIndex] = { ...nextBlocks[blockIndex], ...updates };
              }
              return { ...d, timeBlocks: nextBlocks };
            }
            return d;
          }),
        }));
      },

      deleteTimeBlock: (dayNumber, blockIndex) => {
        set((state) => ({
          itinerary: state.itinerary.map((d) => {
            if (d.day === dayNumber) {
              return {
                ...d,
                timeBlocks: d.timeBlocks.filter((_, idx) => idx !== blockIndex),
              };
            }
            return d;
          }),
        }));
      },

      resetItineraryToDemo: () => {
        set((state) => ({
          itinerary: DEMO_ITINERARY,
          config: {
            ...state.config,
            totalDays: DEMO_ITINERARY.length,
          },
        }));
      },

      // 住宿預訂 Actions
      addAccommodation: (acc) => {
        const newItem: AccommodationBooking = {
          ...acc,
          id: `acc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        };
        set((state) => ({
          accommodations: [...state.accommodations, newItem],
        }));
        if (isGasConfigured()) {
          syncManager.enqueue('Accommodations', 'APPEND', { row: newItem });
        }
      },

      updateAccommodation: (id, updates) => {
        set((state) => ({
          accommodations: state.accommodations.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
        }));
        if (isGasConfigured()) {
          syncManager.enqueue('Accommodations', 'UPDATE', { id, updates });
        }
      },

      deleteAccommodation: (id) => {
        set((state) => ({
          accommodations: state.accommodations.filter((a) => a.id !== id),
        }));
        if (isGasConfigured()) {
          syncManager.enqueue('Accommodations', 'DELETE', { id });
        }
      },

      // 交通預訂 Actions
      addTransport: (trans) => {
        const newItem: TransportBooking = {
          ...trans,
          id: `tra_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        };
        set((state) => ({
          transports: [...state.transports, newItem],
        }));
        if (isGasConfigured()) {
          syncManager.enqueue('Transports', 'APPEND', { row: newItem });
        }
      },

      updateTransport: (id, updates) => {
        set((state) => ({
          transports: state.transports.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        }));
        if (isGasConfigured()) {
          syncManager.enqueue('Transports', 'UPDATE', { id, updates });
        }
      },

      deleteTransport: (id) => {
        set((state) => ({
          transports: state.transports.filter((t) => t.id !== id),
        }));
        if (isGasConfigured()) {
          syncManager.enqueue('Transports', 'DELETE', { id });
        }
      },

      // 費用與清單
      addExpense: (item) => {
        const newRecord: ExpenseRecord = {
          ...item,
          id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          timestamp: new Date().toISOString(),
        };

        set((state) => ({
          expenses: [newRecord, ...state.expenses],
        }));

        if (isGasConfigured()) {
          syncManager.enqueue('Expenses', 'APPEND', {
            row: newRecord,
          });
        }
      },

      deleteExpense: (id) => {
        set((state) => ({
          expenses: state.expenses.filter((e) => e.id !== id),
        }));

        if (isGasConfigured()) {
          syncManager.enqueue('Expenses', 'DELETE', { id });
        }
      },

      toggleChecklistItem: (id) => {
        let updatedItem: ChecklistItem | undefined;
        set((state) => {
          const next = state.checklist.map((item) => {
            if (item.id === id) {
              updatedItem = { ...item, checked: !item.checked };
              return updatedItem;
            }
            return item;
          });
          return { checklist: next };
        });

        if (updatedItem && isGasConfigured()) {
          syncManager.enqueue('Checklist', 'UPDATE', {
            id,
            updates: { checked: updatedItem.checked },
          });
        }
      },

      addChecklistItem: (item) => {
        const newItem: ChecklistItem = {
          ...item,
          id: `chk_${Date.now()}`,
        };
        set((state) => ({
          checklist: [...state.checklist, newItem],
        }));
        if (isGasConfigured()) {
          syncManager.enqueue('Checklist', 'APPEND', {
            row: newItem,
          });
        }
      },

      deleteChecklistItem: (id) => {
        set((state) => ({
          checklist: state.checklist.filter((c) => c.id !== id),
        }));
        if (isGasConfigured()) {
          syncManager.enqueue('Checklist', 'DELETE', { id });
        }
      },

      toggleBookmark: (locationId) => {
        set((state) => {
          const exists = state.bookmarks.includes(locationId);
          const next = exists
            ? state.bookmarks.filter((id) => id !== locationId)
            : [...state.bookmarks, locationId];

          if (isGasConfigured()) {
            if (exists) {
              syncManager.enqueue('Bookmarks', 'DELETE', { id: locationId });
            } else {
              syncManager.enqueue('Bookmarks', 'APPEND', {
                row: { id: locationId, locationId, timestamp: new Date().toISOString() },
              });
            }
          }

          return { bookmarks: next };
        });
      },

      fetchLatestFromSheets: async () => {
        if (!isGasConfigured()) return false;
        set({ isFetchingRemote: true });

        try {
          const res = await fetchFromSheet<Record<string, unknown[]>>();
          if (res.success && res.data) {
            const remoteData = res.data;
            set((state) => {
              const nextState: Partial<TripStoreState> = {};

              // 1. 同步 Expenses
              if (Array.isArray(remoteData.Expenses) && remoteData.Expenses.length > 0) {
                const parsedExpenses: ExpenseRecord[] = remoteData.Expenses.map((row: any) => ({
                  id: String(row.id || Math.random()),
                  timestamp: String(row.timestamp || new Date().toISOString()),
                  dayNumber: row.dayNumber ? Number(row.dayNumber) : undefined,
                  category: row.category || 'other',
                  amount: Number(row.amount) || 0,
                  currency: row.currency || 'CHF',
                  note: String(row.note || ''),
                  paidBy: row.paidBy ? String(row.paidBy) : undefined,
                }));
                nextState.expenses = parsedExpenses;
              }

              // 2. 同步 Checklist
              if (Array.isArray(remoteData.Checklist) && remoteData.Checklist.length > 0) {
                const parsedChecklist: ChecklistItem[] = remoteData.Checklist.map((row: any) => ({
                  id: String(row.id),
                  category: row.category || 'clothing',
                  categoryLabel: row.categoryLabel || '行前清單',
                  item: String(row.item || ''),
                  checked: row.checked === true || row.checked === 'TRUE' || row.checked === 'true',
                  priority: row.priority || 'medium',
                  assignedTo: row.assignedTo ? String(row.assignedTo) : undefined,
                  altitudeRange: row.altitudeRange ? String(row.altitudeRange) : undefined,
                }));
                nextState.checklist = parsedChecklist;
              }

              // 3. 同步 TripConfig (例如 startDate)
              if (Array.isArray(remoteData.TripConfig)) {
                const configMap: Record<string, any> = {};
                remoteData.TripConfig.forEach((item: any) => {
                  if (item.key) configMap[item.key] = item.value;
                });
                if (configMap.startDate) {
                  nextState.config = { ...state.config, startDate: String(configMap.startDate) };
                }
              }

              return { ...nextState, isFetchingRemote: false };
            });
            return true;
          }
        } catch (err) {
          console.error('拉取 Google Sheets 資料失敗:', err);
        } finally {
          set({ isFetchingRemote: false });
        }
        return false;
      },
    }),
    {
      name: 'swiss-odyssey-2027-store-v2',
      partialize: (state) => ({
        config: state.config,
        itinerary: state.itinerary,
        expenses: state.expenses,
        checklist: state.checklist,
        accommodations: state.accommodations,
        transports: state.transports,
        bookmarks: state.bookmarks,
      }),
    }
  )
);
