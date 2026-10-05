import type { TimeBlock } from '../../types';
import type { TripImportTimeBlock } from './schema';
import { toMin, toHHmm, derivePeriod, findConflicts } from '../itinerary';
import { inferCoordinates } from '../geo';

export interface ScheduleOptions {
  morningStart?: string;   // 預設 '09:00'
  afternoonStart?: string; // 預設 '13:30'
  eveningStart?: string;   // 預設 '18:30'
  defaultDurationMin?: number; // 預設 90 分鐘
  bufferMin?: number;      // 活動間隔緩衝 15 分鐘
}

export interface ScheduleResult {
  blocks: TimeBlock[];
  warnings: string[];
}

const DEFAULT_OPTIONS: Required<ScheduleOptions> = {
  morningStart: '09:00',
  afternoonStart: '13:30',
  eveningStart: '18:30',
  defaultDurationMin: 90,
  bufferMin: 15,
};

/**
 * 自動為 Day 的活動排定起訖時間與時段標籤
 */
export function autoScheduleDayBlocks(
  rawBlocks: TripImportTimeBlock[],
  dayNumber: number,
  options?: ScheduleOptions
): ScheduleResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const warnings: string[] = [];
  const scheduled: TimeBlock[] = [];

  let currentMorningMin = toMin(opts.morningStart);
  let currentAfternoonMin = toMin(opts.afternoonStart);
  let currentEveningMin = toMin(opts.eveningStart);

  // 第一階段：逐一推算時間
  for (let i = 0; i < rawBlocks.length; i++) {
    const raw = rawBlocks[i];
    const blockId = raw.id || `b_imp_${dayNumber}_${i + 1}_${Math.random().toString(36).slice(2, 6)}`;
    const duration = raw.durationMin && raw.durationMin > 0 ? raw.durationMin : opts.defaultDurationMin;

    let startTime = raw.startTime;
    let endTime = raw.endTime;
    let period = raw.period;

    // 若同時已有有效 startTime 與 endTime
    if (startTime && endTime && toMin(startTime) < toMin(endTime)) {
      if (!period) {
        period = derivePeriod(startTime);
      }
      scheduled.push({
        id: blockId,
        period,
        startTime,
        endTime,
        title: raw.title,
        description: raw.description || '',
        locationName: raw.locationName,
        coordinates: raw.coordinates,
        altitude: raw.altitude,
        tags: raw.tags || [],
        tips: raw.tips,
        transport: raw.transport,
      });

      // 更新對應時段的流水指針
      const endMin = toMin(endTime);
      if (period === 'morning') currentMorningMin = Math.max(currentMorningMin, endMin + opts.bufferMin);
      else if (period === 'afternoon') currentAfternoonMin = Math.max(currentAfternoonMin, endMin + opts.bufferMin);
      else currentEveningMin = Math.max(currentEveningMin, endMin + opts.bufferMin);

      continue;
    }

    // 若僅有 startTime，推算 endTime
    if (startTime && !endTime) {
      const startMin = toMin(startTime);
      const endMin = Math.min(23 * 60 + 59, startMin + duration);
      endTime = toHHmm(endMin);
      if (!period) period = derivePeriod(startTime);

      scheduled.push({
        id: blockId,
        period,
        startTime,
        endTime,
        title: raw.title,
        description: raw.description || '',
        locationName: raw.locationName,
        coordinates: raw.coordinates,
        altitude: raw.altitude,
        tags: raw.tags || [],
        tips: raw.tips,
        transport: raw.transport,
      });
      continue;
    }

    // 若完全無 startTime，根據時段依序排程
    if (!period) {
      // 根據在該天的先後位置粗估時段
      if (i === 0) period = 'morning';
      else if (i === rawBlocks.length - 1 && rawBlocks.length > 2) period = 'evening';
      else period = 'afternoon';
    }

    let startMin: number;
    if (period === 'morning') {
      startMin = currentMorningMin;
      currentMorningMin += duration + opts.bufferMin;
    } else if (period === 'afternoon') {
      startMin = currentAfternoonMin;
      currentAfternoonMin += duration + opts.bufferMin;
    } else {
      startMin = currentEveningMin;
      currentEveningMin += duration + opts.bufferMin;
    }

    // 防止超過當天晚上 23:30
    if (startMin >= 23 * 60 + 30) {
      warnings.push(`Day ${dayNumber} 活動「${raw.title}」排程時間過晚 (超過 23:30)，已夾定於夜間時段。`);
      startMin = 22 * 60;
    }

    const calculatedEndMin = Math.min(23 * 60 + 59, startMin + duration);
    startTime = toHHmm(startMin);
    endTime = toHHmm(calculatedEndMin);

    const coords = raw.coordinates || inferCoordinates(raw.locationName, raw.title, undefined, true);

    scheduled.push({
      id: blockId,
      period,
      startTime,
      endTime,
      title: raw.title,
      description: raw.description || '',
      locationName: raw.locationName,
      coordinates: coords,
      altitude: raw.altitude,
      tags: raw.tags || [],
      tips: raw.tips,
      transport: raw.transport,
    });
  }

  // 第二階段：偵測衝突
  const conflictIds = findConflicts(scheduled);
  if (conflictIds.size > 0) {
    warnings.push(`Day ${dayNumber} 偵測到 ${conflictIds.size} 個時間重疊的活動，匯入後可於行程看板自由拖拉調整。`);
  }

  return {
    blocks: scheduled,
    warnings,
  };
}
