import { useTripStore } from './tripStore';
import type { TripPlan, DayItinerary, TimeBlock, TripConfig, BaseInfo, TravelerProfile } from '../types';

/**
 * 取得當前作用中的旅程 (Active Trip)
 */
export function useActiveTrip(): TripPlan {
  return useTripStore((state) => {
    const active = state.trips.find((t) => t.id === state.activeTripId);
    return active || state.trips[0];
  });
}

/** 取得當前旅程日程 */
export function useItinerary(): DayItinerary[] {
  return useTripStore((state) => {
    const active = state.trips.find((t) => t.id === state.activeTripId);
    return active ? active.itinerary : [];
  });
}

/** 取得當前旅程待排景點池 (Backlog) */
export function useBacklog(): TimeBlock[] {
  return useTripStore((state) => {
    const active = state.trips.find((t) => t.id === state.activeTripId);
    return active ? active.backlog || [] : [];
  });
}

/** 取得當前旅程配置 */
export function useConfig(): TripConfig {
  return useTripStore((state) => {
    const active = state.trips.find((t) => t.id === state.activeTripId);
    return active ? active.config : state.config;
  });
}

/** 取得當前旅程旅伴 */
export function useTravelers(): TravelerProfile[] {
  return useTripStore((state) => {
    const active = state.trips.find((t) => t.id === state.activeTripId);
    return active?.config.travelers || [];
  });
}

/** 取得當前旅程住宿基地 */
export function useBases(): BaseInfo[] {
  return useTripStore((state) => {
    const active = state.trips.find((t) => t.id === state.activeTripId);
    return active?.config.bases || [];
  });
}

/** 取得特色模組開關 (例: ['swiss']) */
export function useModules(): string[] {
  return useTripStore((state) => {
    const active = state.trips.find((t) => t.id === state.activeTripId);
    return active?.modules || [];
  });
}
