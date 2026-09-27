import React, { useMemo } from 'react';
import { useTripStore } from '../../stores/tripStore';
import { useUIStore } from '../../stores/uiStore';
import { FilterBar } from './FilterBar';
import { DayCard } from './DayCard';
import { Users, Info, Sparkles, Plus, RotateCcw } from 'lucide-react';

export const ItineraryPage: React.FC = () => {
  const { config, itinerary, addDay, resetItineraryToDemo } = useTripStore();
  const { selectedBaseId, selectedPersona, searchQuery } = useUIStore();

  // 篩選行程邏輯 (支援基地、Persona 標籤、搜尋關鍵字)
  const filteredDays = useMemo(() => {
    return itinerary.filter((day) => {
      // 1. 基地篩選
      if (selectedBaseId !== 'all' && day.baseId !== selectedBaseId) {
        return false;
      }

      // 2. Persona 標籤篩選
      if (selectedPersona) {
        const hasTagInBlocks = day.timeBlocks.some((block) =>
          block.tags.includes(selectedPersona)
        );
        if (!hasTagInBlocks) return false;
      }

      // 3. 搜尋字串篩選
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = day.title.toLowerCase().includes(q);
        const matchSubtitle = day.subtitle.toLowerCase().includes(q);
        const matchHighlights = day.highlights.some((h) => h.toLowerCase().includes(q));
        const matchBlocks = day.timeBlocks.some(
          (b) =>
            b.title.toLowerCase().includes(q) ||
            b.description.toLowerCase().includes(q) ||
            (b.locationName && b.locationName.toLowerCase().includes(q))
        );
        if (!matchTitle && !matchSubtitle && !matchHighlights && !matchBlocks) {
          return false;
        }
      }

      return true;
    });
  }, [itinerary, selectedBaseId, selectedPersona, searchQuery]);

  const handleReset = () => {
    if (window.confirm('確定要將行程恢復為預設的 16 天瑞士經典行程嗎？自訂的變更將會被覆蓋。')) {
      resetItineraryToDemo();
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* 頂部歡迎 Banner / 三代家庭成員概覽 */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-800 mb-6 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🇨🇭</span>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {config.tripName}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
              專為 7 位家庭成員打造：2 位長輩 (65-70歲)、2 位成人 (40歲)、3 位孩子 (8, 10, 12歲)。兼顧平緩健走、冒險樂園、自煮與景觀列車。
            </p>
          </div>

          {/* 家庭陣容快速標籤 */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-slate-800/90 border border-slate-700/80 px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 text-slate-200">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>7 位家庭成員</span>
            </div>
            <div className="bg-slate-800/90 border border-slate-700/80 px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 text-slate-200">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>共 {itinerary.length} 天規劃</span>
            </div>
          </div>
        </div>

        {/* 成員小膠囊列 */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs text-slate-400">
          <span className="font-semibold text-slate-300 shrink-0">同行旅伴：</span>
          {config.travelers.map((t) => (
            <span
              key={t.id}
              className="bg-slate-800/60 px-2 py-0.5 rounded-md border border-slate-700/40 text-slate-300 shrink-0"
              title={t.notes}
            >
              {t.name} ({t.roleLabel})
            </span>
          ))}
        </div>
      </div>

      {/* 互動篩選控制列 */}
      <FilterBar />

      {/* 行程列表 */}
      {filteredDays.length > 0 ? (
        <div className="space-y-4">
          {filteredDays.map((day) => (
            <DayCard key={day.day} dayData={day} />
          ))}
        </div>
      ) : (
        /* 無符合結果提示 */
        <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800">
          <Info className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <h3 className="text-base font-bold text-white mb-1">找不到相符的行程</h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
            嘗試切換基地、重置角色篩選標籤，或清除搜尋關鍵字以查看完整規劃。
          </p>
        </div>
      )}

      {/* 底部自由規劃功能列：新增天數 & 復原按鈕 (需求 2) */}
      <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          onClick={() => addDay()}
          className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold px-6 py-3 rounded-2xl text-sm transition-all shadow-xl shadow-red-950 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>自由新增旅遊日程 (Day {itinerary.length + 1})</span>
        </button>

        <button
          onClick={handleReset}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors p-2"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>恢復為 16 天瑞士經典行程</span>
        </button>
      </div>
    </div>
  );
};
