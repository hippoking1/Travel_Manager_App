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
  TransportBooking,
  TripPlan,
  CreateTripParams,
  DestinationModule,
  ContainerId
} from '../types';
import { DEMO_ITINERARY } from '../data/demo-itinerary';
import { DEMO_LOCATIONS } from '../data/demo-locations';
import { DEFAULT_CHECKLIST } from '../data/clothing-checklist';
import { DEMO_ACCOMMODATIONS, DEMO_TRANSPORTS } from '../data/demo-bookings';
import { DEFAULT_CURRENCY_CONFIG } from '../utils/currency';
import { syncManager } from '../services/syncManager';
import { fetchFromSheet, isGasConfigured } from '../services/sheetApi';
import { 
  moveBlock as moveBlockPure, 
  reorderDays as reorderDaysPure, 
  reflowTimes, 
  fitIntoSlot,
  derivePeriod,
  formatTimeSpan
} from '../lib/itinerary';
import { normalizeTripPlan, normalizeDayItinerary, normalizeTimeBlock, migrateToV4 } from './migrations';

export interface TripStoreState {
  // 多場旅遊計畫管理 (Multi-Trip Management)
  trips: TripPlan[];
  activeTripId: string;
  switchTrip: (tripId: string) => void;
  createTrip: (params: CreateTripParams) => string;
  deleteTrip: (tripId: string) => void;
  duplicateTrip: (tripId: string) => void;

  // 當前活躍旅程狀態 (便利取得，維持相容)
  config: TripConfig;
  itinerary: DayItinerary[];
  backlog: TimeBlock[];
  modules: DestinationModule[];
  locations: MapLocation[];
  expenses: ExpenseRecord[];
  checklist: ChecklistItem[];
  accommodations: AccommodationBooking[];
  transports: TransportBooking[];
  bookmarks: string[];
  isFetchingRemote: boolean;

  // 基本設定 Actions
  updateConfig: (partial: Partial<TripConfig>) => void;
  setStartDate: (dateStr: string | null) => void;
  setTotalDays: (days: number) => void;
  setModules: (modules: DestinationModule[]) => void;
  
  // 拖拉排程與日程 Actions (核心需求 1)
  moveBlock: (blockId: string, toContainer: ContainerId, toIndex: number) => void;
  reorderDays: (fromIndex: number, toIndex: number) => void;
  reflowDay: (dayIdOrNumber: string | number, dayStart?: string) => void;
  addDay: (baseId?: string) => void;
  updateDay: (dayNumberOrId: number | string, updates: Partial<DayItinerary>) => void;
  deleteDay: (dayNumberOrId: number | string) => void;
  addTimeBlock: (dayNumberOrId: number | string, block: Omit<TimeBlock, 'id'> | TimeBlock) => void;
  updateTimeBlock: (dayNumber: number, blockIndex: number, updates: Partial<TimeBlock>) => void;
  deleteTimeBlock: (dayNumber: number, blockIndex: number) => void;
  updateTimeBlockById: (blockId: string, updates: Partial<TimeBlock>) => void;
  deleteTimeBlockById: (blockId: string) => void;
  addBacklogItem: (block: Omit<TimeBlock, 'id'> | TimeBlock) => void;
  deleteBacklogItem: (blockId: string) => void;
  resetItineraryToDemo: () => void;
  undo: () => void;

  // 住宿預訂管理 Actions
  addAccommodation: (acc: Omit<AccommodationBooking, 'id'>) => void;
  updateAccommodation: (id: string, updates: Partial<AccommodationBooking>) => void;
  deleteAccommodation: (id: string) => void;

  // 交通預訂管理 Actions
  addTransport: (trans: Omit<TransportBooking, 'id'>) => void;
  updateTransport: (id: string, updates: Partial<TransportBooking>) => void;
  deleteTransport: (id: string) => void;

