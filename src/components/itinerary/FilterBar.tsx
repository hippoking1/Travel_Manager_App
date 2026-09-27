import React from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { useTripStore } from '../../stores/tripStore';
import { useUIStore } from '../../stores/uiStore';
import { PersonaBadge } from '../shared/PersonaBadge';
import { PERSONA_CONFIG, type PersonaTag } from '../../types';

export const FilterBar: React.FC = () => {
  const { config, itinerary } = useTripStore();
  const { 
    selectedBaseId, 
    setSelectedBaseId, 
    selectedPersona, 
    setSelectedPersona, 
    expandedDays, 
    expandAllDays, 
    collapseAllDays,
    searchQuery,
    setSearchQuery 
  } = useUIStore();

  const allDayNumbers = itinerary.map((d) => d.day);
  const isAllExpanded = expandedDays.length === allDayNumbers.length;

  return (
    <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-4 mb-6 shadow-xl space-y-4">
      {/* 上排：基地切換 Tab (支援手機橫向自然滾動) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            依住宿基地快速篩選
          </span>
          <button
            onClick={() => isAllExpanded ? collapseAllDays() : expandAllDays(allDayNumbers)}
            className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium transition-colors"
          >
            {isAllExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>全部折疊</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>全部展開 (16天)</span>
              </>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedBaseId('all')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 ${
              selectedBaseId === 'all'
                ? 'bg-white text-slate-900 shadow-md shadow-white/10'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            全部天數 (Day 1 - {config.totalDays || 16})
          </button>

          {config.bases.map((base) => {
            const isSelected = selectedBaseId === base.id;
            return (
              <button
                key={base.id}
                onClick={() => setSelectedBaseId(base.id)}
                style={{
                  borderColor: isSelected ? base.color : undefined,
                }}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-slate-800 text-white shadow-lg ring-1'
                    : 'bg-slate-800/60 text-slate-300 border-slate-700/60 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: base.color }}
                />
                <span>{base.nameZh}</span>
                <span className="text-[11px] opacity-70">
                  (D{base.days[0]}-{base.days[base.days.length - 1]})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 下排：Persona 標籤快速過濾 + 搜尋欄 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
        {/* 標籤群 */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <span className="text-xs text-slate-400 shrink-0 mr-1 hidden md:inline">
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
          {selectedPersona && (
            <button
              onClick={() => setSelectedPersona(null)}
              className="text-xs text-slate-400 hover:text-white underline ml-1 shrink-0"
            >
              清除
            </button>
          )}
        </div>

        {/* 關鍵字搜尋 */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜尋景點、火車、美食..."
            className="w-full bg-slate-950/80 border border-slate-700/80 text-xs sm:text-sm rounded-xl pl-9 pr-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
