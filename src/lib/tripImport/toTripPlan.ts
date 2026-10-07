import type { 
  TripPlan, 
  DayItinerary, 
  BaseInfo, 
  AccommodationBooking, 
  TransportBooking, 
  ChecklistItem, 
  TimeBlock,
  TripConfig,
  MapLocation
} from '../../types';
import type { TripImportV1 } from './schema';
import { autoScheduleDayBlocks } from './schedule';
import { DEFAULT_CHECKLIST } from '../../data/clothing-checklist';
import { DEFAULT_CURRENCY_CONFIG } from '../../utils/currency';
import { extractAllTripLocations, inferCoordinates } from '../geo';

export interface ConvertResult {
  plan: TripPlan;
  warnings: string[];
}

export interface MergeResult {
  updatedPlan: TripPlan;
  warnings: string[];
  stats: {
    preservedAccommodationsCount: number;
    replacedAccommodationsCount: number;
    preservedTransportsCount: number;
    replacedTransportsCount: number;
    daysCount: number;
  };
}

/** 預設色票供基地分配 */
const BASE_COLORS = ['#0EA5E9', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6'];

/** 輔助：從匯入的 bases 與 accommodations 動態建立精準的住宿地區清單 */
function deriveBases(
  importBases?: any[],
  importAccommodations?: any[],
  destination: string = ''
): BaseInfo[] {
  const bases: BaseInfo[] = [];
  const seenNames = new Set<string>();

  if (importBases && importBases.length > 0) {
    importBases.forEach((b, idx) => {
      const name = b.nameZh || b.name || `住宿地區 ${idx + 1}`;
      seenNames.add(name.toLowerCase());
      bases.push({
        id: b.id || `base_${idx + 1}`,
        name: b.name || name,
        nameZh: name,
        days: b.days || [],
        color: b.color || BASE_COLORS[idx % BASE_COLORS.length],
        hotelName: b.hotelName || `${name} 推薦住宿`,
        hotelAddress: b.hotelAddress,
        coordinates: b.coordinates || inferCoordinates(name, b.hotelName, destination),
        notes: b.notes,
      });
    });
  }

  // 若還有 accommodations 中未涵蓋的地區，自動補充或從 accommodations 提煉真實基地
  if (importAccommodations && importAccommodations.length > 0) {
    importAccommodations.forEach((acc, idx) => {
      // 若該住宿已經對應到已存在的 baseId，則直接跳過，不重複建立
      if (acc.baseId && bases.some((b) => b.id === acc.baseId)) {
        return;
      }

      const area = (acc.baseNameZh || '').trim() || (acc.hotelName || '').trim();
      const normArea = area.toLowerCase();

      // 若既有基地已有此名稱或地區，亦不重複建立
      if (bases.some((b) => b.nameZh?.toLowerCase().includes(normArea) || b.name?.toLowerCase().includes(normArea))) {
        return;
      }

      if (area && !seenNames.has(normArea)) {
        seenNames.add(normArea);
        const coords = inferCoordinates(acc.hotelName, acc.address, `${area} ${destination}`);
        bases.push({
          id: acc.baseId || `base_acc_${idx + 1}`,
          name: area,
          nameZh: area,
          days: [],
          color: BASE_COLORS[bases.length % BASE_COLORS.length],
          hotelName: acc.hotelName,
          hotelAddress: acc.address,
          coordinates: coords,
        });
      }
    });
  }

  if (bases.length === 0) {
    // 備援主基地
    bases.push({
      id: 'base_main',
      name: destination || '主要基地',
      nameZh: destination || '主要基地',
      days: [],
      color: '#0EA5E9',
      hotelName: '市中心便利住宿',
    });
  }

  return bases;
}

/**
 * 將匯入資料轉換為全新獨立的 TripPlan
 */
export function importToNewTripPlan(importData: TripImportV1): ConvertResult {
  const warnings: string[] = [];
  const tripId = `trip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const nowIso = new Date().toISOString();
  const destination = importData.trip.destination || importData.trip.name || '';

  // 1. 動態整理真實基地 Bases
  const bases = deriveBases(importData.bases, importData.accommodations, destination);
  const defaultBaseId = bases[0].id;

  // 2. 排程每日日程
  const itinerary: DayItinerary[] = [];
  importData.itinerary.forEach((dayData, idx) => {
    const dayNumber = dayData.day || idx + 1;
    // 嘗試智能匹配 baseId：若 day 指定了 baseId 且存在則使用；若無則依天數區間或首個 base
    let baseId = dayData.baseId && bases.some((b) => b.id === dayData.baseId) 
      ? dayData.baseId 
      : defaultBaseId;

    if (!dayData.baseId && bases.length > 1) {
      // 平均依天數分攤至各 base
      const daysPerBase = Math.max(1, Math.ceil(importData.itinerary.length / bases.length));
      const baseIdx = Math.min(Math.floor(idx / daysPerBase), bases.length - 1);
      baseId = bases[baseIdx].id;
    }

    const { blocks, warnings: dayWarnings } = autoScheduleDayBlocks(
      dayData.timeBlocks || [],
      dayNumber
    );
    warnings.push(...dayWarnings);

    itinerary.push({
      id: `day_${dayNumber}_${Math.random().toString(36).slice(2, 6)}`,
      day: dayNumber,
      baseId,
      title: dayData.title || `第 ${dayNumber} 天 探索日程`,
      subtitle: dayData.subtitle || `${importData.trip.destination} 漫遊`,
      highlights: dayData.highlights || [],
      timeBlocks: blocks,
      foodNotes: dayData.foodNotes || [],
      supermarketTips: dayData.supermarketTips,
      weatherAlert: dayData.weatherAlert,
      packingReminders: dayData.packingReminders,
      customNotes: dayData.customNotes,
    });
  });

  // 更新 bases 的 days 涵蓋
  bases.forEach((b) => {
    if (!b.days || b.days.length === 0) {
      b.days = itinerary.filter((d) => d.baseId === b.id).map((d) => d.day);
    }
  });

  // 3. 處理住宿預訂 Accommodations
  const accommodations: AccommodationBooking[] = [];
  if (importData.accommodations && importData.accommodations.length > 0) {
    importData.accommodations.forEach((acc, idx) => {
      // 依 baseId 或 baseNameZh 找到對應的 base
      const baseObj = bases.find((b) => b.id === acc.baseId || b.nameZh === acc.baseNameZh) || bases[idx % bases.length] || bases[0];
      accommodations.push({
        id: acc.id || `acc_${Date.now()}_${idx + 1}`,
        baseId: baseObj.id,
        baseNameZh: acc.baseNameZh || baseObj.nameZh,
        hotelName: acc.hotelName,
        roomType: acc.roomType || '家庭套房 / 雙人房',
        checkInDate: acc.checkInDate || importData.trip.startDate || new Date().toISOString().split('T')[0],
        checkOutDate: acc.checkOutDate || importData.trip.startDate || new Date().toISOString().split('T')[0],
        nights: acc.nights || 1,
        bookingPlatform: acc.bookingPlatform || 'AI 匯入建議',
        confirmationCode: acc.confirmationCode || '',
        totalPrice: acc.totalPrice || 0,
        currency: acc.currency || importData.trip.currencyPrimary || 'TWD',
        paymentStatus: acc.paymentStatus || 'pay_at_property',
        paymentStatusLabel: acc.paymentStatus === 'paid' ? '已付款' : '現場付款',
        address: acc.address || baseObj.hotelAddress || '',
        googleMapsUrl: acc.googleMapsUrl,
        contactPhone: acc.contactPhone,
        contactEmail: acc.contactEmail,
        checkInTimeNotice: acc.checkInTimeNotice || '入住 15:00 以後 / 退房 11:00 前',
        keyPickupNotice: acc.keyPickupNotice || '櫃檯辦理入住或密碼盒取鑰',
        garbageRulesNotice: acc.garbageRulesNotice || '請配合當地垃圾分類',
        kitchenRulesNotice: acc.kitchenRulesNotice || '使用廚房請維持清潔',
        notes: acc.notes,
      });
    });
  }

  // 4. 處理交通預訂 Transports
  const transports: TransportBooking[] = [];
  if (importData.transports && importData.transports.length > 0) {
    importData.transports.forEach((tra, idx) => {
      transports.push({
        id: tra.id || `tra_${Date.now()}_${idx + 1}`,
        category: tra.category || 'scenic_train',
        categoryLabel: tra.categoryLabel || '主要交通',
        title: tra.title,
        routeFrom: tra.routeFrom || '出發地',
        routeTo: tra.routeTo || '目的地',
        departureTime: tra.departureTime || '',
        arrivalTime: tra.arrivalTime,
        operatorNumber: tra.operatorNumber || '',
        bookingReference: tra.bookingReference || '',
        seatsInfo: tra.seatsInfo,
        ticketType: tra.ticketType || '電子車票',
        totalPrice: tra.totalPrice,
        currency: tra.currency || importData.trip.currencyPrimary || 'TWD',
        platformNotice: tra.platformNotice,
        luggageNotice: tra.luggageNotice,
        boardingNotice: tra.boardingNotice,
        notes: tra.notes,
      });
    });
  }

  // 5. 處理待排池 Backlog
  const backlog: TimeBlock[] = [];
  if (importData.backlog && importData.backlog.length > 0) {
    importData.backlog.forEach((b, idx) => {
      backlog.push({
        id: b.id || `backlog_${idx + 1}_${Math.random().toString(36).slice(2, 6)}`,
        period: b.period || 'afternoon',
        title: b.title,
        description: b.description || '',
        locationName: b.locationName,
        tags: b.tags || [],
        tips: b.tips,
      });
    });
  }

  // 6. 處理清單 Checklist
  const checklist: ChecklistItem[] = [];
  if (importData.checklist && importData.checklist.length > 0) {
    importData.checklist.forEach((c, idx) => {
      checklist.push({
        id: `chk_${idx + 1}_${Math.random().toString(36).slice(2, 6)}`,
        category: (c.category as any) || 'documents',
        categoryLabel: c.categoryLabel || '必備物品',
        item: c.item,
        checked: false,
        priority: c.priority || 'medium',
      });
    });
  } else {
    // 預設帶入通用行前清單
    checklist.push(...DEFAULT_CHECKLIST.map((item) => ({ ...item, checked: false })));
  }

  // 7. 組合 Config
  const config: TripConfig = {
    tripName: importData.trip.name,
    subtitle: importData.trip.subtitle || `${importData.trip.destination} 探索日程`,
    startDate: importData.trip.startDate || null,
    totalDays: itinerary.length,
    travelers: [
      { id: 't1', name: '我', role: 'adult', roleLabel: '成人', age: 30, tags: ['senior-friendly'] }
    ],
    bases,
    currencies: {
      primary: importData.trip.currencyPrimary || 'TWD',
      rates: DEFAULT_CURRENCY_CONFIG.rates,
    },
  };

  // 8. 組合地圖點位 Locations (從日程時段中自動提煉或帶入 locations)
  const locations: MapLocation[] = [];
  if (importData.locations && importData.locations.length > 0) {
    importData.locations.forEach((loc, idx) => {
      if (loc.name && loc.coordinates) {
        locations.push({
          id: loc.id || `loc_${idx + 1}`,
          name: loc.name,
          nameZh: loc.nameZh || loc.name,
          coordinates: loc.coordinates,
          category: loc.category || 'attraction',
          description: loc.description || '',
          dayNumbers: loc.dayNumbers || [1],
          stpNote: loc.stpNote,
          altitude: loc.altitude,
        });
      }
    });
  }

  const isSwiss = importData.trip.destination.toLowerCase().includes('swiss') || 
                  importData.trip.destination.includes('瑞士');

  const newPlan: TripPlan = {
    id: tripId,
    name: importData.trip.name,
    destination: importData.trip.destination,
    coverEmoji: importData.trip.coverEmoji || (isSwiss ? '🇨🇭' : '✈️'),
    createdAt: nowIso,
    updatedAt: nowIso,
    config,
    itinerary,
    backlog,
    modules: isSwiss ? ['swiss'] : [],
    locations,
    expenses: [],
    checklist,
    accommodations,
    transports,
    bookmarks: [],
  };

  newPlan.locations = extractAllTripLocations(newPlan);

  return {
    plan: newPlan,
    warnings,
  };
}

/**
 * 將匯入資料套用至現有旅程（覆蓋模式或追加模式）
 * 遵循使用者核心規則：
 * 覆蓋模式下：如果住宿跟交通預訂沒有訂單號碼則直接進行覆蓋，已有訂單號碼的則予以保留！
 */
export function mergeImportToExistingPlan(
  existingPlan: TripPlan,
  importData: TripImportV1,
  mode: 'replace' | 'append',
  opts?: { replaceChecklist?: boolean }
): MergeResult {
  const warnings: string[] = [];
  const nowIso = new Date().toISOString();

  // 1. 處理住宿預訂 Accommodations
  // 找出既有預訂中「有訂單編號」的（予以保留）
  const preservedAccommodations = existingPlan.accommodations.filter(
    (acc) => typeof acc.confirmationCode === 'string' && acc.confirmationCode.trim().length > 0
  );
  const replacedAccommodationsCount = existingPlan.accommodations.length - preservedAccommodations.length;

  // 轉換匯入的住宿清單
  const importedAccommodations: AccommodationBooking[] = (importData.accommodations || []).map((acc, idx) => {
    return {
      id: acc.id || `acc_imp_${Date.now()}_${idx + 1}`,
      baseId: acc.baseId || existingPlan.config.bases[0]?.id || 'base_main',
      baseNameZh: acc.baseNameZh || existingPlan.config.bases[0]?.nameZh || '住宿基地',
      hotelName: acc.hotelName,
      roomType: acc.roomType || '標準客房',
      checkInDate: acc.checkInDate || existingPlan.config.startDate || '',
      checkOutDate: acc.checkOutDate || existingPlan.config.startDate || '',
      nights: acc.nights || 1,
      bookingPlatform: acc.bookingPlatform || 'AI 匯入建議',
      confirmationCode: acc.confirmationCode || '',
      totalPrice: acc.totalPrice || 0,
      currency: acc.currency || existingPlan.config.currencies?.primary || 'TWD',
      paymentStatus: acc.paymentStatus || 'pay_at_property',
      paymentStatusLabel: acc.paymentStatus === 'paid' ? '已付款' : '現場付款',
      address: acc.address || '',
      googleMapsUrl: acc.googleMapsUrl,
      contactPhone: acc.contactPhone,
      contactEmail: acc.contactEmail,
      checkInTimeNotice: acc.checkInTimeNotice || '入住 15:00 以後 / 退房 11:00 前',
      keyPickupNotice: acc.keyPickupNotice || '櫃檯辦理入住或密碼盒取鑰',
      garbageRulesNotice: acc.garbageRulesNotice || '請配合當地垃圾分類',
      kitchenRulesNotice: acc.kitchenRulesNotice || '使用廚房請維持清潔',
      notes: acc.notes,
    };
  });

  // 合併住宿：保留有訂單號碼的 + 匯入的新建議
  const nextAccommodations = [...preservedAccommodations, ...importedAccommodations];

  // 2. 處理交通預訂 Transports
  // 找出既有交通中「有訂位代碼」的（予以保留）
  const preservedTransports = existingPlan.transports.filter(
    (tra) => typeof tra.bookingReference === 'string' && tra.bookingReference.trim().length > 0
  );
  const replacedTransportsCount = existingPlan.transports.length - preservedTransports.length;

  // 轉換匯入的交通清單
  const importedTransports: TransportBooking[] = (importData.transports || []).map((tra, idx) => {
    return {
      id: tra.id || `tra_imp_${Date.now()}_${idx + 1}`,
      category: tra.category || 'scenic_train',
      categoryLabel: tra.categoryLabel || '推薦交通',
      title: tra.title,
      routeFrom: tra.routeFrom || '出發地',
      routeTo: tra.routeTo || '目的地',
      departureTime: tra.departureTime || '',
      arrivalTime: tra.arrivalTime,
      operatorNumber: tra.operatorNumber || '',
      bookingReference: tra.bookingReference || '',
      seatsInfo: tra.seatsInfo,
      ticketType: tra.ticketType || '電子車票',
      totalPrice: tra.totalPrice,
      currency: tra.currency || existingPlan.config.currencies?.primary || 'TWD',
      platformNotice: tra.platformNotice,
      luggageNotice: tra.luggageNotice,
      boardingNotice: tra.boardingNotice,
      notes: tra.notes,
    };
  });

  const nextTransports = [...preservedTransports, ...importedTransports];

  // 3. 處理基地 Bases
  let nextBases: BaseInfo[] = [];

  if (mode === 'replace') {
    // 覆蓋模式：先提取匯入的新 bases (或從 accommodations 提煉)
    const freshBases = deriveBases(
      importData.bases,
      importData.accommodations,
      existingPlan.destination || existingPlan.name
    );

    // 若有因含訂單編號而保留的舊住宿，保留其關聯的舊 base
    const preservedBaseIds = new Set(preservedAccommodations.map((a) => a.baseId));
    const retainedBases = existingPlan.config.bases.filter((b) => preservedBaseIds.has(b.id));

    // 合併 freshBases 與 retainedBases (去重)
    nextBases = [...retainedBases];
    freshBases.forEach((fb) => {
      if (!nextBases.some((b) => b.id === fb.id || b.nameZh === fb.nameZh)) {
        nextBases.push(fb);
      }
    });
  } else {
    // 追加模式：保留原有 bases 並擴增
    nextBases = [...existingPlan.config.bases];
    if (importData.bases && importData.bases.length > 0) {
      importData.bases.forEach((b, idx) => {
        const existingIdx = nextBases.findIndex((eb) => eb.id === b.id || eb.name === b.name);
        if (existingIdx >= 0) {
          nextBases[existingIdx] = {
            ...nextBases[existingIdx],
            nameZh: b.nameZh || nextBases[existingIdx].nameZh,
            hotelName: b.hotelName || nextBases[existingIdx].hotelName,
            hotelAddress: b.hotelAddress || nextBases[existingIdx].hotelAddress,
            coordinates: b.coordinates || nextBases[existingIdx].coordinates,
            notes: b.notes || nextBases[existingIdx].notes,
          };
        } else {
          nextBases.push({
            id: b.id || `base_imp_${Date.now()}_${idx + 1}`,
            name: b.name,
            nameZh: b.nameZh || b.name,
            days: b.days || [],
            color: b.color || BASE_COLORS[nextBases.length % BASE_COLORS.length],
            hotelName: b.hotelName || `${b.name} 住宿`,
            hotelAddress: b.hotelAddress,
            coordinates: b.coordinates,
            notes: b.notes,
          });
        }
      });
    }
  }

  const defaultBaseId = nextBases[0]?.id || 'base_main';

  // 4. 處理行程 Itinerary (replace vs append)
  let nextItinerary: DayItinerary[] = [];

  if (mode === 'replace') {
    importData.itinerary.forEach((dayData, idx) => {
      const dayNum = dayData.day || idx + 1;
      const baseId = dayData.baseId && nextBases.some((b) => b.id === dayData.baseId)
        ? dayData.baseId
        : defaultBaseId;

      const { blocks, warnings: dayWarnings } = autoScheduleDayBlocks(dayData.timeBlocks || [], dayNum);
      warnings.push(...dayWarnings);

      nextItinerary.push({
        id: `day_${dayNum}_${Math.random().toString(36).slice(2, 6)}`,
        day: dayNum,
        baseId,
        title: dayData.title || `第 ${dayNum} 天 探索日程`,
        subtitle: dayData.subtitle || existingPlan.destination,
        highlights: dayData.highlights || [],
        timeBlocks: blocks,
        foodNotes: dayData.foodNotes || [],
        supermarketTips: dayData.supermarketTips,
        weatherAlert: dayData.weatherAlert,
        packingReminders: dayData.packingReminders,
        customNotes: dayData.customNotes,
      });
    });
  } else {
    // append 模式：接續在既有天數後面
    const startDayOffset = existingPlan.itinerary.length;
    nextItinerary = [...existingPlan.itinerary];

    importData.itinerary.forEach((dayData, idx) => {
      const newDayNum = startDayOffset + idx + 1;
      const baseId = dayData.baseId && nextBases.some((b) => b.id === dayData.baseId)
        ? dayData.baseId
        : defaultBaseId;

      const { blocks, warnings: dayWarnings } = autoScheduleDayBlocks(dayData.timeBlocks || [], newDayNum);
      warnings.push(...dayWarnings);

      nextItinerary.push({
        id: `day_${newDayNum}_${Math.random().toString(36).slice(2, 6)}`,
        day: newDayNum,
        baseId,
        title: dayData.title || `第 ${newDayNum} 天 探索日程`,
        subtitle: dayData.subtitle || existingPlan.destination,
        highlights: dayData.highlights || [],
        timeBlocks: blocks,
        foodNotes: dayData.foodNotes || [],
        supermarketTips: dayData.supermarketTips,
        weatherAlert: dayData.weatherAlert,
        packingReminders: dayData.packingReminders,
        customNotes: dayData.customNotes,
      });
    });
  }

  // 5. 處理清單 Checklist
  let nextChecklist = [...existingPlan.checklist];
  if (opts?.replaceChecklist && importData.checklist) {
    nextChecklist = importData.checklist.map((c, idx) => ({
      id: `chk_${idx + 1}_${Math.random().toString(36).slice(2, 6)}`,
      category: (c.category as any) || 'documents',
      categoryLabel: c.categoryLabel || '必備物品',
      item: c.item,
      checked: false,
      priority: c.priority || 'medium',
    }));
  } else if (importData.checklist && importData.checklist.length > 0) {
    // 增量合併未重複的清單項目
    importData.checklist.forEach((c) => {
      if (!nextChecklist.some((existing) => existing.item.trim() === c.item.trim())) {
        nextChecklist.push({
          id: `chk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          category: (c.category as any) || 'documents',
          categoryLabel: c.categoryLabel || '必備物品',
          item: c.item,
          checked: false,
          priority: c.priority || 'medium',
        });
      }
    });
  }

  // 6. 處理待排池 Backlog (合併追加)
  const nextBacklog = [...existingPlan.backlog];
  if (importData.backlog && importData.backlog.length > 0) {
    importData.backlog.forEach((b) => {
      nextBacklog.push({
        id: b.id || `backlog_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        period: b.period || 'afternoon',
        title: b.title,
        description: b.description || '',
        locationName: b.locationName,
        tags: b.tags || [],
        tips: b.tips,
      });
    });
  }

  const updatedPlan: TripPlan = {
    ...existingPlan,
    updatedAt: nowIso,
    name: mode === 'replace' && importData.trip.name ? importData.trip.name : existingPlan.name,
    config: {
      ...existingPlan.config,
      totalDays: nextItinerary.length,
      bases: nextBases,
    },
    itinerary: nextItinerary,
    backlog: nextBacklog,
    checklist: nextChecklist,
    accommodations: nextAccommodations,
    transports: nextTransports,
    locations: mode === 'replace' ? [] : (existingPlan.locations || []),
  };

  updatedPlan.locations = extractAllTripLocations(updatedPlan);

  return {
    updatedPlan,
    warnings,
    stats: {
      preservedAccommodationsCount: preservedAccommodations.length,
      replacedAccommodationsCount,
      preservedTransportsCount: preservedTransports.length,
      replacedTransportsCount,
      daysCount: nextItinerary.length,
    },
  };
}
