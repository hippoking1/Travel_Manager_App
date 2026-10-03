import type { TripPlan, DayItinerary, TimeBlock } from '../types';
import { parsePeriodLabel, derivePeriod } from '../lib/itinerary';
import { DEFAULT_CURRENCY_CONFIG } from '../utils/currency';

export const BACKUP_KEY_V3 = 'travel-planner-backup-v3';

/**
 * 補全 TimeBlock 欄位 (唯一 ID, startTime, endTime, period)
 */
export function normalizeTimeBlock(block: Partial<TimeBlock>, index = 0): TimeBlock {
  const id = block.id || `tb_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 7)}`;
  const parsed = parsePeriodLabel(block.periodLabel);
  const startTime = block.startTime || parsed.startTime || '09:00';
  const endTime = block.endTime || parsed.endTime || '10:30';
  const period = derivePeriod(startTime);

  return {
    ...block,
    id,
    period,
    periodLabel: block.periodLabel || `${startTime} – ${endTime}`,
    startTime,
    endTime,
    title: block.title || '未命名活動',
    description: block.description || '',
    tags: block.tags || ['senior-friendly'],
  } as TimeBlock;
}

/**
 * 補全 DayItinerary 欄位 (唯一 ID, timeBlocks 規格化)
 */
export function normalizeDayItinerary(day: Partial<DayItinerary>, index = 0): DayItinerary {
  const dayNum = day.day || index + 1;
  const id = day.id || `day_${dayNum}_${Math.random().toString(36).slice(2, 6)}`;
  const timeBlocks = (day.timeBlocks || []).map((b, bIdx) => normalizeTimeBlock(b, bIdx));

  return {
    ...day,
    id,
    day: dayNum,
    baseId: day.baseId || 'luzern',
    title: day.title || `第 ${dayNum} 天 行程`,
    subtitle: day.subtitle || '',
    highlights: day.highlights || [],
    timeBlocks,
    foodNotes: day.foodNotes || [],
    supermarketTips: day.supermarketTips || [],
  } as DayItinerary;
}

/**
 * 規格化單一 TripPlan 物件
 */
export function normalizeTripPlan(trip: Partial<TripPlan>): TripPlan {
  const id = trip.id || `trip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const name = trip.name || trip.config?.tripName || '我的旅行計畫';
  const destination = trip.destination || '旅遊目的地';
  const isSwiss = destination.includes('瑞士') || destination.includes('Switzerland') || name.includes('Swiss');

  const itinerary = (trip.itinerary || []).map((d, idx) => normalizeDayItinerary(d, idx));
  const backlog = (trip.backlog || []).map((b, idx) => normalizeTimeBlock(b, idx));

  return {
    id,
    name,
    destination,
    coverEmoji: trip.coverEmoji || (isSwiss ? '🇨🇭' : '✈️'),
    createdAt: trip.createdAt || new Date().toISOString(),
    updatedAt: trip.updatedAt || new Date().toISOString(),
    config: trip.config || {
      tripName: name,
      subtitle: '',
      startDate: null,
      totalDays: itinerary.length || 5,
      travelers: [],
      bases: [],
      currencies: DEFAULT_CURRENCY_CONFIG,
    },
    itinerary,
    backlog,
    modules: trip.modules || (isSwiss ? ['swiss'] : []),
    locations: trip.locations || [],
    expenses: trip.expenses || [],
    checklist: trip.checklist || [],
    accommodations: trip.accommodations || [],
    transports: trip.transports || [],
    bookmarks: trip.bookmarks || [],
  };
}

/**
 * 升級既有 LocalStorage 資料至 V4
 */
export function migrateToV4(persistedState: any): { trips: TripPlan[]; activeTripId: string } {
  try {
    if (typeof localStorage !== 'undefined') {
      // 備份原始資料
      localStorage.setItem(BACKUP_KEY_V3, JSON.stringify(persistedState));
    }
  } catch (err) {
    console.warn('備份舊版 LocalStorage 失敗:', err);
  }

  if (!persistedState || typeof persistedState !== 'object') {
    return { trips: [], activeTripId: '' };
  }

  let trips: TripPlan[] = [];

  if (Array.isArray(persistedState.trips) && persistedState.trips.length > 0) {
    trips = persistedState.trips.map((t: any) => normalizeTripPlan(t));

    // 若舊版有扁平 activeTrip 狀態且比 trips[activeIdx] 更新，進行資料回寫合併
    const activeId = persistedState.activeTripId || trips[0]?.id;
    const activeIdx = trips.findIndex((t) => t.id === activeId);

    if (activeIdx !== -1) {
      const activeTrip = trips[activeIdx];
      const mergedConfig = persistedState.config ? { ...activeTrip.config, ...persistedState.config } : activeTrip.config;
      const mergedItinerary = (persistedState.itinerary || activeTrip.itinerary).map((d: any, idx: number) =>
        normalizeDayItinerary(d, idx)
      );

      trips[activeIdx] = {
        ...activeTrip,
        config: mergedConfig,
        itinerary: mergedItinerary,
        expenses: persistedState.expenses || activeTrip.expenses,
        checklist: persistedState.checklist || activeTrip.checklist,
        accommodations: persistedState.accommodations || activeTrip.accommodations,
        transports: persistedState.transports || activeTrip.transports,
        locations: persistedState.locations || activeTrip.locations,
        bookmarks: persistedState.bookmarks || activeTrip.bookmarks,
      };
    }
  }

  const activeTripId = persistedState.activeTripId && trips.some((t) => t.id === persistedState.activeTripId)
    ? persistedState.activeTripId
    : trips[0]?.id || '';

  return { trips, activeTripId };
}
