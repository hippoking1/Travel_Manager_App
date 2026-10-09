import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  TripConfig, 
  DayItinerary, 
  MapLocation, 
  ExpenseRecord, 
  ChecklistItem,
  ChecklistCategory,
  FoodNote,
  TimeBlock,
  AccommodationBooking,
  TransportBooking,
  TripPlan,
  CreateTripParams,
  DestinationModule,
  ContainerId,
  BaseInfo
} from '../types';
import { DEMO_ITINERARY } from '../data/demo-itinerary';
import { DEMO_LOCATIONS } from '../data/demo-locations';
import { DEFAULT_CHECKLIST } from '../data/clothing-checklist';
import { DEMO_ACCOMMODATIONS, DEMO_TRANSPORTS } from '../data/demo-bookings';
import { DEFAULT_CURRENCY_CONFIG } from '../utils/currency';
import { syncManager } from '../services/syncManager';
import { fetchFromSheet, mutateSheet, isGasConfigured } from '../services/sheetApi';
import { 
  moveBlock as moveBlockPure, 
  reorderDays as reorderDaysPure, 
  reflowTimes, 
  fitIntoSlot,
  derivePeriod,
  formatTimeSpan
} from '../lib/itinerary';
import { normalizeTripPlan, normalizeDayItinerary, normalizeTimeBlock, migrateToV4 } from './migrations';
import { 
  importToNewTripPlan, 
  mergeImportToExistingPlan, 
  type TripImportV1, 
  type MergeResult 
} from '../lib/tripImport';
import { inferCoordinates, extractAllTripLocations } from '../lib/geo';
import { normalizeDateString } from '../utils/dates';

export interface TripStoreState {
  // 多場旅遊計畫管理 (Multi-Trip Management)
  trips: TripPlan[];
  activeTripId: string;
  switchTrip: (tripId: string) => void;
  createTrip: (params: CreateTripParams) => string;
  deleteTrip: (tripId: string) => void;
  duplicateTrip: (tripId: string) => void;
  importAsNewTrip: (importData: TripImportV1) => string;
  applyImportToActive: (
    importData: TripImportV1,
    mode: 'replace' | 'append',
    opts?: { replaceChecklist?: boolean }
  ) => MergeResult;

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
  addDay: (baseId?: string) => string;
  updateDay: (dayNumberOrId: number | string, updates: Partial<DayItinerary>) => void;
  deleteDay: (dayNumberOrId: number | string, options?: { moveToBacklog?: boolean }) => void;
  addTimeBlock: (dayNumberOrId: number | string, block: Omit<TimeBlock, 'id'> | TimeBlock) => void;
  updateTimeBlock: (dayNumber: number, blockIndex: number, updates: Partial<TimeBlock>) => void;
  deleteTimeBlock: (dayNumber: number, blockIndex: number) => void;
  updateTimeBlockById: (blockId: string, updates: Partial<TimeBlock>) => void;
  deleteTimeBlockById: (blockId: string) => void;
  addBacklogItem: (block: Omit<TimeBlock, 'id'> | TimeBlock) => void;
  deleteBacklogItem: (blockId: string) => void;
  resetItineraryToDemo: () => void;
  undo: () => void;

