import { create } from 'zustand';
import type { PersonaTag } from '../types';

interface UIStoreState {
  selectedBaseId: string; // 'all' | 'luzern' | 'grindelwald' | 'zermatt' | 'zurich'
  selectedPersona: PersonaTag | null;
  expandedDays: number[]; // 展開的 DayNumber 清單
  displayCurrency: 'CHF' | 'TWD' | 'EUR';
  searchQuery: string;

  // Actions
  setSelectedBaseId: (baseId: string) => void;
  setSelectedPersona: (persona: PersonaTag | null) => void;
  toggleDayExpanded: (dayNumber: number) => void;
  expandAllDays: (allDayNumbers: number[]) => void;
  collapseAllDays: () => void;
  setDisplayCurrency: (currency: 'CHF' | 'TWD' | 'EUR') => void;
  setSearchQuery: (query: string) => void;
}

export const useUIStore = create<UIStoreState>((set) => ({
  selectedBaseId: 'all',
  selectedPersona: null,
  expandedDays: [1], // 預設展開第一天
  displayCurrency: 'CHF',
  searchQuery: '',

  setSelectedBaseId: (baseId) => set({ selectedBaseId: baseId }),
  setSelectedPersona: (persona) => set((state) => ({
    selectedPersona: state.selectedPersona === persona ? null : persona,
  })),

  toggleDayExpanded: (dayNumber) => set((state) => {
    const isExpanded = state.expandedDays.includes(dayNumber);
    return {
      expandedDays: isExpanded
        ? state.expandedDays.filter((d) => d !== dayNumber)
        : [...state.expandedDays, dayNumber],
    };
  }),

  expandAllDays: (allDayNumbers) => set({ expandedDays: allDayNumbers }),
  collapseAllDays: () => set({ expandedDays: [] }),

  setDisplayCurrency: (curr) => set({ displayCurrency: curr }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