  // 記帳與清單 Actions
  addExpense: (expense: Omit<ExpenseRecord, 'id' | 'timestamp'>) => void;
  updateExpense: (id: string, updates: Partial<ExpenseRecord>) => void;
  deleteExpense: (id: string) => void;
  toggleChecklistItem: (id: string) => void;
  addChecklistItem: (item: Omit<ChecklistItem, 'id'>) => void;
  updateChecklistItem: (id: string, updates: Partial<ChecklistItem>) => void;
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
      coordinates: [47.0502, 8.3093],
    },
    {
      id: 'grindelwald',
      name: 'Grindelwald',
      nameZh: '格林德瓦',
      days: [5, 6, 7],
      color: '#10B981',
      hotelName: 'Eiger Chalet Panorama View',
      notes: '菲斯特山天空步道、巴克普湖、哈德昆觀景台',
      coordinates: [46.6244, 8.0414],
    },
    {
      id: 'zermatt',
      name: 'Zermatt',
      nameZh: '策馬特',
      days: [8, 9, 10, 11],
      color: '#E53E3E',
      hotelName: 'Chalet Primavista / Jolimont (陽台看日出)',
      notes: '陽台金頂日出、馬特洪冰川天堂、Gornergrat倒影',
      coordinates: [45.9765, 7.7491],
    },
    {
      id: 'zurich',
      name: 'Zurich / Winterthur',
      nameZh: '蘇黎世 / 溫特圖爾',
      days: [12, 13, 14, 15, 16],
      color: '#8B5CF6',
      hotelName: 'Hotel Wartmann am Bahnhof (溫特圖爾)',
      notes: '萊茵瀑布、德國Jestetten跨境退稅購物、首都伯恩',
      coordinates: [47.3769, 8.5417],
    },
  ],
  currencies: DEFAULT_CURRENCY_CONFIG,
};

const DEFAULT_DEMO_EXPENSES: ExpenseRecord[] = [
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
];

export const DEFAULT_SWISS_TRIP_ID = 'trip_swiss_2027';

export const INITIAL_SWISS_TRIP: TripPlan = normalizeTripPlan({
  id: DEFAULT_SWISS_TRIP_ID,
  name: 'Swiss Family Odyssey 2027',
  destination: '瑞士 (Switzerland)',
  coverEmoji: '🇨🇭',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: new Date().toISOString(),
  config: INITIAL_CONFIG,
  itinerary: DEMO_ITINERARY,
  backlog: [
    {
      id: 'backlog-blausee',
      period: 'morning',
      title: '藍湖 (Blausee) 自然公園秘境漫步',
      description: '湖水如水晶般清澈純淨，水底鱒魚悠游，若有額外半天空檔可彈性安插此處野餐。',
      tags: ['senior-friendly', 'kids-highlight'],
    },
    {
      id: 'backlog-chillon',
      period: 'afternoon',
      title: '西庸古堡 (Château de Chillon) 蒙特勒湖畔遊',
      description: '日內瓦湖畔歷史古堡，STP 可免費入場，可搭配雷夢湖遊船放鬆。',
      tags: ['senior-friendly', 'scenic-train'],
    },
  ],
  modules: ['swiss'],
  locations: DEMO_LOCATIONS,
  expenses: DEFAULT_DEMO_EXPENSES,
  checklist: DEFAULT_CHECKLIST,
  accommodations: DEMO_ACCOMMODATIONS,
  transports: DEMO_TRANSPORTS,
  bookmarks: ['loc-stoos', 'loc-first', 'loc-glacier-paradise', 'loc-gornergrat', 'loc-jestetten-dm'],
});

// 單步輕量 Undo 暫存快照
let lastUndoSnapshot: TripPlan | null = null;

/**
 * 統一透過 mutateActive 修改作用中旅程，徹底杜絕 trips[] 與扁平欄位脫節之雙寫 Bug
 */
