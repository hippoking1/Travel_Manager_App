import React, { useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import type { DayItinerary } from '../../../types';
import { useConfig, useBases } from '../../../stores/selectors';
import { formatDayDate } from '../../../utils/dates';

interface DayChipProps {
  day: DayItinerary;
  isSelected: boolean;
  onSelect: () => void;
  baseColor?: string;
  startDate?: string | null;
}

const DayChip: React.FC<DayChipProps> = ({
  day,
  isSelected,
  onSelect,
  baseColor,
  startDate,
}) => {
  const containerId = day.id || String(day.day);
  const formattedDate = formatDayDate(startDate, day.day, 'MM/dd');

  // 作為 Droppable 目標：拖曳活動到此 chip 上即可跨天放入
  const { setNodeRef, isOver } = useDroppable({
    id: containerId,
    data: {
      type: 'day',
      containerId,
    },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onSelect}
      className={`shrink-0 flex flex-col items-center justify-center min-w-[3.5rem] py-2 px-2.5 rounded-2xl border transition-all cursor-pointer select-none ${
        isOver
          ? 'bg-teal-100 dark:bg-teal-950 border-teal-600 ring-2 ring-teal-500 scale-105 shadow-md'
          : isSelected
          ? 'bg-teal-700 dark:bg-teal-500 text-white dark:text-stone-950 font-bold border-teal-700 dark:border-teal-500 shadow-sm'
          : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:border-stone-300'
      }`}
    >
      <div className="flex items-center gap-1">
        {baseColor && !isSelected && (
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: baseColor }}
          />
        )}
        <span className="font-mono text-xs font-bold leading-tight">
          D{day.day}
        </span>
      </div>
      <span
        className={`text-[10px] font-mono mt-0.5 leading-none ${
          isSelected ? 'opacity-90' : 'text-stone-400'
        }`}
      >
        {formattedDate}
      </span>
    </button>
  );
};

export interface DayStripProps {
  days: DayItinerary[];
  selectedDayId: string | null;
  onSelectDay: (dayId: string) => void;
  onAddDay?: () => void;
}

export const DayStrip: React.FC<DayStripProps> = ({
  days,
  selectedDayId,
  onSelectDay,
  onAddDay,
}) => {
  const config = useConfig();
  const bases = useBases();
  const stripRef = useRef<HTMLDivElement>(null);

  // 當選取改變時，自動捲動使選取之 chip 置中
  useEffect(() => {
    if (!stripRef.current || !selectedDayId) return;
    const selectedEl = stripRef.current.querySelector<HTMLElement>(
      `[data-day-id="${selectedDayId}"]`
    );
    if (selectedEl) {
      selectedEl.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [selectedDayId]);

  return (
    <div
      ref={stripRef}
      className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none select-none py-1"
    >
      {days.map((day) => {
        const id = day.id || String(day.day);
        const isSelected = selectedDayId === id;
        const base = bases.find((b) => b.id === day.baseId);

        return (
          <div key={id} data-day-id={id} className="shrink-0">
            <DayChip
              day={day}
              isSelected={isSelected}
              onSelect={() => onSelectDay(id)}
              baseColor={base?.color}
              startDate={config.startDate}
            />
          </div>
        );
      })}

      {onAddDay && (
        <button
          type="button"
          onClick={onAddDay}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-2xl border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-teal-500 hover:bg-teal-50/60 dark:hover:bg-teal-950/30 text-stone-500 hover:text-teal-700 dark:hover:text-teal-300 text-xs font-bold transition-all cursor-pointer shadow-2xs h-[42px]"
          title={`新增第 ${days.length + 1} 天行程`}
        >
          <Plus className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span>新增天數</span>
        </button>
      )}
    </div>
  );
};