  // 景點區域 / 基地管理 Actions
  addBase: (nameZh: string, nameEn?: string, extra?: Partial<BaseInfo>) => string;
  deleteBase: (baseId: string) => void;
  updateBase: (baseId: string, updates: Partial<BaseInfo>) => void;

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
  pushActiveTripToSheets: () => Promise<{ success: boolean; message?: string; stats?: any; error?: string }>;
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
      id: 'backlog-chillon',
      baseId: 'lucerne',
      period: 'afternoon',
      title: '西庸古堡 (Château de Chillon) 湖畔遊',
      description: '日內瓦湖畔歷史古堡，STP 可免費入場，可搭配雷夢湖遊船放鬆。',
      locationName: 'Château de Chillon',
      category: 'culture',
      tags: ['senior-friendly', 'scenic-train'],
    },
    {
      id: 'backlog-verkehrshaus',
      baseId: 'lucerne',
      period: 'morning',
      title: '瑞士交通博物館 (Verkehrshaus)',
      description: '琉森湖畔超人氣全家互動博物館，火車、纜車與太空船體驗豐富。',
      locationName: 'Verkehrshaus der Schweiz, Luzern',
      category: 'attraction',
      tags: ['kids-highlight', 'senior-friendly'],
    },
    {
      id: 'backlog-blausee',
      baseId: 'grindelwald',
      period: 'morning',
      title: '藍湖 (Blausee) 自然公園秘境漫步',
      description: '湖水如水晶般清澈純淨，水底鱒魚悠游，若有額外半天空檔可彈性安插此處野餐。',
      locationName: 'Blausee Nature Park',
      category: 'attraction',
      tags: ['senior-friendly', 'kids-highlight'],
    },
    {
      id: 'backlog-pfingstegg',
      baseId: 'grindelwald',
      period: 'afternoon',
      title: '普芬斯泰格 (Pfingstegg) 景觀飛天雪橇',
      description: '俯瞰格林德瓦山谷之絕美飛行體驗，夏季滑道適合親子同樂。',
      locationName: 'Pfingstegg, Grindelwald',
      category: 'peak',
      tags: ['kids-highlight'],
    },
    {
      id: 'backlog-gorner-gorge',
      baseId: 'zermatt',
      period: 'morning',
      title: '高納葛拉特峽谷 (Gorner Gorge) 木棧道',
      description: '策馬特近郊壯麗冰川峽谷，沿峭壁木棧道步行約45分鐘，親近大自然。',
      locationName: 'Gorner Gorge, Zermatt',
      category: 'attraction',
      tags: ['senior-friendly'],
    },
    {
      id: 'backlog-lindt',
      baseId: 'zurich',
      period: 'afternoon',
      title: '瑞士蓮巧克力之家 (Lindt Home of Chocolate)',
      description: '巨大巧克力噴泉與DIY工坊，全家採買瑞士代表伴手禮最佳去處。',
      locationName: 'Lindt Home of Chocolate, Kilchberg',
      category: 'shopping',
      tags: ['kids-highlight', 'budget-shopping'],
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
        if (isGasConfigured()) {
          mutateSheet('All', 'DELETE_TRIP', { id: tripId }, tripId).catch((err) => {
            console.error('刪除雲端試算表旅程失敗:', err);
          });
        }
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

      importAsNewTrip: (importData) => {
        const { plan } = importToNewTripPlan(importData);
        const normalized = normalizeTripPlan(plan);
        set((state) => ({
          trips: [...state.trips, normalized],
          activeTripId: normalized.id,
          config: normalized.config,
          itinerary: normalized.itinerary,
          backlog: normalized.backlog,
          modules: normalized.modules,
          locations: normalized.locations,
          expenses: normalized.expenses,
          checklist: normalized.checklist,
          accommodations: normalized.accommodations,
          transports: normalized.transports,
          bookmarks: normalized.bookmarks,
        }));

        // 若已綁定 Google Sheets，立即在背景將新旅程發布至雲端試算表
        if (isGasConfigured()) {
          setTimeout(() => {
            get().pushActiveTripToSheets();
          }, 300);
        }

        return normalized.id;
      },

      applyImportToActive: (importData, mode, opts) => {
        const state = get();
        const currentPlan = state.trips.find((t) => t.id === state.activeTripId) || {
          id: state.activeTripId,
          name: state.config.tripName,
          destination: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          config: state.config,
          itinerary: state.itinerary,
          backlog: state.backlog,
          modules: state.modules,
          locations: state.locations,
          expenses: state.expenses,
          checklist: state.checklist,
          accommodations: state.accommodations,
          transports: state.transports,
          bookmarks: state.bookmarks,
        };

        const result = mergeImportToExistingPlan(currentPlan, importData, mode, opts);
        const normalized = normalizeTripPlan(result.updatedPlan);

        set((currentState) => {
          const nextTrips = currentState.trips.map((t) =>
            t.id === normalized.id ? normalized : t
          );
          return {
            trips: nextTrips,
            config: normalized.config,
            itinerary: normalized.itinerary,
            backlog: normalized.backlog,
            modules: normalized.modules,
            locations: normalized.locations,
            expenses: normalized.expenses,
            checklist: normalized.checklist,
            accommodations: normalized.accommodations,
            transports: normalized.transports,
            bookmarks: normalized.bookmarks,
          };
        });

        // 若已綁定 Google Sheets，立即在背景發布更新至雲端試算表
        if (isGasConfigured()) {
          setTimeout(() => {
            get().pushActiveTripToSheets();
          }, 300);
        }

        return result;
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
        let createdDayId = '';
        set((state) =>
          mutateActive(state, (active) => {
            const nextDayNum = active.itinerary.length + 1;
            const chosenBase = baseId || active.config.bases[0]?.id || 'base-main';
            createdDayId = `day_${nextDayNum}_${Math.random().toString(36).slice(2, 6)}`;
            const newDay: DayItinerary = {
              id: createdDayId,
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
        return createdDayId;
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

      deleteDay: (dayNumberOrId, options) => {
        set((state) =>
          mutateActive(state, (active) => {
            if (active.itinerary.length <= 1) {
              return {};
            }

            const targetDay = active.itinerary.find(
              (d) => d.day === dayNumberOrId || d.id === dayNumberOrId
            );

            let nextBacklog = active.backlog || [];

            if (options?.moveToBacklog && targetDay && targetDay.timeBlocks.length > 0) {
              const transferred: TimeBlock[] = targetDay.timeBlocks.map((b) => ({
                ...b,
                id: b.id?.startsWith('backlog-')
                  ? b.id
                  : `backlog-${b.id || Math.random().toString(36).slice(2, 7)}`,
                baseId: b.baseId || targetDay.baseId,
                startTime: undefined,
                endTime: undefined,
                period: 'morning',
                periodLabel: undefined,
              }));
              nextBacklog = [...nextBacklog, ...transferred];
            }

            const filtered = active.itinerary
              .filter((d) => d.day !== dayNumberOrId && d.id !== dayNumberOrId)
              .map((d, idx) => ({ ...d, day: idx + 1 }));

            return {
              itinerary: filtered,
              backlog: nextBacklog,
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
            const targetDay = active.itinerary.find(
              (d) => d.day === dayNumberOrId || d.id === dayNumberOrId
            );
            const blockWithBase = {
              ...normalized,
              baseId: normalized.baseId || targetDay?.baseId || undefined,
            };
            const nextItinerary = active.itinerary.map((d) => {
              if (d.day === dayNumberOrId || d.id === dayNumberOrId) {
                const blocks = [...d.timeBlocks, blockWithBase];
                return {
                  ...d,
                  timeBlocks: fitIntoSlot(blocks, blocks.length - 1),
                };
              }
              return d;
            });

            const nextLocations = extractAllTripLocations({
              ...active,
              itinerary: nextItinerary,
            });

            return { itinerary: nextItinerary, locations: nextLocations };
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

            const nextLocations = extractAllTripLocations({
              ...active,
              itinerary: nextItinerary,
            });

            return { itinerary: nextItinerary, locations: nextLocations };
          })
        );
      },

      deleteTimeBlock: (dayNumber, blockIndex) => {
        set((state) =>
          mutateActive(state, (active) => {
            const nextItinerary = active.itinerary.map((d) => {
              if (d.day === dayNumber) {
                return {
                  ...d,
                  timeBlocks: d.timeBlocks.filter((_, idx) => idx !== blockIndex),
                };
              }
              return d;
            });

            const nextLocations = extractAllTripLocations({
              ...active,
              itinerary: nextItinerary,
            });

            return { itinerary: nextItinerary, locations: nextLocations };
          })
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

            let nextBacklog = active.backlog || [];
            if (!foundInDay) {
              nextBacklog = nextBacklog.map((b) =>
                b.id === blockId ? { ...b, ...updates } : b
              );
            }

            const nextLocations = extractAllTripLocations({
              ...active,
              itinerary: nextItinerary,
              backlog: nextBacklog,
            });

            return {
              itinerary: nextItinerary,
              backlog: nextBacklog,
              locations: nextLocations,
            };
          })
        );
      },

      deleteTimeBlockById: (blockId) => {
        set((state) =>
          mutateActive(state, (active) => {
            const nextItinerary = active.itinerary.map((day) => ({
              ...day,
              timeBlocks: day.timeBlocks.filter((b) => b.id !== blockId),
            }));
            const nextBacklog = (active.backlog || []).filter((b) => b.id !== blockId);
            const nextLocations = extractAllTripLocations({
              ...active,
              itinerary: nextItinerary,
              backlog: nextBacklog,
            });
            return {
              itinerary: nextItinerary,
              backlog: nextBacklog,
              locations: nextLocations,
            };
          })
        );
      },

      addBacklogItem: (block) => {
        set((state) =>
          mutateActive(state, (active) => {
            const normalized = normalizeTimeBlock(block);
            const nextBacklog = [normalized, ...(active.backlog || [])];
            const nextLocations = extractAllTripLocations({
              ...active,
              backlog: nextBacklog,
            });
            return {
              backlog: nextBacklog,
              locations: nextLocations,
            };
          })
        );
      },

      deleteBacklogItem: (blockId) => {
        set((state) =>
          mutateActive(state, (active) => {
            const nextBacklog = (active.backlog || []).filter((b) => b.id !== blockId);
            const nextLocations = extractAllTripLocations({
              ...active,
              backlog: nextBacklog,
            });
            return {
              backlog: nextBacklog,
              locations: nextLocations,
            };
          })
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

      // 景點區域 / 基地管理 Actions
      addBase: (nameZh, nameEn, extra) => {
        const id = extra?.id || `base_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const trimmedZh = nameZh.trim();
        const trimmedEn = (nameEn || trimmedZh).trim();
        const coords = extra?.coordinates || inferCoordinates(trimmedZh, trimmedEn);

        const colors = ['#0EA5E9', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#6366F1'];
        const newBase: BaseInfo = {
          id,
          name: trimmedEn,
          nameZh: trimmedZh,
          days: extra?.days || [],
          color: extra?.color || colors[Math.floor(Math.random() * colors.length)],
          hotelName: extra?.hotelName || `${trimmedZh} 住宿飯店`,
          coordinates: coords,
          notes: extra?.notes,
        };

        set((state) =>
          mutateActive(state, (active) => {
            const nextBases = [...(active.config.bases || []), newBase];
            return {
              config: {
                ...active.config,
                bases: nextBases,
              },
            };
          })
        );
        return id;
      },

      deleteBase: (baseId) => {
        set((state) =>
          mutateActive(state, (active) => {
            const nextBases = (active.config.bases || []).filter((b) => b.id !== baseId);
            // 清理行程天數與待排池中已刪除之 baseId 關聯
            const nextItinerary = active.itinerary.map((d) =>
              d.baseId === baseId ? { ...d, baseId: '' } : d
            );
            const nextBacklog = active.backlog.map((b) =>
              b.baseId === baseId ? { ...b, baseId: undefined } : b
            );
            return {
              config: {
                ...active.config,
                bases: nextBases,
              },
              itinerary: nextItinerary,
              backlog: nextBacklog,
            };
          })
        );
      },

      updateBase: (baseId, updates) => {
        set((state) =>
          mutateActive(state, (active) => {
            const nextBases = (active.config.bases || []).map((b) =>
              b.id === baseId ? { ...b, ...updates } : b
            );
            return {
              config: {
                ...active.config,
                bases: nextBases,
              },
            };
          })
        );
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
          // 不傳入 tripId，拉取雲端全部工作表資料以實現跨裝置旅程發現與全量同步
          const res = await fetchFromSheet<Record<string, any[]>>();
          if (!res.success || !res.data) {
            console.warn('拉取 Google Sheets 資料失敗或為空:', res.error);
            return false;
          }

          const remoteData = res.data;
          const allConfigs = Array.isArray(remoteData.TripConfig) ? remoteData.TripConfig : [];
          const allItinerary = Array.isArray(remoteData.Itinerary) ? remoteData.Itinerary : [];
          const allAccommodations = Array.isArray(remoteData.Accommodations) ? remoteData.Accommodations : [];
          const allTransports = Array.isArray(remoteData.Transports) ? remoteData.Transports : [];
          const allChecklist = Array.isArray(remoteData.Checklist) ? remoteData.Checklist : [];
          const allExpenses = Array.isArray(remoteData.Expenses) ? remoteData.Expenses : [];
          const allBookmarks = Array.isArray(remoteData.Bookmarks) ? remoteData.Bookmarks : [];
          const allLocations = Array.isArray(remoteData.Locations) ? remoteData.Locations : [];

          // 收集雲端試算表中出現的所有 tripId
          const remoteTripIds = Array.from(
            new Set(
              [
                ...allConfigs.map((r: any) => r.tripId),
                ...allItinerary.map((r: any) => r.tripId),
                ...allAccommodations.map((r: any) => r.tripId),
                ...allTransports.map((r: any) => r.tripId),
                ...allChecklist.map((r: any) => r.tripId),
                ...allExpenses.map((r: any) => r.tripId),
                ...allBookmarks.map((r: any) => r.tripId),
                ...allLocations.map((r: any) => r.tripId),
              ].filter(Boolean)
            )
          );

          // 判斷雲端是否有任何資料
          const hasAnyData =
            allConfigs.length > 0 ||
            allItinerary.length > 0 ||
            allAccommodations.length > 0 ||
            allTransports.length > 0 ||
            allChecklist.length > 0 ||
            allExpenses.length > 0 ||
            allLocations.length > 0 ||
            allBookmarks.length > 0;

          if (!hasAnyData) {
            console.log('Google 試算表目前為空，無資料可同步。');
            return true;
          }

          set((state) => {
            const currentActiveId = state.activeTripId;
            let targetTripId = currentActiveId;

            // 若當前裝置的 activeTripId 在雲端找不到，但雲端有別的旅程（例如手機讀取電腦端 AI 匯入的旅程）
            if (remoteTripIds.length > 0 && !remoteTripIds.includes(currentActiveId)) {
              // 優先切換至雲端的第一個旅程
              targetTripId = remoteTripIds[0];
            }

            // 輔助函式：針對單一 tripId 重構完整 TripPlan
            function buildTripPlanFromRemote(tId: string, baseTrip?: TripPlan): TripPlan {
              const isMatch = (r: any) => !r.tripId || String(r.tripId) === String(tId);

              const tripConfigs = allConfigs.filter(isMatch);
              const tripItinerary = allItinerary.filter(isMatch);
              const tripAccommodations = allAccommodations.filter(isMatch);
              const tripTransports = allTransports.filter(isMatch);
              const tripChecklist = allChecklist.filter(isMatch);
              const tripExpenses = allExpenses.filter(isMatch);
              const tripBookmarks = allBookmarks.filter(isMatch);
              const tripLocations = allLocations.filter(isMatch);

              const configMap: Record<string, any> = {};
              tripConfigs.forEach((c: any) => {
                if (c.key) configMap[c.key] = c.value;
              });

              const basePlan = baseTrip || state.trips.find((t) => t.id === tId) || INITIAL_SWISS_TRIP;
              const name = configMap.tripName || basePlan.name || '雲端同步旅程';
              const destination = configMap.destination || basePlan.destination || '';
              const startDate = configMap.startDate ? normalizeDateString(configMap.startDate) : (basePlan.config?.startDate || null);
              const primaryCurrency = configMap.primaryCurrency || basePlan.config?.currencies?.primary || 'TWD';

              // 解析 bases (自訂住宿基地)
              let bases = basePlan.config?.bases || [];
              if (configMap.basesJson) {
                try {
                  const parsedBases = JSON.parse(configMap.basesJson);
                  if (Array.isArray(parsedBases) && parsedBases.length > 0) {
                    bases = parsedBases;
                  }
                } catch (e) {
                  console.warn('解析 basesJson 失敗:', e);
                }
              }

              // 解析 backlog (待排景點池)
              let backlog: TimeBlock[] = basePlan.backlog || [];
              if (configMap.backlogJson) {
                try {
                  const parsedBacklog = JSON.parse(configMap.backlogJson);
                  if (Array.isArray(parsedBacklog)) {
                    backlog = parsedBacklog.map((b: any, idx: number) => normalizeTimeBlock(b, idx));
                  }
                } catch (e) {
                  console.warn('解析 backlogJson 失敗:', e);
                }
              }

              // 解析 Itinerary (日程景點，依 day 精確去重，杜絕重複行與 64 天問題)
              let itinerary: DayItinerary[] = basePlan.itinerary || [];
              if (tripItinerary.length > 0) {
                const dayMap = new Map<number, DayItinerary>();

                tripItinerary.forEach((row: any) => {
                  const dNum = Number(row.day);
                  if (!dNum || isNaN(dNum)) return;

                  let timeBlocks: TimeBlock[] = [];
                  try {
                    if (typeof row.timeBlocksJson === 'string' && row.timeBlocksJson.trim()) {
                      timeBlocks = JSON.parse(row.timeBlocksJson);
                    } else if (Array.isArray(row.timeBlocks)) {
                      timeBlocks = row.timeBlocks;
                    }
                  } catch (e) {
                    console.warn('解析 timeBlocksJson 失敗:', e);
                  }

                  let foodNotes: FoodNote[] = [];
                  try {
                    let rawFoodNotes: any[] = [];
                    if (typeof row.foodNotesJson === 'string' && row.foodNotesJson.trim()) {
                      rawFoodNotes = JSON.parse(row.foodNotesJson);
                    } else if (Array.isArray(row.foodNotes)) {
                      rawFoodNotes = row.foodNotes;
                    }
                    if (Array.isArray(rawFoodNotes)) {
                      foodNotes = rawFoodNotes.map((fn: any) => {
                        if (typeof fn === 'string') {
                          return {
                            meal: 'lunch' as const,
                            mealLabel: '推薦用餐',
                            suggestion: fn,
                            type: 'restaurant' as const,
                          };
                        }
                        return fn as FoodNote;
                      });
                    }
                  } catch (e) {
                    console.warn('解析 foodNotesJson 失敗:', e);
                  }

                  const highlights = typeof row.highlights === 'string'
                    ? row.highlights.split(';').map((s: string) => s.trim()).filter(Boolean)
                    : Array.isArray(row.highlights) ? row.highlights : [];

                  const parsedDay = normalizeDayItinerary({
                    id: String(row.dayId || `day_${row.day}`),
                    day: dNum,
                    baseId: String(row.baseId || ''),
                    title: String(row.title || `第 ${row.day} 天`),
                    subtitle: String(row.subtitle || ''),
                    highlights,
                    timeBlocks,
                    foodNotes,
                  });

                  const existing = dayMap.get(dNum);
                  // 優先保留具有完整活動列表的紀錄
                  if (!existing || (parsedDay.timeBlocks.length > 0 && existing.timeBlocks.length === 0)) {
                    dayMap.set(dNum, parsedDay);
                  }
                });

                if (dayMap.size > 0) {
                  itinerary = Array.from(dayMap.values()).sort((a, b) => a.day - b.day);
                }
              }

              // 解析 Accommodations (住宿預訂)
              let accommodations: AccommodationBooking[] = basePlan.accommodations || [];
              if (tripAccommodations.length > 0) {
                accommodations = tripAccommodations.map((acc: any) => ({
                  id: String(acc.id || `acc_${Date.now()}`),
                  baseId: String(acc.baseId || ''),
                  baseNameZh: String(acc.baseNameZh || ''),
                  hotelName: String(acc.hotelName || ''),
                  roomType: String(acc.roomType || ''),
                  checkInDate: normalizeDateString(acc.checkInDate),
                  checkOutDate: normalizeDateString(acc.checkOutDate),
                  nights: Number(acc.nights) || 1,
                  bookingPlatform: String(acc.bookingPlatform || ''),
                  confirmationCode: String(acc.confirmationCode || ''),
                  totalPrice: Number(acc.totalPrice) || 0,
                  currency: String(acc.currency || 'TWD'),
                  paymentStatus: (acc.paymentStatus || 'confirmed') as any,
                  paymentStatusLabel: String(acc.paymentStatusLabel || '已確認'),
                  address: String(acc.address || ''),
                  contactPhone: acc.contactPhone ? String(acc.contactPhone) : undefined,
                  googleMapsUrl: acc.googleMapsUrl ? String(acc.googleMapsUrl) : undefined,
                  checkInTimeNotice: String(acc.checkInTimeNotice || ''),
                  keyPickupNotice: String(acc.keyPickupNotice || ''),
                  garbageRulesNotice: String(acc.garbageRulesNotice || ''),
                  kitchenRulesNotice: String(acc.kitchenRulesNotice || ''),
                  notes: String(acc.notes || ''),
                }));
              }

              // 解析 Transports (交通預訂)
              let transports: TransportBooking[] = basePlan.transports || [];
              if (tripTransports.length > 0) {
                transports = tripTransports.map((tra: any) => ({
                  id: String(tra.id || `tra_${Date.now()}`),
                  category: (tra.category || 'scenic_train') as any,
                  categoryLabel: String(tra.categoryLabel || '交通'),
                  title: String(tra.title || ''),
                  routeFrom: String(tra.routeFrom || ''),
                  routeTo: String(tra.routeTo || ''),
                  departureTime: String(tra.departureTime || ''),
                  arrivalTime: tra.arrivalTime ? String(tra.arrivalTime) : undefined,
                  operatorNumber: String(tra.operatorNumber || ''),
                  bookingReference: String(tra.bookingReference || ''),
                  seatsInfo: tra.seatsInfo ? String(tra.seatsInfo) : undefined,
                  ticketType: String(tra.ticketType || ''),
                  totalPrice: tra.totalPrice ? Number(tra.totalPrice) : undefined,
                  currency: tra.currency ? String(tra.currency) : undefined,
                  platformNotice: String(tra.platformNotice || ''),
                  luggageNotice: String(tra.luggageNotice || ''),
                  boardingNotice: String(tra.boardingNotice || ''),
                  notes: String(tra.notes || ''),
                }));
              }

              // 解析 Checklist (清單)
              let checklist: ChecklistItem[] = basePlan.checklist || [];
              if (tripChecklist.length > 0) {
                checklist = tripChecklist.map((chk: any) => ({
                  id: String(chk.id || `chk_${Date.now()}`),
                  category: (chk.category as ChecklistCategory) || 'clothing',
                  categoryLabel: String(chk.categoryLabel || '行前清單'),
                  item: String(chk.item || ''),
                  checked: chk.checked === true || chk.checked === 'TRUE' || chk.checked === 'true',
                  priority: (chk.priority || 'medium') as any,
                  assignedTo: chk.assignedTo ? String(chk.assignedTo) : undefined,
                  altitudeRange: chk.altitudeRange ? String(chk.altitudeRange) : undefined,
                }));
              }

              // 解析 Expenses (花費)
              let expenses: ExpenseRecord[] = basePlan.expenses || [];
              if (tripExpenses.length > 0) {
                expenses = tripExpenses.map((exp: any) => ({
                  id: String(exp.id || Math.random()),
                  timestamp: String(exp.timestamp || new Date().toISOString()),
                  dayNumber: exp.dayNumber ? Number(exp.dayNumber) : undefined,
                  category: exp.category || 'other',
                  amount: Number(exp.amount) || 0,
                  currency: String(exp.currency || primaryCurrency || 'TWD'),
                  note: String(exp.note || ''),
                  paidBy: exp.paidBy ? String(exp.paidBy) : undefined,
                }));
              }

              // 解析 Bookmarks
              const bookmarks = tripBookmarks.map((b: any) => String(b.locationId || b.id)).filter(Boolean);

              const totalDays = configMap.totalDays
                ? Number(configMap.totalDays)
                : itinerary.length > 0
                ? itinerary.length
                : basePlan.config?.totalDays || 1;

              const plan = normalizeTripPlan({
                id: tId,
                name,
                destination,
                coverEmoji: basePlan.coverEmoji || (destination.includes('瑞士') ? '🇨🇭' : '✈️'),
                createdAt: basePlan.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                config: {
                  ...basePlan.config,
                  tripName: name,
                  startDate,
                  totalDays,
                  bases,
                  currencies: {
                    ...basePlan.config?.currencies,
                    primary: primaryCurrency,
                  },
                },
                itinerary,
                backlog,
                accommodations,
                transports,
                checklist,
                expenses,
                bookmarks: bookmarks.length > 0 ? bookmarks : basePlan.bookmarks || [],
              });

              // 地圖點位：結合試算表儲存的 Locations 與行程景點抽取的 Locations
              let remoteLocs: MapLocation[] = [];
              if (tripLocations.length > 0) {
                remoteLocs = tripLocations.map((loc: any) => {
                  const lat = Number(loc.lat) || (Array.isArray(loc.coordinates) ? loc.coordinates[0] : 0);
                  const lng = Number(loc.lng) || (Array.isArray(loc.coordinates) ? loc.coordinates[1] : 0);
                  return {
                    id: String(loc.id || `loc_${Date.now()}`),
                    name: String(loc.name || ''),
                    nameZh: String(loc.nameZh || loc.name || ''),
                    coordinates: [lat, lng] as [number, number],
                    category: loc.category || 'viewpoint',
                    altitude: loc.altitude ? Number(loc.altitude) : undefined,
                    description: String(loc.description || ''),
                    dayNumbers: typeof loc.dayNumbers === 'string'
                      ? loc.dayNumbers.split(',').map((n: string) => Number(n.trim())).filter(Boolean)
                      : Array.isArray(loc.dayNumbers) ? loc.dayNumbers : [],
                    stpNote: loc.stpNote ? String(loc.stpNote) : undefined,
                    googleMapsUrl: loc.googleMapsUrl ? String(loc.googleMapsUrl) : undefined,
                    address: loc.address ? String(loc.address) : undefined,
                  };
                }).filter((l: any) => l.name || l.nameZh);
              }

              const extractedLocs = extractAllTripLocations(plan);
              const locMap = new Map<string, MapLocation>();
              remoteLocs.forEach(l => locMap.set(l.nameZh || l.name, l));
              extractedLocs.forEach(l => {
                const key = l.nameZh || l.name;
                if (!locMap.has(key)) {
                  locMap.set(key, l);
                }
              });
              plan.locations = Array.from(locMap.values());

              return plan;
            }

            // 雲端同步模式：以雲端識別的 trips 構建有效旅程清單，自動掃除已被雲端刪除的孤兒/同名副本
            let nextTrips: TripPlan[] = [];

            if (remoteTripIds.length > 0) {
              // 1. 先構建所有雲端真實存在的 trips
              nextTrips = remoteTripIds.map((tId) => {
                const existing = state.trips.find((t) => t.id === tId);
                return buildTripPlanFromRemote(tId, existing);
              });

              // 2. 檢查本地端是否有「未同步且非重複」的全新草稿（例如本地剛點擊「+ 新旅程」建立且名字與雲端不衝突者）
              state.trips.forEach((localTrip) => {
                const isRemote = remoteTripIds.includes(localTrip.id);
                const isDuplicateName = nextTrips.some(
                  (rt) => rt.name.trim() === localTrip.name.trim() && localTrip.name.trim().length > 0
                );
                // 排除已在雲端刪除之同名副本或無效舊資料
                if (!isRemote && !isDuplicateName && localTrip.id !== DEFAULT_SWISS_TRIP_ID) {
                  nextTrips.push(localTrip);
                }
              });
            } else {
              // 雲端無明確 ID 標籤時，更新當前 targetTripId
              const existingIdx = state.trips.findIndex((t) => t.id === targetTripId);
              const built = buildTripPlanFromRemote(targetTripId, existingIdx !== -1 ? state.trips[existingIdx] : undefined);
              nextTrips = [...state.trips];
              if (existingIdx !== -1) {
                nextTrips[existingIdx] = built;
              } else {
                nextTrips.push(built);
              }
            }

            const activePlan = nextTrips.find((t) => t.id === targetTripId) || nextTrips[0];

            return {
              trips: nextTrips,
              activeTripId: activePlan.id,
              config: activePlan.config,
              itinerary: activePlan.itinerary,
              backlog: activePlan.backlog || [],
              modules: activePlan.modules || [],
              locations: activePlan.locations || [],
              expenses: activePlan.expenses,
              checklist: activePlan.checklist,
              accommodations: activePlan.accommodations,
              transports: activePlan.transports,
              bookmarks: activePlan.bookmarks || [],
            };
          });

          return true;
        } catch (err) {
          console.error('拉取 Google Sheets 資料失敗:', err);
        } finally {
          set({ isFetchingRemote: false });
        }
        return false;
      },

      pushActiveTripToSheets: async () => {
        if (!isGasConfigured()) {
          return {
            success: false,
            error: '尚未設定 Google Apps Script Web App URL，請先至【設定 ➔ 雲端同步】填寫部署網址。',
          };
        }

        set({ isFetchingRemote: true });

        try {
          const state = get();
          const targetTrip = state.trips.find((t) => t.id === state.activeTripId);
          const baseTripObj = targetTrip || {
            id: state.activeTripId,
            name: state.config.tripName,
            destination: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            config: state.config,
            itinerary: state.itinerary,
            backlog: state.backlog,
            modules: state.modules,
            locations: state.locations,
            expenses: state.expenses,
            checklist: state.checklist,
            accommodations: state.accommodations,
            transports: state.transports,
            bookmarks: state.bookmarks,
          };

          // 重新萃取最新點位 (包含每日行程活動、待排景點池與真實住宿)，確保 Google Sheets 的 Locations 分頁獲得完整更新
          const freshLocations = extractAllTripLocations({
            ...baseTripObj,
            config: state.config,
            itinerary: state.itinerary,
            backlog: state.backlog,
            accommodations: state.accommodations,
          });

          // 扁平化附加 lat, lng 以相容 Google 試算表欄位
          const serializedLocations = freshLocations.map((loc) => ({
            ...loc,
            lat: loc.coordinates ? loc.coordinates[0] : undefined,
            lng: loc.coordinates ? loc.coordinates[1] : undefined,
          }));

          const activeTrip: TripPlan = {
            ...baseTripObj,
            config: state.config,
            itinerary: state.itinerary,
            backlog: state.backlog,
            accommodations: state.accommodations,
            transports: state.transports,
            checklist: state.checklist,
            expenses: state.expenses,
            locations: serializedLocations,
          };

          // 一次性將整份旅程打包發送給 Google Apps Script (BATCH_SYNC_TRIP)
          const res = await mutateSheet('All', 'BATCH_SYNC_TRIP', { tripData: activeTrip }, activeTrip.id);

          if (res.success) {
            const nowIso = new Date().toISOString();
            localStorage.setItem('travel_last_synced_time', nowIso);
            // 本地 store 同步更新為 freshLocations
            set((curr) =>
              mutateActive(curr, () => ({
                locations: freshLocations,
              }))
            );
            // 觸發 syncManager 狀態更新
            syncManager.flushQueue();

            return {
              success: true,
              message: res.message || '已成功將整份行程、景點、住宿、交通與清單發布至 Google 試算表！',
              stats: res.stats,
            };
          } else {
            throw new Error(res.error || 'Google 試算表寫入失敗');
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error('全量推播至 Google Sheets 失敗:', msg);
          return { success: false, error: msg };
        } finally {
          set({ isFetchingRemote: false });
        }
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
