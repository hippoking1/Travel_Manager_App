import { describe, it, expect } from 'vitest';
import { inferCoordinates, extractAllTripLocations } from './index';
import type { TripPlan } from '../../types';
import { DEFAULT_CURRENCY_CONFIG } from '../../utils/currency';

describe('geo - inferCoordinates', () => {
  it('accurately resolves exact Japanese cities and landmarks', () => {
    const coords1 = inferCoordinates('札幌');
    expect(coords1).toBeDefined();
    expect(coords1![0]).toBeCloseTo(43.0618, 2);

    const coords2 = inferCoordinates('小樽運河');
    expect(coords2).toBeDefined();
    expect(coords2![0]).toBeCloseTo(43.1995, 2);
  });

  it('resolves substring matching in titles with priority for longer terms', () => {
    const coords = inferCoordinates('抵達新千歲機場並搭車前往市區');
    expect(coords).toBeDefined();
    // 應優先匹配「新千歲機場」而非「新千歲」
    expect(coords![0]).toBeCloseTo(42.7752, 2);
  });

  it('returns undefined when no location match found', () => {
    const coords = inferCoordinates('未知神秘秘境XYZ');
    expect(coords).toBeUndefined();
  });
});

describe('geo - extractAllTripLocations', () => {
  it('extracts all locations from itinerary timeBlocks, bases and accommodations', () => {
    const dummyPlan: TripPlan = {
      id: 'test_trip',
      name: '北海道道央 6 日遊',
      destination: '日本 北海道',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      config: {
        tripName: '北海道道央 6 日遊',
        subtitle: '',
        startDate: '2027-07-10',
        totalDays: 2,
        travelers: [],
        bases: [
          {
            id: 'b_sapporo',
            name: 'Sapporo',
            nameZh: '札幌',
            days: [1, 2],
            color: '#0EA5E9',
            hotelName: 'JR 東日本札幌標誌酒店',
          },
        ],
        currencies: DEFAULT_CURRENCY_CONFIG,
      },
      itinerary: [
        {
          id: 'd1',
          day: 1,
          baseId: 'b_sapporo',
          title: 'Day 1 抵達札幌',
          subtitle: '',
          highlights: [],
          timeBlocks: [
            {
              id: 'tb1',
              title: '抵達新千歲機場與快速特急',
              period: 'afternoon',
              locationName: 'JR 新千歲機場站',
              description: '搭乘特急前往札幌',
              tags: ['scenic-train'],
            },
            {
              id: 'tb2',
              title: '狸小路商店街採購',
              period: 'evening',
              locationName: '狸小路商店街',
              description: '買伴手禮',
              tags: ['budget-shopping'],
            },
          ],
          foodNotes: [],
        },
        {
          id: 'd2',
          day: 2,
          baseId: 'b_sapporo',
          title: 'Day 2 小樽漫步',
          subtitle: '',
          highlights: [],
          timeBlocks: [
            {
              id: 'tb3',
              title: '小樽運河散步',
              period: 'morning',
              locationName: '小樽運河',
              description: '運河沿岸拍照',
              tags: ['kids-highlight'],
            },
          ],
          foodNotes: [],
        },
      ],
      backlog: [],
      modules: [],
      locations: [],
      expenses: [],
      checklist: [],
      accommodations: [
        {
          id: 'acc1',
          baseId: 'b_sapporo',
          baseNameZh: '札幌',
          hotelName: 'JR 東日本札幌標誌酒店',
          roomType: '雙人房',
          checkInDate: '2027-07-10',
          checkOutDate: '2027-07-13',
          nights: 3,
          bookingPlatform: 'Booking.com',
          confirmationCode: '',
          totalPrice: 50000,
          currency: 'JPY',
          paymentStatus: 'paid',
          paymentStatusLabel: '已付款',
          address: '札幌市北區',
          checkInTimeNotice: '',
          keyPickupNotice: '',
          garbageRulesNotice: '',
          kitchenRulesNotice: '',
        },
      ],
      transports: [],
      bookmarks: [],
    };

    const extracted = extractAllTripLocations(dummyPlan);
    expect(extracted.length).toBeGreaterThanOrEqual(4);

    // 檢查基地/住宿點存在
    const baseLoc = extracted.find((l) => l.category === 'base');
    expect(baseLoc).toBeDefined();

    // 檢查車站點位存在且 category 為 station
    const stationLoc = extracted.find((l) => l.nameZh.includes('千歲'));
    expect(stationLoc).toBeDefined();
    expect(stationLoc?.category).toBe('station');
    expect(stationLoc?.dayNumbers).toContain(1);

    // 檢查購物點位存在且 category 為 shopping
    const shoppingLoc = extracted.find((l) => l.nameZh.includes('狸小路'));
    expect(shoppingLoc).toBeDefined();
    expect(shoppingLoc?.category).toBe('shopping');

    // 檢查小樽運河存在且包含 Day 2
    const canalLoc = extracted.find((l) => l.nameZh.includes('小樽運河'));
    expect(canalLoc).toBeDefined();
    expect(canalLoc?.dayNumbers).toContain(2);
  });
});
