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
 * 從整個旅程 (Itinerary, Accommodations) 全方位提取出所有具有明確地理意義的點位
 * 嚴格原則：
 * 1. 住宿基地 (category: 'base')：若旅程有 accommodations，100% 只以此真實住宿為準，杜絕任何舊模板幽靈基地！
 * 2. 行程景點：從每日 itinerary 的 timeBlocks 提取，嚴格依地點名稱去重，不開啟 jitter。
 * 3. 徹底剔除 DEMO_LOCATIONS，確保任何新匯入或覆蓋的旅程資料完全乾淨精準。
 */
export function extractAllTripLocations(plan: TripPlan): MapLocation[] {
  const result: MapLocation[] = [];
  const visitedNames = new Map<string, MapLocation>();
  const destination = plan.destination || plan.name || '';

  const hasAccommodations = Array.isArray(plan.accommodations) && plan.accommodations.length > 0;

  // 1. 提取真實住宿 Accommodations (若有，則為住宿基地的唯一絕對來源)
  if (hasAccommodations) {
    plan.accommodations.forEach((acc, idx) => {
      // 優先從 googleMapsUrl 或 address 解析精確座標，否則退回飯店名與地區名推斷
      const coords = inferCoordinates(acc.googleMapsUrl, acc.address, `${acc.hotelName} ${acc.baseNameZh || ''} ${destination}`);
      if (coords) {
        const name = acc.hotelName.trim();
        const baseArea = acc.baseNameZh?.trim() || '';

        // 找出此住宿對應的基地天數
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
          googleMapsUrl: acc.googleMapsUrl,
          address: acc.address,
        });
      }
    });
  } else {
    // 僅在完全沒有任何 accommodations 時，才以 config.bases 作為備援
    (plan.config?.bases || []).forEach((b) => {
      const bName = (b.nameZh || b.name || '').trim();
      if (!bName) return;

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
    });
  }

  // 2. 全面提取行程 Itinerary 中的每個活動 TimeBlock (嚴格去重，停用 jitter)
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

  // 絕不引入 DEMO_LOCATIONS 或未經行程關聯的舊範本點位
  visitedNames.forEach((val) => result.push(val));
  return result;
}
