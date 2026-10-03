import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PersonaTag } from '../types';

export type ItineraryViewMode = 'board' | 'list';
export type AppTheme = 'light' | 'dark' | 'system';

interface UIStoreState {
  selectedBaseId: string; // 'all' 或 base.id
  selectedPersona: PersonaTag | null;
  expandedDays: number[]; // 相容舊版 DayNumber
  expandedDayIds: string[]; // 新版穩定 Day ID 清單
  selectedDayId: string | null; // 手機當前選中日期
  itineraryView: ItineraryViewMode;
  theme: AppTheme;
  displayCurrency: 'CHF' | 'TWD' | 'EUR';
  searchQuery: string;

  // Actions
  setSelectedBaseId: (baseId: string) => void;
  setSelectedPersona: (persona: PersonaTag | null) => void;
  setSelectedDayId: (dayId: string | null) => void;
  setItineraryView: (view: ItineraryViewMode) => void;
  setTheme: (theme: AppTheme) => void;
  toggleDayExpanded: (dayNumberOrId: number | string) => void;
  expandAllDays: (allDayNumbersOrIds: (number | string)[]) => void;
  collapseAllDays: () => void;
  setDisplayCurrency: (currency: 'CHF' | 'TWD' | 'EUR') => void;
  setSearchQuery: (query: string) => void;
}

export const useUIStore = create<UIStoreState>()(
  persist(
    (set) => ({
      selectedBaseId: 'all',
      selectedPersona: null,
      expandedDays: [1],
      expandedDayIds: [],
      selectedDayId: null,
      itineraryView: typeof window !== 'undefined' && window.innerWidth < 1024 ? 'list' : 'board',
      theme: 'light',
      displayCurrency: 'CHF',
      searchQuery: '',

      setSelectedBaseId: (baseId) => set({ selectedBaseId: baseId }),
      setSelectedPersona: (persona) =>
        set((state) => ({
          selectedPersona: state.selectedPersona === persona ? null : persona,
        })),
      setSelectedDayId: (dayId) => set({ selectedDayId: dayId }),
      setItineraryView: (view) => set({ itineraryView: view }),
      setTheme: (theme) => {
        set({ theme });
        if (typeof document !== 'undefined') {
          const isDark =
            theme === 'dark' ||
            (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
          if (isDark) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      },

      toggleDayExpanded: (target) =>
        set((state) => {
          if (typeof target === 'number') {
            const isExpanded = state.expandedDays.includes(target);
            return {
              expandedDays: isExpanded
                ? state.expandedDays.filter((d) => d !== target)
                : [...state.expandedDays, target],
            };
          }
          const isExpanded = state.expandedDayIds.includes(target);
          return {
            expandedDayIds: isExpanded
              ? state.expandedDayIds.filter((id) => id !== target)
              : [...state.expandedDayIds, target],
          };
        }),

      expandAllDays: (targets) =>
        set(() => {
          const numbers = targets.filter((t): t is number => typeof t === 'number');
          const strings = targets.filter((t): t is string => typeof t === 'string');
          return {
            expandedDays: numbers,
            expandedDayIds: strings,
          };
        }),

      collapseAllDays: () => set({ expandedDays: [], expandedDayIds: [] }),
      setDisplayCurrency: (curr) => set({ displayCurrency: curr }),
      setSearchQuery: (query) => set({ searchQuery: query }),
    }),
    {
      name: 'travel-planner-ui-store',
      partialize: (state) => ({
        theme: state.theme,
        itineraryView: state.itineraryView,
        displayCurrency: state.displayCurrency,
      }),
    }
  )
);
