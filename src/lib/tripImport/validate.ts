import type { 
  TripImportV1, 
  TripImportDay, 
  TripImportTimeBlock,
  TripImportAccommodation,
  TripImportTransport,
  TripImportBase,
  TripImportChecklistItem
} from './schema';
import type { PersonaTag } from '../../types';

export interface ValidationResult {
  valid: boolean;
  data?: TripImportV1;
  errors: string[];
  warnings: string[];
}

const VALID_PERSONA_TAGS: Set<string> = new Set([
  'senior-friendly',
  'kids-highlight',
  'budget-shopping',
  'scenic-train',
]);

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * 嚴謹且友善的純 TypeScript 結構驗證器
 */
export function validateTripImport(input: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      valid: false,
      errors: ['匯入資料根節點必須是一個 JSON 物件 (object)'],
      warnings: [],
    };
  }

  const raw = input as Record<string, unknown>;

  // 1. 驗證 trip 基本資訊
  const rawTrip = (raw.trip || {}) as Record<string, unknown>;
  const tripName = typeof rawTrip.name === 'string' && rawTrip.name.trim() 
    ? rawTrip.name.trim() 
    : '';
  
  if (!tripName) {
    warnings.push('未提供 trip.name 旅行名稱，將採用預設名稱「AI 規劃探索旅程」');
  }

  const tripDestination = typeof rawTrip.destination === 'string' && rawTrip.destination.trim()
    ? rawTrip.destination.trim()
    : '';

  if (!tripDestination) {
    warnings.push('未提供 trip.destination 目的地，將採用預設「自由行」');
  }

  const startDate = typeof rawTrip.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawTrip.startDate)
    ? rawTrip.startDate
    : null;

  if (rawTrip.startDate && !startDate) {
    warnings.push(`起始日期 "${rawTrip.startDate}" 格式非標準 YYYY-MM-DD，將忽略日期並採用相對 Day 1`);
  }

  // 2. 驗證 itinerary
  if (!raw.itinerary || !Array.isArray(raw.itinerary)) {
    errors.push('itinerary 必須為非空的每日日程陣列 (Array)');
  } else if (raw.itinerary.length === 0) {
    errors.push('itinerary 陣列至少需包含 1 天的行程日程');
  }

  const cleanDays: TripImportDay[] = [];

  if (Array.isArray(raw.itinerary)) {
    raw.itinerary.forEach((rawDay: unknown, dayIdx: number) => {
      if (!rawDay || typeof rawDay !== 'object') {
        errors.push(`itinerary[${dayIdx}] 必須為物件格式`);
        return;
      }

      const d = rawDay as Record<string, unknown>;
      const dayNum = typeof d.day === 'number' && d.day > 0 
        ? d.day 
        : typeof d.day === 'string' && parseInt(d.day, 10) > 0 
          ? parseInt(d.day, 10) 
          : dayIdx + 1;

      if (!d.day) {
        warnings.push(`第 ${dayIdx + 1} 項日程未標示 day 序數，自動指定為 Day ${dayNum}`);
      }

      const cleanBlocks: TripImportTimeBlock[] = [];
      const rawBlocks = Array.isArray(d.timeBlocks) ? d.timeBlocks : [];

      if (!Array.isArray(d.timeBlocks)) {
        warnings.push(`Day ${dayNum} 未包含 timeBlocks 活動時段陣列`);
      }

      rawBlocks.forEach((rawBlock: unknown, blockIdx: number) => {
        if (!rawBlock || typeof rawBlock !== 'object') {
          warnings.push(`Day ${dayNum} 的第 ${blockIdx + 1} 個時段格式無效，已略過`);
          return;
        }

        const b = rawBlock as Record<string, unknown>;
        const title = typeof b.title === 'string' ? b.title.trim() : '';

        if (!title) {
          warnings.push(`Day ${dayNum} 第 ${blockIdx + 1} 個活動缺少 title 標題，已略過`);
          return;
        }

        // 時段 period 檢查
        let period: 'morning' | 'afternoon' | 'evening' | undefined;
        if (b.period === 'morning' || b.period === 'afternoon' || b.period === 'evening') {
          period = b.period;
        } else if (typeof b.period === 'string') {
          const pStr = b.period.toLowerCase();
          if (pStr.includes('morn') || pStr.includes('早') || pStr.includes('上')) period = 'morning';
          else if (pStr.includes('aft') || pStr.includes('午') || pStr.includes('中')) period = 'afternoon';
          else if (pStr.includes('eve') || pStr.includes('晚') || pStr.includes('夜')) period = 'evening';
        }

        // 時間格式檢查
        let startTime = typeof b.startTime === 'string' && TIME_REGEX.test(b.startTime) ? b.startTime : undefined;
        let endTime = typeof b.endTime === 'string' && TIME_REGEX.test(b.endTime) ? b.endTime : undefined;

        if (b.startTime && !startTime) {
          warnings.push(`Day ${dayNum} 活動「${title}」的 startTime "${b.startTime}" 非標準 HH:mm，排程時將自動推算`);
        }
        if (b.endTime && !endTime) {
          warnings.push(`Day ${dayNum} 活動「${title}」的 endTime "${b.endTime}" 非標準 HH:mm，排程時將自動推算`);
        }

        // 標籤檢查
        const cleanTags: PersonaTag[] = [];
        if (Array.isArray(b.tags)) {
          b.tags.forEach((t) => {
            if (typeof t === 'string' && VALID_PERSONA_TAGS.has(t)) {
              cleanTags.push(t as PersonaTag);
            }
          });
        }

        cleanBlocks.push({
          id: typeof b.id === 'string' ? b.id : undefined,
          period,
          periodLabel: typeof b.periodLabel === 'string' ? b.periodLabel : undefined,
          startTime,
          endTime,
          durationMin: typeof b.durationMin === 'number' && b.durationMin > 0 ? b.durationMin : undefined,
          title,
          description: typeof b.description === 'string' ? b.description.trim() : undefined,
          locationName: typeof b.locationName === 'string' ? b.locationName.trim() : undefined,
          coordinates: Array.isArray(b.coordinates) && b.coordinates.length === 2 ? [b.coordinates[0], b.coordinates[1]] : undefined,
          altitude: typeof b.altitude === 'number' ? b.altitude : undefined,
          tags: cleanTags,
          tips: Array.isArray(b.tips) ? b.tips.filter((tip): tip is string => typeof tip === 'string') : undefined,
          transport: b.transport && typeof b.transport === 'object' ? (b.transport as any) : undefined,
        });
      });

      cleanDays.push({
        day: dayNum,
        baseId: typeof d.baseId === 'string' ? d.baseId : undefined,
        title: typeof d.title === 'string' ? d.title.trim() : `第 ${dayNum} 天 行程`,
        subtitle: typeof d.subtitle === 'string' ? d.subtitle.trim() : undefined,
        highlights: Array.isArray(d.highlights) ? d.highlights.filter((h): h is string => typeof h === 'string') : [],
        timeBlocks: cleanBlocks,
        foodNotes: Array.isArray(d.foodNotes) ? (d.foodNotes as any[]) : undefined,
        supermarketTips: Array.isArray(d.supermarketTips) ? d.supermarketTips.filter((s): s is string => typeof s === 'string') : undefined,
        weatherAlert: typeof d.weatherAlert === 'string' ? d.weatherAlert : undefined,
        packingReminders: Array.isArray(d.packingReminders) ? d.packingReminders.filter((p): p is string => typeof p === 'string') : undefined,
        customNotes: typeof d.customNotes === 'string' ? d.customNotes : undefined,
      });
    });
  }

  // 3. 檢查 bases 基地
  const cleanBases: TripImportBase[] = [];
  if (Array.isArray(raw.bases)) {
    raw.bases.forEach((b: unknown, idx: number) => {
      if (b && typeof b === 'object') {
        const item = b as Record<string, unknown>;
        const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `base_${idx + 1}`;
        const name = typeof item.name === 'string' && item.name.trim() ? item.name.trim() : `基地 ${idx + 1}`;
        cleanBases.push({
          id,
          name,
          nameZh: typeof item.nameZh === 'string' ? item.nameZh : undefined,
          days: Array.isArray(item.days) ? item.days.filter((d): d is number => typeof d === 'number') : undefined,
          color: typeof item.color === 'string' ? item.color : undefined,
          hotelName: typeof item.hotelName === 'string' ? item.hotelName : undefined,
          hotelAddress: typeof item.hotelAddress === 'string' ? item.hotelAddress : undefined,
          coordinates: Array.isArray(item.coordinates) && item.coordinates.length === 2 ? [item.coordinates[0], item.coordinates[1]] : undefined,
          notes: typeof item.notes === 'string' ? item.notes : undefined,
        });
      }
    });
  }

  // 4. 檢查 accommodations 住宿預訂
  const cleanAccommodations: TripImportAccommodation[] = [];
  if (Array.isArray(raw.accommodations)) {
    raw.accommodations.forEach((acc: unknown, idx: number) => {
      if (acc && typeof acc === 'object') {
        const a = acc as Record<string, unknown>;
        const hotelName = typeof a.hotelName === 'string' && a.hotelName.trim() ? a.hotelName.trim() : '';
        if (!hotelName) {
          warnings.push(`住宿清單第 ${idx + 1} 筆缺少 hotelName，已略過`);
          return;
        }
        cleanAccommodations.push({
          id: typeof a.id === 'string' ? a.id : undefined,
          baseId: typeof a.baseId === 'string' ? a.baseId : undefined,
          baseNameZh: typeof a.baseNameZh === 'string' ? a.baseNameZh : undefined,
          hotelName,
          roomType: typeof a.roomType === 'string' ? a.roomType : undefined,
          checkInDate: typeof a.checkInDate === 'string' ? a.checkInDate : undefined,
          checkOutDate: typeof a.checkOutDate === 'string' ? a.checkOutDate : undefined,
          nights: typeof a.nights === 'number' ? a.nights : undefined,
          bookingPlatform: typeof a.bookingPlatform === 'string' ? a.bookingPlatform : undefined,
          confirmationCode: typeof a.confirmationCode === 'string' ? a.confirmationCode.trim() : undefined,
          totalPrice: typeof a.totalPrice === 'number' ? a.totalPrice : undefined,
          currency: typeof a.currency === 'string' ? a.currency : undefined,
          paymentStatus: a.paymentStatus === 'paid' || a.paymentStatus === 'pay_at_property' || a.paymentStatus === 'deposit_paid' ? a.paymentStatus : undefined,
          address: typeof a.address === 'string' ? a.address : undefined,
          googleMapsUrl: typeof a.googleMapsUrl === 'string' ? a.googleMapsUrl : undefined,
          contactPhone: typeof a.contactPhone === 'string' ? a.contactPhone : undefined,
          contactEmail: typeof a.contactEmail === 'string' ? a.contactEmail : undefined,
          checkInTimeNotice: typeof a.checkInTimeNotice === 'string' ? a.checkInTimeNotice : undefined,
          keyPickupNotice: typeof a.keyPickupNotice === 'string' ? a.keyPickupNotice : undefined,
          garbageRulesNotice: typeof a.garbageRulesNotice === 'string' ? a.garbageRulesNotice : undefined,
          kitchenRulesNotice: typeof a.kitchenRulesNotice === 'string' ? a.kitchenRulesNotice : undefined,
          notes: typeof a.notes === 'string' ? a.notes : undefined,
        });
      }
    });
  }

  // 5. 檢查 transports 交通預訂
  const cleanTransports: TripImportTransport[] = [];
  if (Array.isArray(raw.transports)) {
    raw.transports.forEach((tra: unknown, idx: number) => {
      if (tra && typeof tra === 'object') {
        const t = tra as Record<string, unknown>;
        const title = typeof t.title === 'string' && t.title.trim() ? t.title.trim() : '';
        if (!title) {
          warnings.push(`交通清單第 ${idx + 1} 筆缺少 title，已略過`);
          return;
        }
        cleanTransports.push({
          id: typeof t.id === 'string' ? t.id : undefined,
          category: t.category as any,
          categoryLabel: typeof t.categoryLabel === 'string' ? t.categoryLabel : undefined,
          title,
          routeFrom: typeof t.routeFrom === 'string' ? t.routeFrom : undefined,
          routeTo: typeof t.routeTo === 'string' ? t.routeTo : undefined,
          departureTime: typeof t.departureTime === 'string' ? t.departureTime : undefined,
          arrivalTime: typeof t.arrivalTime === 'string' ? t.arrivalTime : undefined,
          operatorNumber: typeof t.operatorNumber === 'string' ? t.operatorNumber : undefined,
          bookingReference: typeof t.bookingReference === 'string' ? t.bookingReference.trim() : undefined,
          seatsInfo: typeof t.seatsInfo === 'string' ? t.seatsInfo : undefined,
          ticketType: typeof t.ticketType === 'string' ? t.ticketType : undefined,
          totalPrice: typeof t.totalPrice === 'number' ? t.totalPrice : undefined,
          currency: typeof t.currency === 'string' ? t.currency : undefined,
          platformNotice: typeof t.platformNotice === 'string' ? t.platformNotice : undefined,
          luggageNotice: typeof t.luggageNotice === 'string' ? t.luggageNotice : undefined,
          boardingNotice: typeof t.boardingNotice === 'string' ? t.boardingNotice : undefined,
          notes: typeof t.notes === 'string' ? t.notes : undefined,
        });
      }
    });
  }

  // 6. 檢查 checklist
  const cleanChecklist: TripImportChecklistItem[] = [];
  if (Array.isArray(raw.checklist)) {
    raw.checklist.forEach((item: unknown) => {
      if (item && typeof item === 'object') {
        const c = item as Record<string, unknown>;
        const text = typeof c.item === 'string' ? c.item.trim() : '';
        if (text) {
          cleanChecklist.push({
            category: typeof c.category === 'string' ? c.category : undefined,
            categoryLabel: typeof c.categoryLabel === 'string' ? c.categoryLabel : undefined,
            item: text,
            priority: c.priority === 'high' || c.priority === 'medium' || c.priority === 'low' ? c.priority : undefined,
          });
        }
      }
    });
  }

  // 7. 檢查 backlog
  const cleanBacklog: TripImportTimeBlock[] = [];
  if (Array.isArray(raw.backlog)) {
    raw.backlog.forEach((item: unknown) => {
      if (item && typeof item === 'object') {
        const b = item as Record<string, unknown>;
        const title = typeof b.title === 'string' ? b.title.trim() : '';
        if (title) {
          cleanBacklog.push({
            id: typeof b.id === 'string' ? b.id : undefined,
            title,
            description: typeof b.description === 'string' ? b.description : undefined,
            locationName: typeof b.locationName === 'string' ? b.locationName : undefined,
            tags: Array.isArray(b.tags) ? (b.tags as PersonaTag[]) : [],
          });
        }
      }
    });
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      warnings,
    };
  }

  const data: TripImportV1 = {
    version: '1.0',
    trip: {
      name: tripName || 'AI 規劃探索旅程',
      destination: tripDestination || '自由行',
      subtitle: typeof rawTrip.subtitle === 'string' ? rawTrip.subtitle : undefined,
      startDate,
      totalDays: typeof rawTrip.totalDays === 'number' && rawTrip.totalDays > 0 ? rawTrip.totalDays : cleanDays.length,
      coverEmoji: typeof rawTrip.coverEmoji === 'string' ? rawTrip.coverEmoji : undefined,
      currencyPrimary: typeof rawTrip.currencyPrimary === 'string' ? rawTrip.currencyPrimary : undefined,
    },
    bases: cleanBases.length > 0 ? cleanBases : undefined,
    itinerary: cleanDays,
    backlog: cleanBacklog.length > 0 ? cleanBacklog : undefined,
    accommodations: cleanAccommodations.length > 0 ? cleanAccommodations : undefined,
    transports: cleanTransports.length > 0 ? cleanTransports : undefined,
    checklist: cleanChecklist.length > 0 ? cleanChecklist : undefined,
    locations: Array.isArray(raw.locations) ? (raw.locations as any[]) : undefined,
  };

  return {
    valid: true,
    data,
    errors: [],
    warnings,
  };
}
