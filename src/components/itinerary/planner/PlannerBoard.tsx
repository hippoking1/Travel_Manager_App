import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Calendar,
} from 'lucide-react';
import type { DayItinerary, TimeBlock, ContainerId } from '../../../types';
import { useTripStore } from '../../../stores/tripStore';
import { useConfig, useBases, useBacklog } from '../../../stores/selectors';
import { formatDayDate } from '../../../utils/dates';
import { toast } from '../../ui/Toast';
import { DayColumn } from './DayColumn';
import { BacklogPanel } from './BacklogPanel';
import { ActivityCard } from './ActivityCard';

export interface PlannerBoardProps {
  days: DayItinerary[];
  isFiltered?: boolean;
}

export const PlannerBoard: React.FC<PlannerBoardProps> = ({
  days,
  isFiltered = false,
}) => {
  const { moveBlock, reorderDays, undo } = useTripStore();
  const config = useConfig();
  const bases = useBases();
  const backlog = useBacklog();

  const boardScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [activeDayId, setActiveDayId] = useState<string | null>(null);

  const [activeItem, setActiveItem] = useState<{
    id: string;
    type: 'block' | 'day';
    block?: TimeBlock;
    day?: DayItinerary;
    containerId?: ContainerId;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const dayIds = days.map((d) => d.id || String(d.day));

  // 監聽橫向滾動狀態
  const updateScrollButtons = useCallback(() => {
    const el = boardScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  }, []);

  useEffect(() => {
    updateScrollButtons();
    const el = boardScrollRef.current;
    if (!el) return;

    el.addEventListener('scroll', updateScrollButtons, { passive: true });
    window.addEventListener('resize', updateScrollButtons);

    // 滑鼠滾輪智慧橫向滾動支援
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && !e.ctrlKey) {
        const target = e.target as HTMLElement | null;
        const scrollableChild = target?.closest('.overflow-y-auto') as HTMLElement | null;
        if (scrollableChild) {
          const atTop = scrollableChild.scrollTop <= 0 && e.deltaY < 0;
          const atBottom =
            scrollableChild.scrollTop + scrollableChild.clientHeight >= scrollableChild.scrollHeight - 2 &&
            e.deltaY > 0;
          if (!atTop && !atBottom) {
            return; // 優先讓子卡片清單垂直滾動
          }
        }
        e.preventDefault();
        el.scrollLeft += e.deltaY * 1.5;
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      el.removeEventListener('scroll', updateScrollButtons);
      el.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [updateScrollButtons, days.length]);

  // 平滑滾動指定距離 (一欄寬度約 340px)
  const handleScrollBy = (amount: number) => {
    if (!boardScrollRef.current) return;
    boardScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  // 快速跳轉至指定天數或待排池
  const handleJumpToDay = (targetId: string) => {
    setActiveDayId(targetId);
    if (!boardScrollRef.current) return;
    const targetEl = boardScrollRef.current.querySelector<HTMLElement>(`[data-day-id="${targetId}"]`);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (isFiltered) return;
    const { active } = event;
    const data = active.data.current;

    if (data?.type === 'block') {
      setActiveItem({
        id: String(active.id),
        type: 'block',
        block: data.block,
        containerId: data.containerId,
      });
    } else if (data?.type === 'day') {
      setActiveItem({
        id: String(active.id),
        type: 'day',
        day: data.day,
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!over || isFiltered) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // 1. 整天重新排序 (Day Reordering)
    if (activeData?.type === 'day') {
      const oldIndex = days.findIndex(
        (d) => (d.id || String(d.day)) === active.id
      );
      const newIndex = days.findIndex(
        (d) => (d.id || String(d.day)) === over.id
      );

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        reorderDays(oldIndex, newIndex);
        toast(`已調換第 ${oldIndex + 1} 天與第 ${newIndex + 1} 天順序`, {
          action: { label: '復原', onClick: undo },
        });
      }
      return;
    }

    // 2. 活動拖曳 (Activity Block Moving)
    if (activeData?.type === 'block') {
      const blockId = String(active.id);
      let targetContainerId: ContainerId = 'backlog';
      let targetIndex = 0;

      if (over.id === 'backlog') {
        targetContainerId = 'backlog';
        targetIndex = 0;
      } else if (overData?.type === 'day' && overData.containerId) {
        targetContainerId = overData.containerId;
        const targetDay = days.find(
          (d) => (d.id || String(d.day)) === targetContainerId
        );
        targetIndex = targetDay ? targetDay.timeBlocks.length : 0;
      } else if (overData?.containerId) {
        targetContainerId = overData.containerId;
        if (targetContainerId === 'backlog') {
          const bl = useTripStore.getState().backlog;
          const idx = bl.findIndex((b) => b.id === over.id);
          targetIndex = idx !== -1 ? idx : 0;
        } else {
          const targetDay = days.find(
            (d) => (d.id || String(d.day)) === targetContainerId
          );
          if (targetDay) {
            const idx = targetDay.timeBlocks.findIndex((b) => b.id === over.id);
            targetIndex = idx !== -1 ? idx : targetDay.timeBlocks.length;
          }
        }
      }

      moveBlock(blockId, targetContainerId, targetIndex);
      toast('已調整活動日程', {
        action: {
          label: '復原',
          onClick: undo,
        },
      });
    }
  };

  return (
    <div className="space-y-3 relative">
      {/* 篩選時停用拖拉提示 */}
      {isFiltered && (
        <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            目前正套用篩選或搜尋條件，拖拉排程功能暫時停用（請清除篩選即可自由拖拉排序）。
          </span>
        </div>
      )}

      {/* 頂部快捷天數跳轉導覽列 (徹底解決無法切換後續天數問題) */}
      <div className="flex items-center justify-between gap-2 p-2 bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-xs">
        {/* 左捲動按鈕 */}
        <button
          type="button"
          onClick={() => handleScrollBy(-340)}
          disabled={!canScrollLeft}
          className="p-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-30 disabled:pointer-events-none transition-all shrink-0"
          title="往左滾動查看前面天數"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* 橫向天數快捷藥丸清單 */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 px-1 flex-1">
          <div className="flex items-center gap-1 shrink-0 text-xs font-bold text-[var(--color-text-muted)] mr-1">
            <Calendar className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <span className="hidden sm:inline">天數快捷跳轉:</span>
          </div>

          {days.map((day) => {
            const containerId = day.id || String(day.day);
            const isTarget = activeDayId === containerId;
            const base = bases.find((b) => b.id === day.baseId);
            const dateStr = formatDayDate(config.startDate, day.day, 'MM/dd');

            return (
              <button
                key={containerId}
                type="button"
                onClick={() => handleJumpToDay(containerId)}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 border ${
                  isTarget
                    ? 'bg-[var(--color-primary)] text-white border-transparent shadow-xs'
                    : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:text-[var(--color-text)] hover:border-[var(--color-border-hover)]'
                }`}
                title={`跳轉至 Day ${day.day}: ${day.title}`}
              >
                {base?.color && !isTarget && (
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: base.color }}
                  />
                )}
                <span className="font-mono font-bold">D{day.day}</span>
                <span className="text-[10px] opacity-75 font-mono">{dateStr}</span>
              </button>
            );
          })}

          {/* 待排景點池跳轉標籤 */}
          <button
            type="button"
            onClick={() => handleJumpToDay('backlog')}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 border ml-1 ${
              activeDayId === 'backlog'
                ? 'bg-amber-600 text-white border-transparent shadow-xs'
                : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:text-[var(--color-text)]'
            }`}
            title="跳轉至右側待排景點池"
          >
            <Inbox className="w-3 h-3 text-amber-500" />
            <span>待排池</span>
            <span className="font-mono text-[10px] px-1 rounded-full bg-[var(--color-bg-subtle)]">
              {backlog.length}
            </span>
          </button>
        </div>

        {/* 右捲動按鈕 */}
        <button
          type="button"
          onClick={() => handleScrollBy(340)}
          disabled={!canScrollRight}
          className="p-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-30 disabled:pointer-events-none transition-all shrink-0"
          title="往右滾動查看後續天數"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 看板水平滾動區（具備可見且可拖曳之橫向滾動條） */}
      <div className="relative group">
        {/* 左側浮動半透明滾動輔助箭頭 */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => handleScrollBy(-340)}
            className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/90 dark:bg-stone-900/90 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 shadow-lg items-center justify-center hover:scale-110 active:scale-95 transition-all backdrop-blur-xs cursor-pointer"
            title="往左顯示前面天數"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* 右側浮動半透明滾動輔助箭頭 */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => handleScrollBy(340)}
            className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/90 dark:bg-stone-900/90 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 shadow-lg items-center justify-center hover:scale-110 active:scale-95 transition-all backdrop-blur-xs cursor-pointer animate-pulse hover:animate-none"
            title="往右顯示後續天數"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div
            ref={boardScrollRef}
            className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 items-start scroll-smooth focus:outline-none"
            style={{
              scrollbarWidth: 'auto',
              msOverflowStyle: 'auto',
            }}
          >
            {/* 天數欄位清單 */}
            <SortableContext
              items={dayIds}
              strategy={horizontalListSortingStrategy}
            >
              {days.map((day, idx) => (
                <DayColumn
                  key={day.id || String(day.day)}
                  day={day}
                  dayIndex={idx}
                  disabled={isFiltered}
                />
              ))}
            </SortableContext>

            {/* 待排景點池 (Backlog) 固定於右側 */}
            <BacklogPanel disabled={isFiltered} />
          </div>

          {/* 拖拉中浮起預覽卡片 */}
          <DragOverlay>
            {activeItem?.type === 'block' && activeItem.block && (
              <ActivityCard
                block={activeItem.block}
                containerId={activeItem.containerId || 'backlog'}
                isOverlay
              />
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
};
