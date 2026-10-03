import type { TimeBlock, DayItinerary, TripPlan, ContainerId } from '../types';

/** 時間字串 'HH:mm' 轉當天總分鐘數 */
export function toMin(t: string): number {
  if (!t) return 0;
  const parts = t.split(':').map(Number);
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  return h * 60 + m;
}

/** 分鐘數轉 'HH:mm' 格式 */
export function toHHmm(min: number): string {
  const norm = Math.max(0, Math.min(24 * 60 - 1, Math.round(min)));
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** 依開始時間推導時段 (上午/下午/晚上) */
export function derivePeriod(startTime?: string): TimeBlock['period'] {
  if (!startTime) return 'morning';
  const m = toMin(startTime);
  if (m < 12 * 60) return 'morning';
  if (m < 18 * 60) return 'afternoon';
  return 'evening';
}

/** 解析舊版或文字標籤如 '上午 08:30 - 12:00' 為結構化 startTime/endTime */
export function parsePeriodLabel(label?: string): { startTime?: string; endTime?: string } {
  if (!label) return {};
  const match = label.match(/(?:^|[^\d])(\d{1,2}):(\d{2})\s*(?:[-–~至]|到)\s*(\d{1,2}):(\d{2})/);
  if (!match) return {};
  const [, h1, m1, h2, m2] = match;
  return {
    startTime: `${h1.padStart(2, '0')}:${m1}`,
    endTime: `${h2.padStart(2, '0')}:${m2}`,
  };
}

/** 格式化時段顯示 (例: "08:30 – 12:00") */
export function formatTimeSpan(startTime?: string, endTime?: string, fallback = ''): string {
  if (startTime && endTime) return `${startTime} – ${endTime}`;
  if (startTime) return startTime;
  return fallback;
}

/** 陣列元素移動位置 */
export function arrayMove<T>(array: T[], from: number, to: number): T[] {
  const next = [...array];
  const [removed] = next.splice(from, 1);
  next.splice(to, 0, removed);
  return next;
}

/**
 * 找出時間衝突 (重疊) 的活動 ID 集合
 */
export function findConflicts(blocks: TimeBlock[]): Set<string> {
  const conflictIds = new Set<string>();
  const timed = blocks.filter((b) => b.startTime && b.endTime);

  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length; j++) {
      const a = timed[i];
      const b = timed[j];
      const aStart = toMin(a.startTime!);
      const aEnd = toMin(a.endTime!);
      const bStart = toMin(b.startTime!);
      const bEnd = toMin(b.endTime!);

      // 若區間有效且重疊 (aStart < bEnd 且 aEnd > bStart)
      if (aEnd > aStart && bEnd > bStart && aStart < bEnd && aEnd > bStart) {
        if (a.id) conflictIds.add(a.id);
        if (b.id) conflictIds.add(b.id);
      }
    }
  }

  return conflictIds;
}

/**
 * 當活動插入新位置時，參考相鄰活動自動調整其時間，保留該活動既有時長 (預設 90 分鐘)
 * 不會推擠其他活動
 */
export function fitIntoSlot(blocks: TimeBlock[], index: number): TimeBlock[] {
  if (index < 0 || index >= blocks.length) return blocks;

  const target = blocks[index];
  const prevDuration =
    target.startTime && target.endTime
      ? Math.max(30, toMin(target.endTime) - toMin(target.startTime))
      : 90;

  const prevBlock = blocks[index - 1];
  const nextBlock = blocks[index + 1];

  let newStart = '09:00';
  let newEnd = toHHmm(toMin(newStart) + prevDuration);

  if (prevBlock?.endTime) {
    newStart = prevBlock.endTime;
    newEnd = toHHmm(toMin(newStart) + prevDuration);
  } else if (nextBlock?.startTime) {
    const nextStartMin = toMin(nextBlock.startTime);
    const startMin = Math.max(7 * 60, nextStartMin - prevDuration);
    newStart = toHHmm(startMin);
    newEnd = nextBlock.startTime;
  }

  const updatedTarget: TimeBlock = {
    ...target,
    startTime: newStart,
    endTime: newEnd,
    period: derivePeriod(newStart),
    periodLabel: formatTimeSpan(newStart, newEnd),
  };

  const nextBlocks = [...blocks];
  nextBlocks[index] = updatedTarget;
  return nextBlocks;
}

