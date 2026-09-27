import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  TripConfig, 
  DayItinerary, 
  MapLocation, 
  ExpenseRecord, 
  ChecklistItem
} from '../types';
import { DEMO_ITINERARY } from '../data/demo-itinerary';
import { DEMO_LOCATIONS } from '../data/demo-locations';
import { DEFAULT_CHECKLIST } from '../data/clothing-checklist';
import { DEFAULT_CURRENCY_CONFIG } from '../utils/currency';
import { syncManager } from '../services/syncManager';
import { fetchFromSheet, isGasConfigured } from '../services/sheetApi';

export interface TripStoreState {
  config: TripConfig;
  itinerary: DayItinerary[];
  locations: MapLocation[];
  expenses: ExpenseRecord[];
  checklist: ChecklistItem[];
  bookmarks: string[]; // MapLocation.id 清單
  isFetchingRemote: boolean;

  // Actions
  updateConfig: (partial: Partial<TripConfig>) => void;
  setStartDate: (dateStr: string | null) => void;
  addExpense: (expense: Omit<ExpenseRecord, 'id' | 'timestamp'>) => void;
  deleteExpense: (id: string) => void;
  toggleChecklistItem: (id: string) => void;
  addChecklistItem: (item: Omit<ChecklistItem, 'id'>) => void;
  toggleBookmark: (locationId: string) => void;
  fetchLatestFromSheets: () => Promise<boolean>;
}

const INITIAL_CONFIG: TripConfig = {
  tripName: 'Swiss Family Odyssey 2027',
  subtitle: '瑞士 16 天阿爾卑斯三代同堂慢遊 (7人三代同樂)',
  startDate: '2027-06-15', // 彈性預設值，可隨時在設定頁更動或清空
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
        // 同步至 Google Sheets TripConfig
        syncManager.enqueue('TripConfig', 'UPDATE', {
          id: 'startDate',
          updates: { value: dateStr || '' },
        });
      },

      addExpense: (item) => {
        const newRecord: ExpenseRecord = {
          ...item,
          id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          timestamp: new Date().toISOString(),
        };

        set((state) => ({
          expenses: [newRecord, ...state.expenses],
        }));

        // 背景非同步寫入 Google Sheets
        syncManager.enqueue('Expenses', 'APPEND', {
          row: newRecord,
        });
      },

      deleteExpense: (id) => {
        set((state) => ({
          expenses: state.expenses.filter((e) => e.id !== id),
        }));

        syncManager.enqueue('Expenses', 'DELETE', { id });
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

        if (updatedItem) {
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
        syncManager.enqueue('Checklist', 'APPEND', {
          row: newItem,
        });
      },

      toggleBookmark: (locationId) => {
        set((state) => {
          const exists = state.bookmarks.includes(locationId);
          const next = exists
            ? state.bookmarks.filter((id) => id !== locationId)
            : [...state.bookmarks, locationId];

          // 同步
          if (exists) {
            syncManager.enqueue('Bookmarks', 'DELETE', { id: locationId });
          } else {
            syncManager.enqueue('Bookmarks', 'APPEND', {
              row: { id: locationId, locationId, timestamp: new Date().toISOString() },
            });
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
      name: 'swiss-odyssey-2027-store',
      partialize: (state) => ({
        config: state.config,
        expenses: state.expenses,
        checklist: state.checklist,
        bookmarks: state.bookmarks,
      }),
    }
  )
);