function mutateActive(
  state: TripStoreState,
  updater: (active: TripPlan) => Partial<TripPlan>
): Partial<TripStoreState> {
  const activeIndex = state.trips.findIndex((t) => t.id === state.activeTripId);
  if (activeIndex === -1) return {};

  const currentActive = state.trips[activeIndex];
  // 記錄 Snapshot 給 undo 使用
  lastUndoSnapshot = JSON.parse(JSON.stringify(currentActive));

  const updates = updater(currentActive);
  const updatedActive: TripPlan = {
    ...currentActive,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  const nextTrips = [...state.trips];
  nextTrips[activeIndex] = updatedActive;

  return {
    trips: nextTrips,
    config: updatedActive.config,
    itinerary: updatedActive.itinerary,
    backlog: updatedActive.backlog || [],
    modules: updatedActive.modules || [],
    locations: updatedActive.locations,
    expenses: updatedActive.expenses,
    checklist: updatedActive.checklist,
    accommodations: updatedActive.accommodations,
    transports: updatedActive.transports,
    bookmarks: updatedActive.bookmarks,
  };
}

export const useTripStore = create<TripStoreState>()(
  persist(
    (set, get) => ({
      // 多場旅程管理
      trips: [INITIAL_SWISS_TRIP],
      activeTripId: DEFAULT_SWISS_TRIP_ID,

      // 當前活躍旅程狀態
      config: INITIAL_SWISS_TRIP.config,
      itinerary: INITIAL_SWISS_TRIP.itinerary,
      backlog: INITIAL_SWISS_TRIP.backlog,
      modules: INITIAL_SWISS_TRIP.modules,
      locations: INITIAL_SWISS_TRIP.locations,
      expenses: INITIAL_SWISS_TRIP.expenses,
      checklist: INITIAL_SWISS_TRIP.checklist,
      accommodations: INITIAL_SWISS_TRIP.accommodations,
      transports: INITIAL_SWISS_TRIP.transports,
      bookmarks: INITIAL_SWISS_TRIP.bookmarks,
      isFetchingRemote: false,

      // 多場旅程 Actions
      switchTrip: (tripId) => {
        set((state) => {
          if (state.activeTripId === tripId) return state;
          const target = state.trips.find((t) => t.id === tripId);
          if (!target) return state;

          return {
            activeTripId: target.id,
            config: target.config,
            itinerary: target.itinerary,
            backlog: target.backlog || [],
            modules: target.modules || [],
            locations: target.locations || [],
            expenses: target.expenses || [],
            checklist: target.checklist || DEFAULT_CHECKLIST,
            accommodations: target.accommodations || [],
            transports: target.transports || [],
            bookmarks: target.bookmarks || [],
          };
        });
      },

      createTrip: (params) => {
        const newId = `trip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        let newTrip: TripPlan;

        if (params.template === 'swiss-demo') {
          newTrip = normalizeTripPlan({
            id: newId,
            name: params.name.trim() || '瑞士經典範本行程',
            destination: params.destination?.trim() || '瑞士 (Switzerland)',
            coverEmoji: params.coverEmoji || '🇨🇭',
            config: {
              ...INITIAL_CONFIG,
              tripName: params.name.trim() || '瑞士經典範本行程',
              startDate: params.startDate || INITIAL_CONFIG.startDate,
              totalDays: params.totalDays || 16,
            },
            itinerary: DEMO_ITINERARY,
            locations: DEMO_LOCATIONS,
            expenses: [],
            checklist: DEFAULT_CHECKLIST.map((item) => ({ ...item, checked: false })),
            accommodations: DEMO_ACCOMMODATIONS,
            transports: DEMO_TRANSPORTS,
            bookmarks: [],
            modules: ['swiss'],
          });
        } else {
          const days = params.totalDays || 5;
          const blankItinerary: DayItinerary[] = [];
          for (let d = 1; d <= days; d++) {
            blankItinerary.push({
              id: `day_${d}_${Math.random().toString(36).slice(2, 6)}`,
              day: d,
              baseId: 'base-main',
              title: `第 ${d} 天 精彩探索日程`,
              subtitle: '可編輯標題、新增景點時段與交通安排',
              highlights: ['自由探索', '悠閒慢活'],
              timeBlocks: [
                normalizeTimeBlock({
                  title: '晨間出發與探索',
                  description: '填寫規劃的景點、交通方式或美食。',
                  startTime: '09:00',
                  endTime: '11:30',
                }),
              ],
              foodNotes: [
                {
                  meal: 'lunch',
                  mealLabel: '午餐',
                  suggestion: '自選當地景觀餐廳或輕食野餐',
                  type: 'restaurant',
                },
              ],
              supermarketTips: ['查詢附近最近之超市或便利店'],
            });
          }

          const blankConfig: TripConfig = {
            tripName: params.name.trim() || '新自訂旅遊計畫',
            subtitle: params.destination ? `${params.destination} 深度慢遊` : '自由行自訂行程',
            startDate: params.startDate || null,
            totalDays: days,
            travelers: [
              { id: 't1', name: '自己 / 主揪', role: 'adult', roleLabel: '成人', age: 35, tags: ['senior-friendly'] },
            ],
            bases: [
              {
                id: 'base-main',
                name: 'Main Base',
                nameZh: '主要市區住宿',
                days: Array.from({ length: days }, (_, i) => i + 1),
                color: '#0EA5E9',
                hotelName: '預定市區飯店 / 公寓',
                notes: '交通便利之中心點',
              },
            ],
            currencies: DEFAULT_CURRENCY_CONFIG,
          };

          newTrip = normalizeTripPlan({
            id: newId,
            name: params.name.trim() || '新自訂旅遊計畫',
            destination: params.destination?.trim() || '自由行目的地',
            coverEmoji: params.coverEmoji || '✈️',
            config: blankConfig,
            itinerary: blankItinerary,
            backlog: [],
            modules: [],
            locations: [],
            expenses: [],
            checklist: DEFAULT_CHECKLIST.map((item) => ({ ...item, checked: false })),
            accommodations: [],
            transports: [],
            bookmarks: [],
          });
        }

        set((state) => ({
          trips: [...state.trips, newTrip],
          activeTripId: newTrip.id,
          config: newTrip.config,
          itinerary: newTrip.itinerary,
          backlog: newTrip.backlog,
          modules: newTrip.modules,
          locations: newTrip.locations,
          expenses: newTrip.expenses,
          checklist: newTrip.checklist,
          accommodations: newTrip.accommodations,
          transports: newTrip.transports,
          bookmarks: newTrip.bookmarks,
        }));

        return newId;
      },

      deleteTrip: (tripId) => {
        set((state) => {
          if (state.trips.length <= 1) {
            return state;
          }
          const remaining = state.trips.filter((t) => t.id !== tripId);
          if (state.activeTripId === tripId) {
            const nextActive = remaining[0];
            return {
              trips: remaining,
              activeTripId: nextActive.id,
              config: nextActive.config,
              itinerary: nextActive.itinerary,
              backlog: nextActive.backlog || [],
              modules: nextActive.modules || [],
              locations: nextActive.locations || [],
              expenses: nextActive.expenses || [],
              checklist: nextActive.checklist || DEFAULT_CHECKLIST,
              accommodations: nextActive.accommodations || [],
              transports: nextActive.transports || [],
              bookmarks: nextActive.bookmarks || [],
            };
          }
          return { trips: remaining };
        });
      },

      duplicateTrip: (tripId) => {
        set((state) => {
          const src = state.trips.find((t) => t.id === tripId);
          if (!src) return state;

          const newId = `trip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const copyTrip: TripPlan = {
            ...JSON.parse(JSON.stringify(src)),
            id: newId,
            name: `${src.name} (副本)`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            config: {
              ...src.config,
              tripName: `${src.config.tripName} (副本)`,
            },
          };

          return {
            trips: [...state.trips, copyTrip],
          };
        });
      },

      // 基本設定 Actions
      updateConfig: (partial) => {
        set((state) =>
          mutateActive(state, (active) => {
            const nextConfig = { ...active.config, ...partial };
            return {
              config: nextConfig,
              name: nextConfig.tripName || active.name,
            };
          })
        );
      },

      setStartDate: (dateStr) => {
        set((state) =>
          mutateActive(state, (active) => ({
            config: { ...active.config, startDate: dateStr },
          }))
        );
        if (isGasConfigured()) {
          syncManager.enqueue(
            'TripConfig',
            'UPDATE',
            {
              id: 'startDate',
              key: 'startDate',
              updates: { key: 'startDate', value: dateStr || '' },
            },
            get().activeTripId
          );
        }
      },

      setTotalDays: (days) => {
        const targetDays = Math.max(1, Math.min(90, Math.floor(days)));
        set((state) =>
          mutateActive(state, (active) => {
            const currentDays = active.itinerary.length;
            let nextItinerary = [...active.itinerary];

            if (targetDays > currentDays) {
              for (let d = currentDays + 1; d <= targetDays; d++) {
                const lastBaseId =
                  active.itinerary[active.itinerary.length - 1]?.baseId ||
                  active.config.bases[active.config.bases.length - 1]?.id ||
                  'base-main';
                nextItinerary.push({
                  id: `day_${d}_${Math.random().toString(36).slice(2, 6)}`,
                  day: d,
                  baseId: lastBaseId,
                  title: `第 ${d} 天 自訂探索日程`,
                  subtitle: '點擊此卡片可編輯標題、新增景點時段與交通安排',
                  highlights: ['自由探索', '悠閒慢活'],
                  timeBlocks: [
                    normalizeTimeBlock({
                      title: '晨間自由散步與探索',
                      description: '請編輯此活動以填寫您規劃的景點、交通方式或美食。',
                      startTime: '09:00',
                      endTime: '11:00',
                    }),
                  ],
                  foodNotes: [
                    {
                      meal: 'lunch',
                      mealLabel: '午餐',
                      suggestion: '自選當地景觀餐廳或輕食野餐',
                      type: 'restaurant',
                    },
                  ],
                  supermarketTips: ['查詢附近最近之超市營業時間'],
                });
              }
            } else if (targetDays < currentDays) {
              nextItinerary = nextItinerary.slice(0, targetDays);
            }

            return {
              itinerary: nextItinerary,
              config: {
                ...active.config,
                totalDays: targetDays,
              },
            };
          })
        );
      },

      setModules: (modules) => {
        set((state) =>
          mutateActive(state, () => ({
            modules,
          }))
        );
      },

      // 拖拉排程與日程 Actions
      moveBlock: (blockId, toContainer, toIndex) => {
        set((state) =>
          mutateActive(state, (active) => {
            const res = moveBlockPure(active, blockId, toContainer, toIndex);
            return {
              itinerary: res.itinerary,
              backlog: res.backlog,
            };
          })
        );
      },

      reorderDays: (fromIndex, toIndex) => {
        set((state) =>
          mutateActive(state, (active) => ({
            itinerary: reorderDaysPure(active.itinerary, fromIndex, toIndex),
          }))
        );
      },

      reflowDay: (dayIdOrNumber, dayStart = '09:00') => {
        set((state) =>
          mutateActive(state, (active) => {
            const nextItinerary = active.itinerary.map((d) => {
              if (d.id === dayIdOrNumber || d.day === dayIdOrNumber) {
                return {
                  ...d,
                  timeBlocks: reflowTimes(d.timeBlocks, dayStart),
                };
              }
              return d;
            });
            return { itinerary: nextItinerary };
          })
        );
      },

      addDay: (baseId) => {
        set((state) =>
          mutateActive(state, (active) => {
            const nextDayNum = active.itinerary.length + 1;
            const chosenBase = baseId || active.config.bases[0]?.id || 'base-main';
            const newDay: DayItinerary = {
              id: `day_${nextDayNum}_${Math.random().toString(36).slice(2, 6)}`,
              day: nextDayNum,
              baseId: chosenBase,
              title: `第 ${nextDayNum} 天 自訂探索日程`,
              subtitle: '可編輯標題、新增景點時段與交通安排',
              highlights: ['自由探索', '悠閒慢活'],
              timeBlocks: [
                normalizeTimeBlock({
                  title: '晨間自由散步與探索',
                  description: '請編輯此活動以填寫您規劃的景點、交通方式或美食。',
                  startTime: '09:00',
                  endTime: '11:00',
                }),
              ],
              foodNotes: [
                {
                  meal: 'lunch',
                  mealLabel: '午餐',
                  suggestion: '自選當地景觀餐廳或輕食野餐',
                  type: 'restaurant',
                },
              ],
              supermarketTips: ['查詢附近最近之超市營業時間'],
            };

            const nextItinerary = [...active.itinerary, newDay];
            return {
              itinerary: nextItinerary,
              config: {
                ...active.config,
                totalDays: nextItinerary.length,
              },
            };
          })
        );
      },

      updateDay: (dayNumberOrId, updates) => {
        set((state) =>
          mutateActive(state, (active) => ({
            itinerary: active.itinerary.map((d) =>
              d.day === dayNumberOrId || d.id === dayNumberOrId ? { ...d, ...updates } : d
            ),
          }))
        );
      },

      deleteDay: (dayNumberOrId) => {
        set((state) =>
          mutateActive(state, (active) => {
            const filtered = active.itinerary
              .filter((d) => d.day !== dayNumberOrId && d.id !== dayNumberOrId)
              .map((d, idx) => ({ ...d, day: idx + 1 }));

            return {
              itinerary: filtered,
              config: {
                ...active.config,
                totalDays: filtered.length,
              },
            };
          })
        );
      },

      addTimeBlock: (dayNumberOrId, block) => {
        set((state) =>
          mutateActive(state, (active) => {
            const normalized = normalizeTimeBlock(block);
            const nextItinerary = active.itinerary.map((d) => {
              if (d.day === dayNumberOrId || d.id === dayNumberOrId) {
                const blocks = [...d.timeBlocks, normalized];
                return {
                  ...d,
                  timeBlocks: fitIntoSlot(blocks, blocks.length - 1),
                };
              }
              return d;
            });
            return { itinerary: nextItinerary };
          })
        );
      },

      updateTimeBlock: (dayNumber, blockIndex, updates) => {
        set((state) =>
          mutateActive(state, (active) => {
            const nextItinerary = active.itinerary.map((d) => {
              if (d.day === dayNumber) {
                const nextBlocks = [...d.timeBlocks];
                if (nextBlocks[blockIndex]) {
                  const merged = { ...nextBlocks[blockIndex], ...updates };
                  if (updates.startTime) {
                    merged.period = derivePeriod(updates.startTime);
                  }
                  if (updates.startTime || updates.endTime) {
                    merged.periodLabel = formatTimeSpan(merged.startTime, merged.endTime);
                  }
                  nextBlocks[blockIndex] = merged;
                }
                return { ...d, timeBlocks: nextBlocks };
              }
              return d;
            });
            return { itinerary: nextItinerary };
          })
        );
      },

      deleteTimeBlock: (dayNumber, blockIndex) => {
        set((state) =>
          mutateActive(state, (active) => ({
            itinerary: active.itinerary.map((d) => {
              if (d.day === dayNumber) {
                return {
                  ...d,
                  timeBlocks: d.timeBlocks.filter((_, idx) => idx !== blockIndex),
                };
              }
              return d;
            }),
          }))
        );
      },

      updateTimeBlockById: (blockId, updates) => {
        set((state) =>
          mutateActive(state, (active) => {
            // 先搜尋 itinerary
            let foundInDay = false;
            const nextItinerary = active.itinerary.map((day) => {
              const bIdx = day.timeBlocks.findIndex((b) => b.id === blockId);
              if (bIdx === -1) return day;
              foundInDay = true;
              const nextBlocks = [...day.timeBlocks];
              const merged = { ...nextBlocks[bIdx], ...updates };
              if (updates.startTime) {
                merged.period = derivePeriod(updates.startTime);
              }
              if (updates.startTime || updates.endTime) {
                merged.periodLabel = formatTimeSpan(merged.startTime, merged.endTime);
              }
              nextBlocks[bIdx] = merged;
              return { ...day, timeBlocks: nextBlocks };
            });

            if (foundInDay) {
              return { itinerary: nextItinerary };
            }

            // 若在 backlog
            const nextBacklog = active.backlog.map((b) =>
              b.id === blockId ? { ...b, ...updates } : b
            );
            return { backlog: nextBacklog };
          })
        );
      },

      deleteTimeBlockById: (blockId) => {
        set((state) =>
          mutateActive(state, (active) => ({
            itinerary: active.itinerary.map((day) => ({
              ...day,
              timeBlocks: day.timeBlocks.filter((b) => b.id !== blockId),
            })),
            backlog: active.backlog.filter((b) => b.id !== blockId),
          }))
        );
      },

      addBacklogItem: (block) => {
        set((state) =>
          mutateActive(state, (active) => {
            const normalized = normalizeTimeBlock(block);
            return {
              backlog: [normalized, ...(active.backlog || [])],
            };
          })
        );
      },

      deleteBacklogItem: (blockId) => {
        set((state) =>
          mutateActive(state, (active) => ({
            backlog: active.backlog.filter((b) => b.id !== blockId),
          }))
        );
      },

      resetItineraryToDemo: () => {
        set((state) =>
          mutateActive(state, (active) => ({
            itinerary: DEMO_ITINERARY.map((d, i) => normalizeDayItinerary(d, i)),
            config: {
              ...active.config,
              totalDays: DEMO_ITINERARY.length,
            },
          }))
        );
      },

      undo: () => {
        if (!lastUndoSnapshot) return;
        const snapshotToRestore = lastUndoSnapshot;
        lastUndoSnapshot = null;
        set((state) => mutateActive(state, () => snapshotToRestore));
      },

      // 住宿預訂 Actions
      addAccommodation: (acc) => {
        const newItem: AccommodationBooking = {
          ...acc,
          id: `acc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        };
        set((state) =>
          mutateActive(state, (active) => ({
            accommodations: [...active.accommodations, newItem],
          }))
        );
        if (isGasConfigured()) {
          syncManager.enqueue('Accommodations', 'APPEND', { row: newItem }, get().activeTripId);
        }
      },

      updateAccommodation: (id, updates) => {
        set((state) =>
          mutateActive(state, (active) => ({
            accommodations: active.accommodations.map((a) =>
              a.id === id ? { ...a, ...updates } : a
            ),
          }))
        );
        if (isGasConfigured()) {
          syncManager.enqueue('Accommodations', 'UPDATE', { id, updates }, get().activeTripId);
        }
      },

      deleteAccommodation: (id) => {
        set((state) =>
          mutateActive(state, (active) => ({
            accommodations: active.accommodations.filter((a) => a.id !== id),
          }))
        );
        if (isGasConfigured()) {
          syncManager.enqueue('Accommodations', 'DELETE', { id }, get().activeTripId);
        }
      },

      // 交通預訂 Actions
      addTransport: (trans) => {
        const newItem: TransportBooking = {
          ...trans,
          id: `tra_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        };
        set((state) =>
          mutateActive(state, (active) => ({
            transports: [...active.transports, newItem],
          }))
        );
        if (isGasConfigured()) {
          syncManager.enqueue('Transports', 'APPEND', { row: newItem }, get().activeTripId);
        }
      },

      updateTransport: (id, updates) => {
        set((state) =>
          mutateActive(state, (active) => ({
            transports: active.transports.map((t) =>
              t.id === id ? { ...t, ...updates } : t
            ),
          }))
        );
        if (isGasConfigured()) {
          syncManager.enqueue('Transports', 'UPDATE', { id, updates }, get().activeTripId);
        }
      },

      deleteTransport: (id) => {
        set((state) =>
          mutateActive(state, (active) => ({
            transports: active.transports.filter((t) => t.id !== id),
          }))
        );
        if (isGasConfigured()) {
          syncManager.enqueue('Transports', 'DELETE', { id }, get().activeTripId);
        }
      },

      // 費用與清單
      addExpense: (item) => {
        const newRecord: ExpenseRecord = {
          ...item,
          id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          timestamp: new Date().toISOString(),
        };

        set((state) =>
          mutateActive(state, (active) => ({
            expenses: [newRecord, ...active.expenses],
          }))
        );

        if (isGasConfigured()) {
          syncManager.enqueue('Expenses', 'APPEND', {
            row: newRecord,
          }, get().activeTripId);
        }
      },

      updateExpense: (id, updates) => {
        set((state) =>
          mutateActive(state, (active) => ({
            expenses: active.expenses.map((e) => (e.id === id ? { ...e, ...updates } : e)),
          }))
        );
        if (isGasConfigured()) {
          syncManager.enqueue('Expenses', 'UPDATE', { id, updates }, get().activeTripId);
        }
      },

      deleteExpense: (id) => {
        set((state) =>
          mutateActive(state, (active) => ({
            expenses: active.expenses.filter((e) => e.id !== id),
          }))
        );

        if (isGasConfigured()) {
          syncManager.enqueue('Expenses', 'DELETE', { id }, get().activeTripId);
        }
      },

      toggleChecklistItem: (id) => {
        let updatedItem: ChecklistItem | undefined;
        set((state) =>
          mutateActive(state, (active) => {
            const next = active.checklist.map((item) => {
              if (item.id === id) {
                updatedItem = { ...item, checked: !item.checked };
                return updatedItem;
              }
              return item;
            });
            return { checklist: next };
          })
        );

        if (updatedItem && isGasConfigured()) {
          syncManager.enqueue(
            'Checklist',
            'UPDATE',
            {
              id,
              updates: { checked: updatedItem.checked },
            },
            get().activeTripId
          );
        }
      },

      addChecklistItem: (item) => {
        const newItem: ChecklistItem = {
          ...item,
          id: `chk_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        };
        set((state) =>
          mutateActive(state, (active) => ({
            checklist: [...active.checklist, newItem],
          }))
        );
        if (isGasConfigured()) {
          syncManager.enqueue('Checklist', 'APPEND', {
            row: newItem,
          }, get().activeTripId);
        }
      },

      updateChecklistItem: (id, updates) => {
        set((state) =>
          mutateActive(state, (active) => ({
            checklist: active.checklist.map((c) => (c.id === id ? { ...c, ...updates } : c)),
          }))
        );
        if (isGasConfigured()) {
          syncManager.enqueue('Checklist', 'UPDATE', { id, updates }, get().activeTripId);
        }
      },

      deleteChecklistItem: (id) => {
        set((state) =>
          mutateActive(state, (active) => ({
            checklist: active.checklist.filter((c) => c.id !== id),
          }))
        );
        if (isGasConfigured()) {
          syncManager.enqueue('Checklist', 'DELETE', { id }, get().activeTripId);
        }
      },

      toggleBookmark: (locationId) => {
        let exists = false;
        set((state) =>
          mutateActive(state, (active) => {
            exists = active.bookmarks.includes(locationId);
            const next = exists
              ? active.bookmarks.filter((id) => id !== locationId)
              : [...active.bookmarks, locationId];
            return { bookmarks: next };
          })
        );

        if (isGasConfigured()) {
          if (exists) {
            syncManager.enqueue('Bookmarks', 'DELETE', { id: locationId }, get().activeTripId);
          } else {
            syncManager.enqueue('Bookmarks', 'APPEND', {
              row: { id: locationId, locationId, timestamp: new Date().toISOString() },
            }, get().activeTripId);
          }
        }
      },

      fetchLatestFromSheets: async () => {
        if (!isGasConfigured()) return false;
        set({ isFetchingRemote: true });

        try {
          const res = await fetchFromSheet<Record<string, unknown[]>>(undefined, get().activeTripId);
          if (res.success && res.data) {
            const remoteData = res.data;
            set((state) =>
              mutateActive(state, (active) => {
                const nextTrip: Partial<TripPlan> = {};

                // 1. 同步 Expenses
                if (Array.isArray(remoteData.Expenses) && remoteData.Expenses.length > 0) {
                  nextTrip.expenses = remoteData.Expenses.map((row: any) => ({
                    id: String(row.id || Math.random()),
                    timestamp: String(row.timestamp || new Date().toISOString()),
                    dayNumber: row.dayNumber ? Number(row.dayNumber) : undefined,
                    category: row.category || 'other',
                    amount: Number(row.amount) || 0,
                    currency: row.currency || active.config.currencies.primary || 'CHF',
                    note: String(row.note || ''),
                    paidBy: row.paidBy ? String(row.paidBy) : undefined,
                  }));
                }

                // 2. 同步 Checklist
                if (Array.isArray(remoteData.Checklist) && remoteData.Checklist.length > 0) {
                  nextTrip.checklist = remoteData.Checklist.map((row: any) => ({
                    id: String(row.id),
                    category: row.category || 'clothing',
                    categoryLabel: row.categoryLabel || '行前清單',
                    item: String(row.item || ''),
                    checked: row.checked === true || row.checked === 'TRUE' || row.checked === 'true',
                    priority: row.priority || 'medium',
                    assignedTo: row.assignedTo ? String(row.assignedTo) : undefined,
                    altitudeRange: row.altitudeRange ? String(row.altitudeRange) : undefined,
                  }));
                }

                // 3. 同步 TripConfig
                if (Array.isArray(remoteData.TripConfig)) {
                  const configMap: Record<string, any> = {};
                  remoteData.TripConfig.forEach((item: any) => {
                    if (item.key) configMap[item.key] = item.value;
                  });
                  const updatedConfig = { ...active.config };
                  if (configMap.startDate) {
                    updatedConfig.startDate = String(configMap.startDate);
                  }
                  if (configMap.totalDays) {
                    const days = parseInt(String(configMap.totalDays), 10);
                    if (!isNaN(days) && days > 0) {
                      updatedConfig.totalDays = days;
                    }
                  }
                  nextTrip.config = updatedConfig;
                }

                return nextTrip;
              })
            );
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
      name: 'travel-planner-store-v3',
      version: 4,
      migrate: (persistedState: any, version: number) => {
        if (version < 4) {
          return migrateToV4(persistedState);
        }
        return persistedState;
      },
      partialize: (state) => ({
        trips: state.trips,
        activeTripId: state.activeTripId,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        try {
          if (!state.trips || state.trips.length === 0) {
            state.trips = [INITIAL_SWISS_TRIP];
            state.activeTripId = INITIAL_SWISS_TRIP.id;
          }
          let active = state.trips.find((t) => t.id === state.activeTripId);
          if (!active) {
            state.activeTripId = state.trips[0].id;
            active = state.trips[0];
          }
          // 同步便利狀態
          state.config = active.config;
          state.itinerary = active.itinerary;
          state.backlog = active.backlog || [];
          state.modules = active.modules || [];
          state.locations = active.locations;
          state.expenses = active.expenses;
          state.checklist = active.checklist;
          state.accommodations = active.accommodations;
          state.transports = active.transports;
          state.bookmarks = active.bookmarks;
        } catch (e) {
          console.error('Rehydrate error:', e);
        }
      },
    }
  )
);
