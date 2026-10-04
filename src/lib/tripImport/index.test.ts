import { describe, it, expect } from 'vitest';
import { 
  extractJson, 
  validateTripImport, 
  autoScheduleDayBlocks, 
  importToNewTripPlan, 
  mergeImportToExistingPlan,
  exportTripToAiJson,
  DEMO_SAMPLE_IMPORT_JSON
} from './index';
import type { TripPlan } from '../../types';
import { DEFAULT_CURRENCY_CONFIG } from '../../utils/currency';

describe('tripImport - extractJson', () => {
  it('extracts raw pure JSON correctly', () => {
    const raw = '{"trip": {"name": "Tokyo Tour", "destination": "Japan"}}';
    const res = extractJson(raw);
    expect(res.success).toBe(true);
    expect((res.data as any)?.trip?.name).toBe('Tokyo Tour');
  });

  it('strips markdown code block fences and conversational noise', () => {
    const raw = `
哈囉！這是我為您規劃的行程，請參考以下 JSON：
\`\`\`json
{
  "trip": {
    "name": "瑞士 10 天阿爾卑斯之旅",
    "destination": "瑞士"
  },
  "itinerary": []
}
\`\`\`
希望這個安排符合您的家庭需求！
    `;
    const res = extractJson(raw);
    expect(res.success).toBe(true);
    expect((res.data as any)?.trip?.name).toBe('瑞士 10 天阿爾卑斯之旅');
  });

  it('normalizes full-width quotes and removes trailing commas', () => {
    const raw = `
    {
      “trip”: {
        “name”: “京都慢遊”,
        “destination”: “日本”,
      },
      “itinerary”: [],
    }
    `;
    const res = extractJson(raw);
    expect(res.success).toBe(true);
    expect((res.data as any)?.trip?.name).toBe('京都慢遊');
  });

  it('returns structured error with snippet on invalid JSON', () => {
    const raw = '這是一段完全沒有 JSON 大括號的文字說明';
    const res = extractJson(raw);
    expect(res.success).toBe(false);
    expect(res.error).toContain('缺少大括號');
  });
});

describe('tripImport - validateTripImport', () => {
  it('validates demo sample JSON successfully', () => {
    const parsed = JSON.parse(DEMO_SAMPLE_IMPORT_JSON);
    const res = validateTripImport(parsed);
    expect(res.valid).toBe(true);
    expect(res.errors.length).toBe(0);
    expect(res.data?.trip.name).toBe('日本北海道道央漫遊 6 日');
    expect(res.data?.itinerary.length).toBe(2);
  });

  it('reports error when itinerary is missing or empty', () => {
    const res = validateTripImport({ trip: { name: '無行程' }, itinerary: [] });
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toContain('至少需包含 1 天');
  });

  it('tolerates non-standard time strings with warnings', () => {
    const res = validateTripImport({
      trip: { name: '測試' },
      itinerary: [
        {
          day: 1,
          timeBlocks: [
            { title: '散步', startTime: '早上9點' },
          ],
        },
      ],
    });
    expect(res.valid).toBe(true);
    expect(res.warnings.some((w) => w.includes('非標準 HH:mm'))).toBe(true);
  });
});

describe('tripImport - autoScheduleDayBlocks', () => {
  it('assigns morning, afternoon, and evening times when times are omitted', () => {
    const blocks = [
      { title: '晨間漫步', period: 'morning' as const },
      { title: '午後美術館', period: 'afternoon' as const },
      { title: '夜間夜景', period: 'evening' as const },
    ];
    const { blocks: scheduled } = autoScheduleDayBlocks(blocks, 1);
    expect(scheduled.length).toBe(3);
    expect(scheduled[0].startTime).toBe('09:00');
    expect(scheduled[0].endTime).toBe('10:30');
    expect(scheduled[1].startTime).toBe('13:30');
    expect(scheduled[2].startTime).toBe('18:30');
  });

  it('detects conflicts when times overlap', () => {
    const blocks = [
      { title: '活動 A', startTime: '10:00', endTime: '12:00' },
      { title: '活動 B', startTime: '11:00', endTime: '13:00' },
    ];
    const { warnings } = autoScheduleDayBlocks(blocks, 1);
    expect(warnings.some((w) => w.includes('時間重疊'))).toBe(true);
  });
});

