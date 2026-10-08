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

  it('strictly excludes demo template bases like "盧塞恩住宿基地" and accurately reflects only the 4 accommodations', () => {
    const tripWith4Hotels: TripPlan = {
      id: 'trip_custom_swiss_10d',
      name: '瑞士純淨阿爾卑斯 10 日遊',
      destination: '瑞士',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      config: {
        tripName: '瑞士純淨阿爾卑斯 10 日遊',
        subtitle: '',
        startDate: '2027-06-01',
        totalDays: 10,
        travelers: [],
        bases: [
          { id: 'b_stmoritz', name: 'St. Moritz', nameZh: '聖莫里茨', days: [1, 2], color: '#0EA5E9', hotelName: '聖莫里茨湖畔度假飯店' },
          { id: 'b_zermatt', name: 'Zermatt', nameZh: '策馬特', days: [3, 4, 5], color: '#10B981', hotelName: '策馬特高山木屋' },
          { id: 'b_grindelwald', name: 'Grindelwald', nameZh: '格林德瓦', days: [6, 7, 8], color: '#F59E0B', hotelName: '格林德瓦冰川景觀飯店' },
          { id: 'b_luzern', name: 'Luzern', nameZh: '琉森', days: [9, 10], color: '#8B5CF6', hotelName: '琉森湖畔古典飯店' },
        ],
        currencies: DEFAULT_CURRENCY_CONFIG,
      },
      itinerary: [],
      backlog: [],
      modules: ['swiss'],
      locations: [
        // 模擬可能遺留的舊示範點
        { id: 'loc-demo-luzern', name: 'Luzern Base', nameZh: '盧塞恩住宿基地', coordinates: [47.0502, 8.3093], category: 'base', dayNumbers: [1], description: '舊示範' }
      ],
      expenses: [],
      checklist: [],
      accommodations: [
        { id: 'acc_1', baseId: 'b_stmoritz', baseNameZh: '聖莫里茨', hotelName: '聖莫里茨湖畔度假飯店', roomType: '湖景雙人房', checkInDate: '2027-06-01', checkOutDate: '2027-06-03', nights: 2, bookingPlatform: 'Agoda', confirmationCode: '', totalPrice: 600, currency: 'CHF', paymentStatus: 'pay_at_property', paymentStatusLabel: '現場付款', address: 'Via Serlas 27', checkInTimeNotice: '', keyPickupNotice: '', garbageRulesNotice: '', kitchenRulesNotice: '' },
        { id: 'acc_2', baseId: 'b_zermatt', baseNameZh: '策馬特', hotelName: '策馬特高山木屋', roomType: '馬特洪峰景觀房', checkInDate: '2027-06-03', checkOutDate: '2027-06-06', nights: 3, bookingPlatform: 'Booking', confirmationCode: '', totalPrice: 900, currency: 'CHF', paymentStatus: 'pay_at_property', paymentStatusLabel: '現場付款', address: 'Bahnhofstrasse 12', checkInTimeNotice: '', keyPickupNotice: '', garbageRulesNotice: '', kitchenRulesNotice: '' },
        { id: 'acc_3', baseId: 'b_grindelwald', baseNameZh: '格林德瓦', hotelName: '格林德瓦冰川景觀飯店', roomType: '艾格峰景家庭房', checkInDate: '2027-06-06', checkOutDate: '2027-06-09', nights: 3, bookingPlatform: 'Hotels.com', confirmationCode: '', totalPrice: 1050, currency: 'CHF', paymentStatus: 'pay_at_property', paymentStatusLabel: '現場付款', address: 'Dorfstrasse 88', checkInTimeNotice: '', keyPickupNotice: '', garbageRulesNotice: '', kitchenRulesNotice: '' },
        { id: 'acc_4', baseId: 'b_luzern', baseNameZh: '琉森', hotelName: '琉森湖畔古典飯店', roomType: '湖畔奢華套房', checkInDate: '2027-06-09', checkOutDate: '2027-06-11', nights: 2, bookingPlatform: 'Official', confirmationCode: '', totalPrice: 800, currency: 'CHF', paymentStatus: 'pay_at_property', paymentStatusLabel: '現場付款', address: 'Schweizerhofquai 3', checkInTimeNotice: '', keyPickupNotice: '', garbageRulesNotice: '', kitchenRulesNotice: '' },
      ],
      transports: [],
      bookmarks: [],
    };

    const extracted = extractAllTripLocations(tripWith4Hotels);
    const baseLocations = extracted.filter((l) => l.category === 'base');

    // 1. 住宿基地分類必須精準剛好是 4 筆住宿
    expect(baseLocations.length).toBe(4);

    // 2. 舊範本的「盧塞恩住宿基地」必須被徹底剔除
    const demoBase = extracted.find((l) => l.nameZh === '盧塞恩住宿基地');
    expect(demoBase).toBeUndefined();

    // 3. 這 4 筆住宿必須精確對應
    expect(baseLocations.some((b) => b.nameZh.includes('聖莫里茨湖畔度假飯店'))).toBe(true);
    expect(baseLocations.some((b) => b.nameZh.includes('策馬特高山木屋'))).toBe(true);
    expect(baseLocations.some((b) => b.nameZh.includes('格林德瓦冰川景觀飯店'))).toBe(true);
    expect(baseLocations.some((b) => b.nameZh.includes('琉森湖畔古典飯店'))).toBe(true);
  });

  it('extracts precise coordinates and assigns peak category from googleMapsUrl and scenic subCategories', () => {
    const tripWithCustomSpot: TripPlan = {
      id: 'trip_custom_spot',
      name: '瑞士名峰測試',
      destination: '瑞士',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      config: {
        tripName: '瑞士名峰測試',
        subtitle: '',
        startDate: '2027-06-01',
        totalDays: 1,
        travelers: [],
        bases: [],
        currencies: DEFAULT_CURRENCY_CONFIG,
      },
      itinerary: [
        {
          id: 'd1',
          day: 1,
          baseId: 'b1',
          title: 'Day 1 名峰日',
          subtitle: '',
          highlights: [],
          timeBlocks: [
            {
              id: 'tb_matterhorn',
              title: '馬特洪峰冰川天堂',
              locationName: 'Matterhorn Glacier Paradise',
              description: '最高纜車站體驗',
              period: 'morning',
              tags: ['scenic-train'],
              category: 'peak',
              subCategories: ['peak'],
              googleMapsUrl: 'https://www.google.com/maps/place/Matterhorn+Glacier+Paradise/@45.9383,7.7297,15z/data=!3d45.9383!4d7.7297',
            },
          ],
          foodNotes: [],
        },
      ],
      backlog: [],
      modules: ['swiss'],
      locations: [],
      expenses: [],
      checklist: [],
      accommodations: [],
      transports: [],
      bookmarks: [],
    };

    const extracted = extractAllTripLocations(tripWithCustomSpot);
    expect(extracted.length).toBe(1);
    const spot = extracted[0];

    // 分類應為 peak (高山名峰) 而非預設的 station
    expect(spot.category).toBe('peak');
    // 應精確解析出 Google Maps URL 中的座標
    expect(spot.coordinates[0]).toBeCloseTo(45.9383, 3);
    expect(spot.coordinates[1]).toBeCloseTo(7.7297, 3);
    // 應保留 googleMapsUrl 以便地圖導航
    expect(spot.googleMapsUrl).toContain('Matterhorn+Glacier+Paradise');
  });
});
