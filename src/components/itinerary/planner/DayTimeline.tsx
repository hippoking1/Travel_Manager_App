import React, { useState } from 'react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { 
  Plus, 
  Zap, 
  Utensils, 
  ShoppingCart, 
  CloudSun, 
  Backpack, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import type { DayItinerary, TimeBlock, ContainerId } from '../../../types';
import { useTripStore } from '../../../stores/tripStore';
import { useConfig, useBases } from '../../../stores/selectors';
import { formatDayDate } from '../../../utils/dates';
import { findConflicts } from '../../../lib/itinerary';
import { toast } from '../../ui/Toast';
import { Button } from '../../ui/Button';
import { DayStrip } from './DayStrip';
import { ActivityCard } from './ActivityCard';
import { ActivityEditor } from './ActivityEditor';
import { BacklogPanel } from './BacklogPanel';

export interface DayTimelineProps {
  days: DayItinerary[];
  selectedDayId: string | null;
  onSelectDay: (id: string) => void;
  isFiltered?: boolean;
}

export const DayTimeline: React.FC<DayTimelineProps> = ({
  days,
  selectedDayId,
  onSelectDay,
  isFiltered = false,
}) => {
  const config = useConfig();
  const bases = useBases();
  const { moveBlock, reflowDay, undo } = useTripStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [activeItem, setActiveItem] = useState<{
    id: string;
    block: TimeBlock;
    containerId: ContainerId;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // 當前選取的日程
  const currentDay =
    days.find((d) => (d.id || String(d.day)) === selectedDayId) || days[0];

  if (!currentDay) {
    return null;
  }

  const containerId = currentDay.id || String(currentDay.day);
  const base = bases.find((b) => b.id === currentDay.baseId);
  const formattedDate = formatDayDate(config.startDate, currentDay.day);
  const blockIds = currentDay.timeBlocks.map((b) => b.id || 'unknown');
  const conflictIds = findConflicts(currentDay.timeBlocks);

  // 依時段分組 (上午 / 下午 / 晚上)
  const morningBlocks = currentDay.timeBlocks.filter((b) => b.period === 'morning');
  const afternoonBlocks = currentDay.timeBlocks.filter((b) => b.period === 'afternoon');
  const eveningBlocks = currentDay.timeBlocks.filter((b) => b.period === 'evening');

  const handleDragStart = (e: DragStartEvent) => {
    if (isFiltered) return;
    const { active } = e;
    const data = active.data.current;
    if (data?.type === 'block') {
      setActiveItem({
        id: String(active.id),
        block: data.block,
        containerId: data.containerId,
      });
    }
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveItem(null);

    if (!over || isFiltered) return;

    const blockId = String(active.id);
    const overData = over.data.current;

    let targetContainerId: ContainerId = containerId;
    let targetIndex = currentDay.timeBlocks.length;

    // 拖曳到上方 DayStrip 某一天的 chip
    if (overData?.type === 'day' && overData.containerId) {
      targetContainerId = overData.containerId;
      const targetDay = days.find((d) => (d.id || String(d.day)) === targetContainerId);
      targetIndex = targetDay ? targetDay.timeBlocks.length : 0;

      moveBlock(blockId, targetContainerId, targetIndex);
      onSelectDay(targetContainerId);
      toast(`已將活動移至 ${targetDay?.title || '新日程'}`, {
        action: { label: '復原', onClick: undo },
      });
      return;
    }

    // 拖曳到另一個活動卡片
    if (overData?.containerId) {
      targetContainerId = overData.containerId;
      const idx = currentDay.timeBlocks.findIndex((b) => b.id === over.id);
      targetIndex = idx !== -1 ? idx : currentDay.timeBlocks.length;
    }

    moveBlock(blockId, targetContainerId, targetIndex);
  };

  return (
    <div className="space-y-4">
      {/* 頂部水平日期條 (可點選切換亦可作為拖曳放置目標) */}
      <DayStrip
        days={days}
        selectedDayId={containerId}
        onSelectDay={onSelectDay}
      />

      {/* 篩選提示 */}
      {isFiltered && (
        <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>正在套用篩選條件，拖拉功能已暫停。</span>
        </div>
      )}

      {/* 主要內容：左側時間軸 + 右側待排景點池 (大螢幕時可並列) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        <div className="lg:col-span-3 space-y-4">
          {/* 當天標題概覽卡 */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-3xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/40">
                    DAY {String(currentDay.day).padStart(2, '0')} · {formattedDate}
                  </span>
                  {base && (
                    <span
                      style={{
                        backgroundColor: `${base.color}15`,
                        color: base.color,
                        borderColor: `${base.color}35`,
                      }}
                      className="px-2 py-0.5 rounded-full text-xs font-semibold border"
                    >
                      {base.nameZh}
                    </span>
                  )}
                </div>
                <h2 className="text-lg sm:text-xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
                  {currentDay.title}
                </h2>
                {currentDay.subtitle && (
                  <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
                    {currentDay.subtitle}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => reflowDay(containerId)}
                  icon={<Zap className="w-3.5 h-3.5 text-amber-500" />}
                  className="text-xs"
                >
                  自動排時程
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowAddModal(true)}
                  icon={<Plus className="w-3.5 h-3.5" />}
                  className="text-xs"
                >
                  新增活動
                </Button>
              </div>
            </div>

            {/* 亮點標籤 */}
            {currentDay.highlights && currentDay.highlights.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mt-3 pt-3 border-t border-stone-100 dark:border-stone-800">
                {currentDay.highlights.map((h, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300"
                  >
                    ★ {h}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 活動時間軸 DndContext */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-6">
              <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
                {/* 上午時段 */}
                {morningBlocks.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-stone-500 uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>上午日程 ({morningBlocks.length})</span>
                    </div>
                    <div className="space-y-2.5">
                      {morningBlocks.map((block) => (
                        <ActivityCard
                          key={block.id || block.title}
                          block={block}
                          containerId={containerId}
                          hasConflict={conflictIds.has(block.id || '')}
                          disabled={isFiltered}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 下午時段 */}
                {afternoonBlocks.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-stone-500 uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-teal-500" />
                      <span>下午日程 ({afternoonBlocks.length})</span>
                    </div>
                    <div className="space-y-2.5">
                      {afternoonBlocks.map((block) => (
                        <ActivityCard
                          key={block.id || block.title}
                          block={block}
                          containerId={containerId}
                          hasConflict={conflictIds.has(block.id || '')}
                          disabled={isFiltered}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 晚上時段 */}
                {eveningBlocks.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-stone-500 uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      <span>晚間日程 ({eveningBlocks.length})</span>
                    </div>
                    <div className="space-y-2.5">
                      {eveningBlocks.map((block) => (
                        <ActivityCard
                          key={block.id || block.title}
                          block={block}
                          containerId={containerId}
                          hasConflict={conflictIds.has(block.id || '')}
                          disabled={isFiltered}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {currentDay.timeBlocks.length === 0 && (
                  <div className="p-8 text-center bg-white dark:bg-stone-900 border border-dashed border-stone-200 dark:border-stone-800 rounded-3xl space-y-2">
                    <Sparkles className="w-6 h-6 text-stone-300 dark:text-stone-600 mx-auto" />
                    <h4 className="text-sm font-bold text-stone-700 dark:text-stone-300">
                      本日尚無安排活動
                    </h4>
                    <p className="text-xs text-stone-400">
                      您可以從待排景點池拖拉卡片進來，或直接點擊「新增活動」。
                    </p>
                    <div className="pt-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setShowAddModal(true)}
                        icon={<Plus className="w-3.5 h-3.5" />}
                      >
                        新增第一個活動
                      </Button>
                    </div>
                  </div>
                )}
              </SortableContext>
            </div>

            <DragOverlay>
              {activeItem && (
                <ActivityCard
                  block={activeItem.block}
                  containerId={activeItem.containerId}
                  isOverlay
                />
              )}
            </DragOverlay>
          </DndContext>

          {/* 美食與自煮小筆記 */}
          {currentDay.foodNotes && currentDay.foodNotes.length > 0 && (
            <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-3xl p-4 sm:p-5 space-y-3">
              <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Utensils className="w-4 h-4" />
                <span>當日美食推薦 & 自煮小筆記</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {currentDay.foodNotes.map((food, fIdx) => (
                  <div
                    key={fIdx}
                    className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/60 dark:border-stone-800 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 dark:text-stone-100">
                        {food.mealLabel}
                      </span>
                      {food.costEstimate && (
                        <span className="text-[11px] font-mono text-stone-400">
                          {food.costEstimate}
                        </span>
                      )}
                    </div>
                    <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                      {food.suggestion}
                    </p>
                  </div>
                ))}
              </div>

              {currentDay.supermarketTips && currentDay.supermarketTips.length > 0 && (
                <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-start gap-2 text-xs text-stone-600 dark:text-stone-300">
                  <ShoppingCart className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-stone-800 dark:text-stone-200">超市採買貼士：</span>
                    <span>{currentDay.supermarketTips.join('；')}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 天氣警訊與裝備提醒 */}
          {(currentDay.weatherAlert || (currentDay.packingReminders && currentDay.packingReminders.length > 0)) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {currentDay.weatherAlert && (
                <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/40 text-sky-900 dark:text-sky-200 flex items-start gap-2.5">
                  <CloudSun className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-0.5">天氣與氣溫提醒</span>
                    <p className="opacity-90 leading-relaxed">{currentDay.weatherAlert}</p>
                  </div>
                </div>
              )}

              {currentDay.packingReminders && currentDay.packingReminders.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/40 text-teal-900 dark:text-teal-200 flex items-start gap-2.5">
                  <Backpack className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-0.5">出門必備裝備</span>
                    <p className="opacity-90 leading-relaxed">
                      {currentDay.packingReminders.join('、')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 右側待排景點池 (Backlog) */}
        <div className="lg:col-span-1">
          <BacklogPanel disabled={isFiltered} />
        </div>
      </div>

      {/* 新增活動 Modal */}
      {showAddModal && (
        <ActivityEditor
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          dayIdOrNumber={containerId}
        />
      )}
    </div>
  );
};
