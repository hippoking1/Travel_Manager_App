import { describe, it, expect } from 'vitest';
import {
  toMin,
  toHHmm,
  derivePeriod,
  parsePeriodLabel,
  findConflicts,
  fitIntoSlot,
  reflowTimes,
  moveBlock,
  reorderDays,
} from './itinerary';
import type { TimeBlock, DayItinerary } from '../types';

describe('itinerary pure functions', () => {
  it('converts between HH:mm and minutes', () => {
    expect(toMin('08:30')).toBe(510);
    expect(toMin('13:45')).toBe(825);
    expect(toHHmm(510)).toBe('08:30');
    expect(toHHmm(825)).toBe('13:45');
  });

  it('derives period correctly', () => {
    expect(derivePeriod('08:30')).toBe('morning');
    expect(derivePeriod('11:59')).toBe('morning');
    expect(derivePeriod('12:00')).toBe('afternoon');
    expect(derivePeriod('17:59')).toBe('afternoon');
    expect(derivePeriod('18:00')).toBe('evening');
    expect(derivePeriod('22:00')).toBe('evening');
    expect(derivePeriod(undefined)).toBe('morning');
  });

  it('parses Chinese period label with time ranges', () => {
    expect(parsePeriodLabel('上午 08:30 - 12:00')).toEqual({
      startTime: '08:30',
      endTime: '12:00',
    });
    expect(parsePeriodLabel('下午 13:30 ~ 17:30')).toEqual({
      startTime: '13:30',
      endTime: '17:30',
    });
    expect(parsePeriodLabel('無指定時間')).toEqual({});
  });

  it('detects time conflicts between overlapping blocks', () => {
    const blocks: TimeBlock[] = [
      {
        id: 'b1',
        title: 'Block 1',
        description: '',
        period: 'morning',
        startTime: '09:00',
        endTime: '11:00',
        tags: [],
      },
      {
        id: 'b2',
        title: 'Block 2',
        description: '',
        period: 'morning',
        startTime: '10:30',
        endTime: '12:00',
        tags: [],
      },
      {
        id: 'b3',
        title: 'Block 3',
        description: '',
        period: 'afternoon',
        startTime: '14:00',
        endTime: '16:00',
        tags: [],
      },
    ];

    const conflicts = findConflicts(blocks);
    expect(conflicts.has('b1')).toBe(true);
    expect(conflicts.has('b2')).toBe(true);
    expect(conflicts.has('b3')).toBe(false);
  });

  it('fits block into slot based on previous block', () => {
    const blocks: TimeBlock[] = [
      {
        id: 'b1',
        title: 'Morning Walk',
        description: '',
        period: 'morning',
        startTime: '09:00',
        endTime: '10:30',
        tags: [],
      },
      {
        id: 'b2',
        title: 'New Lunch',
        description: '',
        period: 'morning',
        startTime: '14:00', // Outdated
        endTime: '15:00',
        tags: [],
      },
    ];

    const fitted = fitIntoSlot(blocks, 1);
    expect(fitted[1].startTime).toBe('10:30');
    expect(fitted[1].endTime).toBe('11:30'); // Preserves 60m duration
    expect(fitted[1].period).toBe('morning');
  });

  it('reflows all block times tightly in order', () => {
    const blocks: TimeBlock[] = [
      {
        id: 'b1',
        title: 'A',
        description: '',
        period: 'morning',
        startTime: '09:00',
        endTime: '10:00', // 60m
        tags: [],
      },
      {
        id: 'b2',
        title: 'B',
        description: '',
        period: 'afternoon',
        startTime: '15:00',
        endTime: '17:00', // 120m
        tags: [],
      },
    ];

    const reflowed = reflowTimes(blocks, '09:00');
    expect(reflowed[0].startTime).toBe('09:00');
    expect(reflowed[0].endTime).toBe('10:00');
    expect(reflowed[1].startTime).toBe('10:00');
    expect(reflowed[1].endTime).toBe('12:00');
  });

  it('moves blocks across days and into backlog', () => {
    const day1: DayItinerary = {
      id: 'd1',
      day: 1,
      baseId: 'luzern',
      title: 'Day 1',
      subtitle: '',
      highlights: [],
      timeBlocks: [
        {
          id: 'b1',
          title: 'Activity 1',
          description: '',
          period: 'morning',
          startTime: '09:00',
          endTime: '11:00',
          tags: [],
        },
      ],
      foodNotes: [],
    };

    const day2: DayItinerary = {
      id: 'd2',
      day: 2,
      baseId: 'luzern',
      title: 'Day 2',
      subtitle: '',
      highlights: [],
      timeBlocks: [
        {
          id: 'b2',
          title: 'Activity 2',
          description: '',
          period: 'morning',
          startTime: '10:00',
          endTime: '12:00',
          tags: [],
        },
      ],
      foodNotes: [],
    };

    const trip = {
      itinerary: [day1, day2],
      backlog: [],
    };

    // Move b1 from Day 1 to Day 2
    const moved = moveBlock(trip, 'b1', 'd2', 1);
    expect(moved.itinerary[0].timeBlocks.length).toBe(0);
    expect(moved.itinerary[1].timeBlocks.length).toBe(2);
    expect(moved.itinerary[1].timeBlocks[1].id).toBe('b1');
    expect(moved.itinerary[1].timeBlocks[1].startTime).toBe('12:00'); // After b2

    // Move b2 to backlog
    const toBacklog = moveBlock(moved, 'b2', 'backlog', 0);
    expect(toBacklog.backlog.length).toBe(1);
    expect(toBacklog.backlog[0].id).toBe('b2');
    expect(toBacklog.backlog[0].startTime).toBeUndefined();
  });

  it('reorders days and preserves correct day index', () => {
    const days: DayItinerary[] = [
      { id: 'd1', day: 1, baseId: 'b1', title: 'Day 1', subtitle: '', highlights: [], timeBlocks: [], foodNotes: [] },
      { id: 'd2', day: 2, baseId: 'b2', title: 'Day 2', subtitle: '', highlights: [], timeBlocks: [], foodNotes: [] },
      { id: 'd3', day: 3, baseId: 'b3', title: 'Day 3', subtitle: '', highlights: [], timeBlocks: [], foodNotes: [] },
    ];

    // Swap Day 1 and Day 3 (from 0 to 2)
    const reordered = reorderDays(days, 0, 2);
    expect(reordered[0].id).toBe('d2');
    expect(reordered[0].day).toBe(1);
    expect(reordered[1].id).toBe('d3');
    expect(reordered[1].day).toBe(2);
    expect(reordered[2].id).toBe('d1');
    expect(reordered[2].day).toBe(3);
  });
});
