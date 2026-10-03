import { describe, it, expect } from 'vitest';
import { normalizeTimeBlock, normalizeDayItinerary, migrateToV4 } from './migrations';

describe('migrations and normalization', () => {
  it('normalizes timeblock with generated id, parsed times, and derived period', () => {
    const raw = {
      period: 'morning' as const,
      periodLabel: '上午 08:30 - 12:00',
      title: 'Chapel Bridge',
      description: 'Walk around',
    };

    const normalized = normalizeTimeBlock(raw);
    expect(normalized.id).toBeDefined();
    expect(normalized.startTime).toBe('08:30');
    expect(normalized.endTime).toBe('12:00');
    expect(normalized.period).toBe('morning');
  });

  it('normalizes day itinerary with stable id and normalized blocks', () => {
    const rawDay = {
      day: 2,
      baseId: 'grindelwald',
      title: 'Day 2',
      timeBlocks: [
        {
          period: 'afternoon' as const,
          periodLabel: '下午 14:00 - 17:30',
          title: 'First Cliff Walk',
          description: '',
          tags: [],
        },
      ],
    };

    const normalized = normalizeDayItinerary(rawDay, 1);
    expect(normalized.id).toBeDefined();
    expect(normalized.day).toBe(2);
    expect(normalized.timeBlocks[0].startTime).toBe('14:00');
    expect(normalized.timeBlocks[0].endTime).toBe('17:30');
    expect(normalized.timeBlocks[0].period).toBe('afternoon');
  });

  it('migrates legacy V3 state to V4 with backlog, modules and clean active sync', () => {
    const legacyState = {
      trips: [
        {
          id: 'swiss_trip',
          name: 'Swiss Family Odyssey 2027',
          destination: '瑞士 (Switzerland)',
          itinerary: [
            {
              day: 1,
              title: 'Luzern arrival',
              timeBlocks: [{ periodLabel: '09:00 - 11:30', title: 'Arrival' }],
            },
          ],
        },
      ],
      activeTripId: 'swiss_trip',
      // Legacy flattened active trip fields:
      itinerary: [
        {
          day: 1,
          title: 'Luzern arrival UPDATED',
          timeBlocks: [{ periodLabel: '09:00 - 11:30', title: 'Arrival Updated' }],
        },
      ],
    };

    const { trips, activeTripId } = migrateToV4(legacyState);
    expect(activeTripId).toBe('swiss_trip');
    expect(trips.length).toBe(1);
    expect(trips[0].backlog).toEqual([]);
    expect(trips[0].modules).toContain('swiss');
    // Ensure flattened state was merged back:
    expect(trips[0].itinerary[0].title).toBe('Luzern arrival UPDATED');
    expect(trips[0].itinerary[0].timeBlocks[0].title).toBe('Arrival Updated');
    expect(trips[0].itinerary[0].timeBlocks[0].id).toBeDefined();
  });
});
