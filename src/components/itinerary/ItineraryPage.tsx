import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, RotateCcw, Calendar, Info, Sparkles, Share2, Landmark } from 'lucide-react';
import { useTripStore } from '../../stores/tripStore';
import { useUIStore } from '../../stores/uiStore';
import { useActiveTrip, useItinerary, useConfig, useBacklog } from '../../stores/selectors';
import { useConfirm } from '../ui/ConfirmDialog';
import { Button } from '../ui/Button';
import { toast } from '../ui/Toast';
import { exportTripToJsonString } from '../../lib/tripImport';
import { FilterBar } from './FilterBar';
import { PlannerBoard } from './planner/PlannerBoard';
import { DayTimeline } from './planner/DayTimeline';

export const ItineraryPage: React.FC = () => {
  const navigate = useNavigate();
  const activeTrip = useActiveTrip();
  const itinerary = useItinerary();
  const backlog = useBacklog();
  const config = useConfig();
  const { addDay, resetItineraryToDemo } = useTripStore();
  const confirm = useConfirm();

  const {
    selectedBaseId,
    selectedPersona,
    searchQuery,
    itineraryView,
    selectedDayId,
    setSelectedDayId,
  } = useUIStore();

  const isFiltered = selectedBaseId !== 'all' || selectedPersona !== null || !!searchQuery.trim();

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

  const handleReset = async () => {
    const ok = await confirm({
      title: '確定要重置為預設示範行程嗎？',
      message: '此旅程目前的自訂修改與拖拉排程將會被示範內容覆蓋。',
      danger: true,
      confirmLabel: '確認重置',
    });
    if (ok) {
      resetItineraryToDemo();
    }
  };

  const handleExportToAi = async () => {
    try {
      const jsonStr = exportTripToJsonString(activeTrip);
      await navigator.clipboard.writeText(jsonStr);
      toast.success('已將目前旅程 JSON 複製到剪貼簿，可直接貼給 AI 請它微調！');
    } catch {
      toast.error('無法複製到剪貼簿，請至「AI 行程匯入」頁面查看完整提示詞與資料。');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7">
      {/* 頂部旅行概覽 Banner */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-3xl p-5 sm:p-6 mb-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl sm:text-3xl shrink-0 p-1.5 rounded-2xl bg-stone-100 dark:bg-stone-800 border border-stone-200/60 dark:border-stone-700 shadow-2xs">
                {activeTrip.coverEmoji || '✈️'}
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
                  {activeTrip.name}
                </h1>
                <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5 max-w-xl leading-relaxed">
                  {config.subtitle || `${activeTrip.destination || '自由行'} 探索慢遊日程規劃`}
                </p>
              </div>
            </div>
          </div>

          {/* 統計膠囊與快捷操作 */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-stone-100 dark:bg-stone-800/80 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 text-stone-700 dark:text-stone-300">
              <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>共 {itinerary.length} 天日程</span>
            </div>

            <div className="bg-stone-100 dark:bg-stone-800/80 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 text-stone-700 dark:text-stone-300">
              <Users className="w-3.5 h-3.5 text-amber-500" />
              <span>{config.travelers?.length || 1} 位同行夥伴</span>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportToAi}
              icon={<Share2 className="w-3.5 h-3.5 text-stone-500" />}
              title="複製目前旅程 JSON 給 AI 微調"
            >
              匯出給 AI
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/attractions')}
              icon={<Landmark className="w-3.5 h-3.5 text-teal-600" />}
              title="前往景點清單與待排景點池"
            >
              景點池 ({backlog.length})
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/import')}
              icon={<Sparkles className="w-3.5 h-3.5 text-teal-600" />}
            >
              AI 智慧匯入
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => addDay()}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              新增一天
            </Button>
          </div>
        </div>

        {/* 成員膠囊標籤 */}
        {config.travelers && config.travelers.length > 0 && (
          <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs text-stone-500 dark:text-stone-400">
            <span className="font-semibold text-stone-700 dark:text-stone-300 shrink-0">同行夥伴：</span>
            {config.travelers.map((t) => (
              <span
                key={t.id}
                className="bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-lg text-stone-700 dark:text-stone-300 shrink-0 font-medium"
                title={t.notes}
              >
                {t.name} ({t.roleLabel})
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 互動篩選控制列 */}
      <FilterBar />

      {/* 排程內容 (依 itineraryView 切換看板模式或時間軸模式) */}
      {filteredDays.length > 0 ? (
        itineraryView === 'board' ? (
          <PlannerBoard days={filteredDays} isFiltered={isFiltered} />
        ) : (
          <DayTimeline
            days={filteredDays}
            selectedDayId={selectedDayId}
            onSelectDay={setSelectedDayId}
            isFiltered={isFiltered}
          />
        )
      ) : (
        /* 無符合結果提示 */
        <div className="text-center py-16 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800">
          <Info className="w-8 h-8 text-stone-400 mx-auto mb-2" />
          <h3 className="text-base font-bold text-stone-800 dark:text-stone-200 mb-1">
            找不到相符的日程
          </h3>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
            嘗試切換基地、重置角色篩選標籤，或清除關鍵字以查看完整規劃。
          </p>
        </div>
      )}

      {/* 底部輔助操作區 */}
      <div className="mt-8 pt-6 border-t border-stone-200/80 dark:border-stone-800 flex items-center justify-between gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => addDay()}
          icon={<Plus className="w-3.5 h-3.5" />}
        >
          新增第 {itinerary.length + 1} 天行程
        </Button>

        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 flex items-center gap-1.5 transition-colors p-2 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>重置為示範行程</span>
        </button>
      </div>
    </div>
  );
};