describe('tripImport - mergeImportToExistingPlan (User Rule: Confirmation Code Overwrite)', () => {
  const dummyExistingPlan: TripPlan = {
    id: 'trip_existing',
    name: '現有瑞士旅程',
    destination: '瑞士',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    config: {
      tripName: '現有瑞士旅程',
      subtitle: '',
      startDate: '2027-06-01',
      totalDays: 2,
      travelers: [],
      bases: [{ id: 'b1', name: 'Luzern', nameZh: '琉森', days: [1, 2], color: '#0EA5E9', hotelName: 'Hotel 1' }],
      currencies: DEFAULT_CURRENCY_CONFIG,
    },
    itinerary: [
      {
        id: 'd1',
        day: 1,
        baseId: 'b1',
        title: '舊的第一天',
        subtitle: '',
        highlights: [],
        timeBlocks: [],
        foodNotes: [],
      },
    ],
    backlog: [],
    modules: ['swiss'],
    locations: [],
    expenses: [],
    checklist: [],
    accommodations: [
      {
        id: 'acc_confirmed',
        baseId: 'b1',
        baseNameZh: '琉森',
        hotelName: '已確定訂房的五星飯店',
        roomType: '雙人房',
        checkInDate: '2027-06-01',
        checkOutDate: '2027-06-03',
        nights: 2,
        bookingPlatform: 'Booking.com',
        confirmationCode: 'BOOKING-998877', // ⚠️ 已有確認號！必須保留
        totalPrice: 1200,
        currency: 'CHF',
        paymentStatus: 'paid',
        paymentStatusLabel: '已付款',
        address: 'Bahnhofstrasse 1',
        checkInTimeNotice: '',
        keyPickupNotice: '',
        garbageRulesNotice: '',
        kitchenRulesNotice: '',
      },
      {
        id: 'acc_unconfirmed',
        baseId: 'b1',
        baseNameZh: '琉森',
        hotelName: '暫定未下訂的民宿',
        roomType: '家庭房',
        checkInDate: '2027-06-01',
        checkOutDate: '2027-06-03',
        nights: 2,
        bookingPlatform: 'Airbnb',
        confirmationCode: '', // ⚠️ 沒有確認號！在覆蓋模式下必須被覆蓋/淘汰
        totalPrice: 800,
        currency: 'CHF',
        paymentStatus: 'pay_at_property',
        paymentStatusLabel: '未付款',
        address: 'Old Town 2',
        checkInTimeNotice: '',
        keyPickupNotice: '',
        garbageRulesNotice: '',
        kitchenRulesNotice: '',
      },
    ],
    transports: [
      {
        id: 'tra_confirmed',
        category: 'flight',
        categoryLabel: '機票',
        title: '台北 ➔ 蘇黎世 航班',
        routeFrom: 'TPE',
        routeTo: 'ZRH',
        departureTime: '2027-06-01',
        operatorNumber: 'BR087',
        bookingReference: 'PNR123456', // ⚠️ 已有訂位代號！必須保留
        ticketType: '電子機票',
      },
      {
        id: 'tra_unconfirmed',
        category: 'scenic_train',
        categoryLabel: '景觀火車',
        title: '冰河列車建議班次',
        routeFrom: 'Zermatt',
        routeTo: 'St. Moritz',
        departureTime: '2027-06-02',
        operatorNumber: 'GEX 902',
        bookingReference: '', // ⚠️ 沒有訂位代號！必須被覆蓋/淘汰
        ticketType: '尚未劃位',
      },
    ],
    bookmarks: [],
  };

  it('strictly preserves confirmed bookings and replaces unconfirmed bookings in replace mode', () => {
    const importData = {
      version: '1.0' as const,
      trip: {
        name: '全新 AI 推薦覆蓋行程',
        destination: '瑞士',
      },
      itinerary: [
        {
          day: 1,
          timeBlocks: [{ title: '新行程抵達' }],
        },
      ],
      accommodations: [
        {
          hotelName: 'AI 推薦新飯店',
          confirmationCode: '', // 新匯入的建議
        },
      ],
      transports: [
        {
          title: 'AI 推薦全新高鐵班次',
          bookingReference: '',
        },
      ],
    };

    const { updatedPlan, stats } = mergeImportToExistingPlan(
      dummyExistingPlan,
      importData,
      'replace'
    );

    // 1. 住宿驗證：已有確認碼的保留，未確認的被淘汰，新建議被加入
    expect(stats.preservedAccommodationsCount).toBe(1);
    expect(stats.replacedAccommodationsCount).toBe(1);
    expect(updatedPlan.accommodations.some((a) => a.id === 'acc_confirmed')).toBe(true);
    expect(updatedPlan.accommodations.some((a) => a.id === 'acc_unconfirmed')).toBe(false);
    expect(updatedPlan.accommodations.some((a) => a.hotelName === 'AI 推薦新飯店')).toBe(true);

    // 2. 交通驗證：已有訂位碼的保留，未確認的被淘汰，新建議被加入
    expect(stats.preservedTransportsCount).toBe(1);
    expect(stats.replacedTransportsCount).toBe(1);
    expect(updatedPlan.transports.some((t) => t.id === 'tra_confirmed')).toBe(true);
    expect(updatedPlan.transports.some((t) => t.id === 'tra_unconfirmed')).toBe(false);
    expect(updatedPlan.transports.some((t) => t.title === 'AI 推薦全新高鐵班次')).toBe(true);

    // 3. 行程已被替換為 1 天
    expect(updatedPlan.itinerary.length).toBe(1);
    expect(updatedPlan.itinerary[0].timeBlocks[0].title).toBe('新行程抵達');
  });
});

describe('tripImport - exportTripToAiJson', () => {
  it('converts a TripPlan into clean TripImportV1 structure', () => {
    const newPlanResult = importToNewTripPlan(JSON.parse(DEMO_SAMPLE_IMPORT_JSON));
    const exported = exportTripToAiJson(newPlanResult.plan);
    expect(exported.version).toBe('1.0');
    expect(exported.trip.name).toBe('日本北海道道央漫遊 6 日');
    expect(exported.itinerary.length).toBe(2);
    expect(exported.bases?.length).toBe(2);
  });
});
