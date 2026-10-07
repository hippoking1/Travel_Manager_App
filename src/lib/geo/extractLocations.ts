import type { 
  TripPlan, 
  MapLocation, 
  LocationCategory, 
  TimeBlock 
} from '../../types';
import { inferCoordinates } from './inferCoordinates';

/**
 * 依活動標籤與標題關鍵字，智慧推斷地點分類
 */
export function inferLocationCategory(block: TimeBlock): LocationCategory {
  const text = `${block.title} ${block.locationName || ''} ${block.description || ''}`;

  if (block.tags?.includes('scenic-train') || /機場|車站|火車站|月台|特急|航班|高鐵|捷運|纜車/i.test(text)) {
    return 'station';
  }
  if (block.tags?.includes('budget-shopping') || /超市|商店街|購物|藥妝|市場|Coop|Migros|唐吉訶德|百貨/i.test(text)) {
    return 'shopping';
  }
  if (/山|峰|觀景台|展望台|冰川|登頂|百岳|Matterhorn|Jungfrau|Titlis|Pilatus/i.test(text)) {
    return 'peak';
  }
  if (/寺|社|城|宮|館|歷史|老街|古蹟|教堂|城堡|大社|神宮|博物館|美術館/i.test(text)) {
    return 'culture';
  }
  if (block.tags?.includes('kids-highlight') || /公園|湖|運河|水族館|動物園|海灘|牧場|農場|樂園|溫泉/i.test(text)) {
    return 'attraction';
  }

  return 'attraction';
}

/**
 * 從整個旅程 (Itinerary, Accommodations, Bases) 全方位提取出所有具有明確地理意義的點位
 * 確保在地理地圖中精確帶出行程規劃中的所有真實地點與住宿，且徹底剔除舊模板幽靈資料
 */
export function extractAllTripLocations(plan: TripPlan): MapLocation[] {
  const result: MapLocation[] = [];
  const visitedNames = new Map<string, MapLocation>();
  const destination = plan.destination || plan.name || '';

  // 1. 提取真實住宿 Accommodations (最高優先級的住宿點位)
  const hotelBaseNames = new Set<string>();
  (plan.accommodations || []).forEach((acc, idx) => {
    const coords = inferCoordinates(acc.hotelName, acc.address, `${acc.baseNameZh || ''} ${destination}`);
    if (coords) {
      const name = acc.hotelName.trim();
      const baseArea = acc.baseNameZh?.trim() || '';
      if (baseArea) hotelBaseNames.add(baseArea.toLowerCase());

      // 找出此住宿涵蓋的大致天數 (若未設定則嘗試從 base 或預設天數對應)
      const matchingBase = plan.config?.bases?.find(
        (b) => b.id === acc.baseId || (baseArea && b.nameZh?.includes(baseArea))
      );
      const days = (matchingBase?.days && matchingBase.days.length > 0) ? matchingBase.days : [idx + 1];

      const key = `hotel_${name.toLowerCase()}`;
      visitedNames.set(key, {
        id: `loc_acc_${acc.id}`,
        name: acc.hotelName,
        nameZh: acc.hotelName,
        coordinates: coords,
        category: 'base',
        description: `預訂住宿：${acc.hotelName}${acc.roomType ? ` (${acc.roomType})` : ''}${baseArea ? ` • 地區：${baseArea}` : ''}`,
        dayNumbers: days,
      });
    }
  });

  // 2. 提取住宿地區 Bases (若沒有在 Accommodations 中出現過，才補充進來)
  (plan.config?.bases || []).forEach((b) => {
    const bName = (b.nameZh || b.name || '').trim();
    if (!bName) return;

    // 若 Accommodations 已經涵蓋此地區或同名飯店，則不重複建立
    const isAlreadyCovered = Array.from(visitedNames.values()).some(
      (v) => v.category === 'base' && (v.name.includes(bName) || v.nameZh.includes(bName) || (b.hotelName && v.name.includes(b.hotelName)))
    );

    if (!isAlreadyCovered) {
      const coords = b.coordinates || inferCoordinates(b.nameZh, b.name, `${b.hotelName || ''} ${destination}`);
      if (coords) {
        const key = `base_${bName.toLowerCase()}`;
        visitedNames.set(key, {
          id: `loc_base_${b.id}`,
          name: b.name,
          nameZh: bName,
          coordinates: coords,
          category: 'base',
          description: b.hotelName ? `住宿地區：${bName} (${b.hotelName})` : `住宿地區：${bName}`,
          dayNumbers: b.days && b.days.length > 0 ? b.days : [1],
        });
      }
    }
  });

  // 3. 全面提取行程 Itinerary 中的每個活動 TimeBlock (嚴格去重，停用 jitter)
  (plan.itinerary || []).forEach((day) => {
    const dayNum = day.day;
    (day.timeBlocks || []).forEach((block, bIdx) => {
      const placeName = (block.locationName && block.locationName.trim()) 
        ? block.locationName.trim() 
        : block.title.trim();

      if (!placeName) return;

      // 推斷坐標時不使用隨機 jitter，保證同一地點座標絕對一致
      const coords = block.coordinates || inferCoordinates(placeName, block.title, destination, false);
      if (!coords) return;

      const category = inferLocationCategory(block);
      // 以規格化地點名稱作為去重主要 key
      const normalizedKey = `place_${placeName.toLowerCase().replace(/\s+/g, '')}`;

      const existing = visitedNames.get(normalizedKey);
      if (existing) {
        // 合併天數
        if (!existing.dayNumbers.includes(dayNum)) {
          existing.dayNumbers.push(dayNum);
          existing.dayNumbers.sort((a, b) => a - b);
        }
      } else {
        visitedNames.set(normalizedKey, {
          id: block.id || `loc_gen_${dayNum}_${bIdx + 1}`,
          name: block.locationName || block.title,
          nameZh: block.locationName || block.title,
          coordinates: coords,
          category,
          altitude: block.altitude,
          description: block.description || `${block.period || ''} 活動：${block.title}`,
          dayNumbers: [dayNum],
          tags: block.tags,
        });
      }
    });
  });

  // 4. 若有使用者在當前旅程明確手動新增的 locations (非 demo 資料)，才補充進來
  (plan.locations || []).forEach((loc) => {
    if (loc.coordinates && loc.coordinates.length === 2) {
      // 排除舊範本的示範點 (若當前目的地非瑞士經典示範，絕不盲目引入舊 demo 點)
      const isDemoTemplateLoc = loc.id?.startsWith('loc-') || loc.nameZh === '盧塞恩住宿基地';
      if (isDemoTemplateLoc && (!destination.includes('Swiss Family Odyssey') && !plan.id.includes('swiss_2027'))) {
        return;
      }

      const key = `manual_${(loc.nameZh || loc.name).toLowerCase()}`;
      if (!visitedNames.has(key)) {
        visitedNames.set(key, { ...loc });
      }
    }
  });

  visitedNames.forEach((val) => result.push(val));
  return result;
}
