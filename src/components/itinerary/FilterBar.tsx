import React from 'react';
import { Search, LayoutGrid, ListFilter, X } from 'lucide-react';
import { useConfig, useBases, useItinerary } from '../../stores/selectors';
import { useUIStore, type ItineraryViewMode } from '../../stores/uiStore';
import { PersonaBadge } from '../shared/PersonaBadge';
import { PERSONA_CONFIG, type PersonaTag } from '../../types';
import { SegmentedControl } from '../ui/SegmentedControl';

export const FilterBar: React.FC = () => {
  const config = useConfig();
  const bases = useBases();
  const itinerary = useItinerary();
  const { 
    selectedBaseId, 
    setSelectedBaseId, 
    selectedPersona, 
    setSelectedPersona, 
    searchQuery, 
    setSearchQuery,
    itineraryView,
    setItineraryView
  } = useUIStore();

  const isAnyFilterActive = selectedBaseId !== 'all' || selectedPersona !== null || !!searchQuery.trim();

  const clearAllFilters = () => {
    setSelectedBaseId('all');
    setSelectedPersona(null);
    setSearchQuery('');
  };

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-3xl p-4 sm:p-5 mb-6 shadow-xs space-y-3.5">
      {/* 上排：住宿基地切換 + 檢視模式切換 (列表 | 看板) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider shrink-0 mr-1 hidden md:inline">
            景點區域：
          </span>
          <button
            type="button"
            onClick={() => setSelectedBaseId('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              selectedBaseId === 'all'
                ? 'bg-teal-700 dark:bg-teal-500 text-white dark:text-stone-950 shadow-xs'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            全部天數 (D1–{itinerary.length || config.totalDays || 1})
          </button>

          {bases.map((base) => {
            const isSelected = selectedBaseId === base.id;
            const baseDays = itinerary.filter((d) => d.baseId === base.id).map((d) => d.day);
            const dayRangeText =
              baseDays.length === 0
                ? ''
                : baseDays.length === 1
                ? `(D${baseDays[0]})`
                : `(D${baseDays[0]}–D${baseDays[baseDays.length - 1]})`;

            return (
              <button
                key={base.id}
                type="button"
                onClick={() => setSelectedBaseId(base.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 border cursor-pointer ${
                  isSelected
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 ring-2'
                    : 'bg-stone-100/80 dark:bg-stone-800/80 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-800 hover:text-stone-900'
                }`}
                style={{
                  borderColor: isSelected ? base.color : undefined,
                  boxShadow: isSelected ? `0 0 0 1px ${base.color}` : undefined,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: base.color }}
                />
                <span>{base.nameZh}</span>
                {dayRangeText && (
                  <span className="text-[10px] opacity-75 font-mono">{dayRangeText}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* 檢視切換：列表 | 看板 */}
        <div className="shrink-0 flex items-center gap-2">
          <SegmentedControl<ItineraryViewMode>
            size="sm"
            value={itineraryView}
            onChange={(val) => setItineraryView(val)}
            options={[
              { value: 'board', label: '看板模式', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
              { value: 'list', label: '時間軸', icon: <ListFilter className="w-3.5 h-3.5" /> },
            ]}
          />
        </div>
      </div>

      {/* 下排：角色標籤過濾 + 關鍵字搜尋 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-stone-100 dark:border-stone-800">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider shrink-0 mr-1 hidden md:inline">
            角色標籤：
          </span>
          {(Object.keys(PERSONA_CONFIG) as PersonaTag[]).map((tag) => (
            <PersonaBadge
              key={tag}
              tag={tag}
              size="sm"
              active={selectedPersona === tag}
              onClick={() => setSelectedPersona(tag)}
            />
          ))}

          {isAnyFilterActive && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs text-teal-700 dark:text-teal-400 hover:underline ml-2 shrink-0 font-medium cursor-pointer"
            >
              清除所有篩選
            </button>
          )}
        </div>

        {/* 關鍵字搜尋輸入框 */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜尋活動、火車、景點..."
            className="w-full bg-stone-100/80 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl pl-8 pr-7 py-1.5 text-xs sm:text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-xs cursor-pointer p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