/**
 * 一鍵重新排程：保留每項活動時長，依序緊湊銜接
 */
export function reflowTimes(blocks: TimeBlock[], dayStart = '09:00'): TimeBlock[] {
  if (blocks.length === 0) return [];

  let currentMin = toMin(blocks[0]?.startTime || dayStart);

  return blocks.map((block) => {
    const duration =
      block.startTime && block.endTime
        ? Math.max(30, toMin(block.endTime) - toMin(block.startTime))
        : 90;

    const start = toHHmm(currentMin);
    const end = toHHmm(currentMin + duration);
    currentMin += duration;

    return {
      ...block,
      startTime: start,
      endTime: end,
      period: derivePeriod(start),
      periodLabel: formatTimeSpan(start, end),
    };
  });
}

/**
 * 活動跨容器移動 (同天重新排序、跨天移動、加入/移出景點池)
 */
export function moveBlock(
  trip: Pick<TripPlan, 'itinerary' | 'backlog'>,
  blockId: string,
  toContainer: ContainerId,
  toIndex: number
): { itinerary: DayItinerary[]; backlog: TimeBlock[] } {
  let targetBlock: TimeBlock | null = null;

  // 1. 從舊位置拔出 block
  let nextBacklog = trip.backlog.filter((b) => {
    if (b.id === blockId) {
      targetBlock = b;
      return false;
    }
    return true;
  });

  const nextItinerary = trip.itinerary.map((day) => {
    const remaining = day.timeBlocks.filter((b) => {
      if (b.id === blockId) {
        targetBlock = b;
        return false;
      }
      return true;
    });
    return { ...day, timeBlocks: remaining };
  });

  if (!targetBlock) {
    return { itinerary: trip.itinerary, backlog: trip.backlog };
  }

  const foundBlock: TimeBlock = targetBlock;

  // 2. 插入新位置
  if (toContainer === 'backlog') {
    // 移入景點池：清空安排之時間
    const cleanedBlock: TimeBlock = {
      ...foundBlock,
      startTime: undefined,
      endTime: undefined,
      period: 'morning',
      periodLabel: undefined,
    };
    const safeIdx = Math.max(0, Math.min(nextBacklog.length, toIndex));
    nextBacklog.splice(safeIdx, 0, cleanedBlock);

    return { itinerary: nextItinerary, backlog: nextBacklog };
  }

  // 3. 移入某一天 (toContainer 為 day.id 或相容的字串)
  const targetDayIndex = nextItinerary.findIndex(
    (d) => (d.id && d.id === toContainer) || String(d.day) === toContainer
  );

  if (targetDayIndex === -1) {
    // 若找不到該天，不更動
    return { itinerary: trip.itinerary, backlog: trip.backlog };
  }

  const targetDay = nextItinerary[targetDayIndex];
  const nextBlocks = [...targetDay.timeBlocks];
  const safeIdx = Math.max(0, Math.min(nextBlocks.length, toIndex));

  // 放入目標位置
  nextBlocks.splice(safeIdx, 0, targetBlock);

  // 調整該格的時間排程
  const adjustedBlocks = fitIntoSlot(nextBlocks, safeIdx);

  nextItinerary[targetDayIndex] = {
    ...targetDay,
    timeBlocks: adjustedBlocks,
  };

  return {
    itinerary: nextItinerary,
    backlog: nextBacklog,
  };
}

/**
 * 重排整天日程順序 (Day Reordering)
 */
export function reorderDays(itinerary: DayItinerary[], fromIndex: number, toIndex: number): DayItinerary[] {
  if (fromIndex < 0 || fromIndex >= itinerary.length || toIndex < 0 || toIndex >= itinerary.length) {
    return itinerary;
  }
  const reordered = arrayMove(itinerary, fromIndex, toIndex);
  return reordered.map((day, idx) => ({
    ...day,
    day: idx + 1,
  }));
}
