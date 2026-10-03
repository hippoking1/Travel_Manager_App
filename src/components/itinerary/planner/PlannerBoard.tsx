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
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { AlertCircle } from 'lucide-react';
import type { DayItinerary, TimeBlock, ContainerId } from '../../../types';
import { useTripStore } from '../../../stores/tripStore';
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

      // 如果 over 的是容器本身 (例如 DayColumn 或 BacklogPanel)
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
        // 如果 over 的是另一個活動卡片
        targetContainerId = overData.containerId;
        if (targetContainerId === 'backlog') {
          const backlog = useTripStore.getState().backlog;
          const idx = backlog.findIndex((b) => b.id === over.id);
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
    <div className="space-y-3">
      {/* 篩選時停用拖拉提示 */}
      {isFiltered && (
        <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            目前正套用篩選或搜尋條件，拖拉排程功能暫時停用（請清除篩選即可自由拖拉排序）。
          </span>
        </div>
      )}

      {/* 看板水平滾動區 */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 scrollbar-none items-start">
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
  );
};
