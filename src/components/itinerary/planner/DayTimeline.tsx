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
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Zap, 
  Utensils, 
  ShoppingCart, 
  CloudSun, 
  Backpack, 
  AlertCircle,
  Sparkles,
  Inbox,
  Edit2,
  Trash2
} from 'lucide-react';
import type { DayItinerary, TimeBlock, ContainerId } from '../../../types';
import { useTripStore } from '../../../stores/tripStore';
import { useConfig, useBases, useBacklog } from '../../../stores/selectors';
import { formatDayDate } from '../../../utils/dates';
import { findConflicts } from '../../../lib/itinerary';
import { toast } from '../../ui/Toast';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { Input } from '../../ui/Field';
import { QuickAddBaseModal } from '../../shared/QuickAddBaseModal';
import { DayStrip } from './DayStrip';
import { ActivityCard } from './ActivityCard';
import { ActivityEditor } from './ActivityEditor';
import { DayBacklogTray } from './DayBacklogTray';
import { DeleteDayModal } from './DeleteDayModal';

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
  const navigate = useNavigate();
  const config = useConfig();
  const bases = useBases();
  const backlog = useBacklog();
  const { moveBlock, reflowDay, undo, addDay, deleteDay, updateDay } = useTripStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditDayModal, setShowEditDayModal] = useState(false);
  const [showDeleteDayModal, setShowDeleteDayModal] = useState(false);
  const [showQuickAddBase, setShowQuickAddBase] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editBaseId, setEditBaseId] = useState('');

  const [activeItem, setActiveItem] = useState<{
    id: string;
    block: TimeBlock;
    containerId: ContainerId;
  } | null>(null);

  const handleAddDay = () => {
    const newDayId = addDay(currentDay?.baseId);
    onSelectDay(newDayId);
    toast.success(`已成功新增第 ${days.length + 1} 天行程！`);
  };

  const handleRequestDeleteDay = () => {
    if (days.length <= 1) {
      toast.error('旅程至少需保留 1 天日程，無法刪除最後一天。');
      return;
    }
    setShowDeleteDayModal(true);
  };

  const handleConfirmDeleteDay = (options: { moveToBacklog: boolean }) => {
    const currentIndex = days.findIndex(
      (d) => (d.id || String(d.day)) === containerId
    );
    const nextTarget =
      days[currentIndex - 1] || days[currentIndex + 1] || days[0];

    deleteDay(containerId, options);
    setShowDeleteDayModal(false);

    if (options.moveToBacklog) {
      toast.success(
        `已將 Day ${currentDay.day} 的 ${currentDay.timeBlocks.length} 個活動移入景點池，並刪除該日。`
      );
    } else {
      toast.success(`已刪除 Day ${currentDay.day} 及其排程活動。`);
    }

    if (nextTarget && (nextTarget.id || String(nextTarget.day)) !== containerId) {
      onSelectDay(nextTarget.id || String(nextTarget.day));
    }
  };

  const handleSaveDayInfo = (e: React.FormEvent) => {
    e.preventDefault();
    updateDay(containerId, {
      title: editTitle.trim(),
      subtitle: editSubtitle.trim() || undefined,
      baseId: editBaseId || undefined,
    });
    setShowEditDayModal(false);
    toast.success('已更新當天資訊');
  };

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

  // Droppable 區域供活動卡片拖入當天時間軸
  const { setNodeRef: setTimelineDropRef, isOver: isTimelineOver } = useDroppable({
    id: `timeline-${containerId}`,
    data: {
      type: 'day',
      containerId,
    },
  });

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
    const activeData = active.data.current;
    const overData = over.data.current;

    let targetContainerId: ContainerId | null = null;
    let targetIndex = currentDay.timeBlocks.length;

    // 1. 拖曳到上方 DayStrip 某一天的 chip (跨天放置)
    if (overData?.type === 'day' && overData.containerId) {
      const targetDayId: string = overData.containerId;
      const targetDay = days.find((d) => (d.id || String(d.day)) === targetDayId);
      targetIndex = targetDay ? targetDay.timeBlocks.length : 0;

      moveBlock(blockId, targetDayId, targetIndex);
      onSelectDay(targetDayId);
      toast(`已將活動移至 Day ${targetDay?.day || ''}（${targetDay?.title || '新日程'}）`, {
        action: { label: '復原', onClick: undo },
      });
      return;
    }

    // 2. 拖曳到另一個活動卡片 (排序)
    if (overData?.type === 'block') {
      targetContainerId = overData.containerId || containerId;
      const idx = currentDay.timeBlocks.findIndex((b) => b.id === over.id);
      targetIndex = idx !== -1 ? idx : currentDay.timeBlocks.length;
    } else {
      // 拖曳到時間軸容器或空白放置區
      const matchedDay = days.find(
        (d) =>
          (d.id || String(d.day)) === over.id ||
          (d.id || String(d.day)) === overData?.containerId ||
          (d.id || String(d.day)) === String(over.id).replace('timeline-', '')
      );
      if (matchedDay) {
        targetContainerId = matchedDay.id || String(matchedDay.day);
        targetIndex = matchedDay.timeBlocks.length;
      }
    }

    if (!targetContainerId) {
      return;
    }

    moveBlock(blockId, targetContainerId, targetIndex);
    const isFromBacklog = activeData?.containerId === 'backlog';
    toast(isFromBacklog ? `已將活動排入 Day ${currentDay.day}` : '已調整活動時程', {
      action: { label: '復原', onClick: undo },
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {/* 頂部水平日期條 (可點選切換亦可作為拖曳放置目標) */}
        <DayStrip
          days={days}
          selectedDayId={containerId}
          onSelectDay={onSelectDay}
          onAddDay={handleAddDay}
        />

      {/* 篩選提示 */}
      {isFiltered && (
        <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>正在套用篩選條件，拖拉功能已暫停。</span>
        </div>
      )}

      {/* 主要內容：全寬時間軸 */}
      <div className="space-y-4">
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

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => navigate('/attractions')}
                className="px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="前往景點頁面檢視待排景點池"
              >
                <Inbox className="w-3.5 h-3.5 text-amber-600" />
                <span>景點池 ({backlog.length})</span>
              </button>
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
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditTitle(currentDay.title);
                  setEditSubtitle(currentDay.subtitle || '');
                  setEditBaseId(currentDay.baseId || '');
                  setShowEditDayModal(true);
                }}
                icon={<Edit2 className="w-3.5 h-3.5 text-stone-500" />}
                className="text-xs"
                title="編輯當天標題、路線副標與景點區域"
              >
                編輯當天
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRequestDeleteDay}
                icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />}
                className="text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border-red-200 dark:border-red-900/50"
                title="刪除此天日程"
              >
                刪除此天
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

          {/* 活動時間軸容器 (Droppable) */}
          <div
            ref={setTimelineDropRef}
            className={`space-y-6 rounded-3xl p-1 transition-all ${
              isTimelineOver
                ? 'ring-2 ring-teal-500/50 bg-teal-50/20 dark:bg-teal-950/20'
                : ''
            }`}
          >
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
                    您可以從下方待排景點池拖拉卡片進來，或直接點擊「新增活動」。
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

          {/* 每日下方：待排景點池快選與拖拉托盤 */}
          <DayBacklogTray day={currentDay} mode="timeline" disabled={isFiltered} />

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

        {/* 新增活動 Modal */}
        {showAddModal && (
          <ActivityEditor
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            dayIdOrNumber={containerId}
          />
        )}

        {/* 刪除天數 Modal (活動移至景點池或直接刪除) */}
        {showDeleteDayModal && (
          <DeleteDayModal
            isOpen={showDeleteDayModal}
            onClose={() => setShowDeleteDayModal(false)}
            day={currentDay}
            onConfirm={handleConfirmDeleteDay}
          />
        )}

        {/* 編輯當天標題與景點區域 Modal */}
        {showEditDayModal && (
          <Modal
            isOpen={showEditDayModal}
            onClose={() => setShowEditDayModal(false)}
            title={`編輯 Day ${currentDay.day} 資訊`}
          >
            <form onSubmit={handleSaveDayInfo} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-stone-600 dark:text-stone-300">
                    所屬景點區域
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowQuickAddBase(true)}
                    className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>新增區域</span>
                  </button>
                </div>
                <select
                  value={editBaseId}
                  onChange={(e) => setEditBaseId(e.target.value)}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-900 dark:text-stone-100"
                >
                  <option value="">未指定 / 全區通用</option>
                  {bases.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nameZh} {b.name && b.name !== b.nameZh ? `(${b.name})` : ''}
                    </option>
                  ))}
                  {editBaseId && !bases.some((b) => b.id === editBaseId) && (
                    <option value={editBaseId}>{editBaseId} (自訂/同步區域)</option>
                  )}
                </select>
              </div>

              <Input
                label="當天主要標題"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />

              <Input
                label="副標題 / 重點路線"
                value={editSubtitle}
                onChange={(e) => setEditSubtitle(e.target.value)}
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <Button type="button" variant="ghost" onClick={() => setShowEditDayModal(false)}>
                  取消
                </Button>
                <Button type="submit" variant="primary">
                  儲存資訊
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {showQuickAddBase && (
          <QuickAddBaseModal
            isOpen={showQuickAddBase}
            onClose={() => setShowQuickAddBase(false)}
            onCreated={(newId) => setEditBaseId(newId)}
          />
        )}

        {/* 拖曳浮起預覽卡片 */}
        <DragOverlay>
          {activeItem && (
            <ActivityCard
              block={activeItem.block}
              containerId={activeItem.containerId}
              isOverlay
            />
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
};
