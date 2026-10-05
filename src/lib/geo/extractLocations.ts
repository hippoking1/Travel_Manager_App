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
 * 從整個旅程 (Itinerary, Bases, Accommodations, Locations) 全方位提取出所有具有明確地理意義的點位
 * 確保在地理地圖中絕不漏掉任何行程規劃中的景點與住宿
 */
export function extractAllTripLocations(plan: TripPlan): MapLocation[] {
  const result: MapLocation[] = [];
  const visitedNames = new Map<string, MapLocation>();
  const destination = plan.destination || plan.name || '';

  // 1. 納入已有自訂 locations (保留特定備註如 stpNote, webcamUrl)
  (plan.locations || []).forEach((loc) => {
    if (loc.coordinates && loc.coordinates.length === 2) {
      const key = `${loc.nameZh || loc.name}_${loc.coordinates[0].toFixed(3)}_${loc.coordinates[1].toFixed(3)}`;
      visitedNames.set(key, { ...loc });
    }
  });

  // 2. 提取住宿地區 Bases
  (plan.config?.bases || []).forEach((b) => {
    const coords = b.coordinates || inferCoordinates(b.nameZh, b.name, `${b.hotelName || ''} ${destination}`);
    if (coords) {
      const name = b.nameZh || b.name;
      const key = `base_${b.id}_${coords[0].toFixed(3)}_${coords[1].toFixed(3)}`;
      if (!visitedNames.has(key)) {
        visitedNames.set(key, {
          id: `loc_base_${b.id}`,
          name: b.name,
          nameZh: name,
          coordinates: coords,
          category: 'base',
          description: b.hotelName ? `住宿地區：${name} (${b.hotelName})` : `住宿地區：${name}`,
          dayNumbers: b.days && b.days.length > 0 ? b.days : [1],
        });
      }
    }
  });

  // 3. 提取住宿預訂 Accommodations
  (plan.accommodations || []).forEach((acc) => {
    const coords = inferCoordinates(acc.hotelName, acc.address, `${acc.baseNameZh} ${destination}`);
    if (coords) {
      const key = `hotel_${acc.hotelName}_${coords[0].toFixed(3)}_${coords[1].toFixed(3)}`;
      if (!visitedNames.has(key)) {
        visitedNames.set(key, {
          id: `loc_acc_${acc.id}`,
          name: acc.hotelName,
          nameZh: acc.hotelName,
          coordinates: coords,
          category: 'base',
          description: `預訂住宿：${acc.hotelName}${acc.roomType ? ` (${acc.roomType})` : ''}`,
          dayNumbers: [1], // 預設涵蓋天數
        });
      }
    }
  });

  // 4. 全面提取行程 Itinerary 中的每個活動 TimeBlock
  (plan.itinerary || []).forEach((day) => {
    const dayNum = day.day;
    (day.timeBlocks || []).forEach((block, bIdx) => {
      const placeName = (block.locationName && block.locationName.trim()) 
        ? block.locationName.trim() 
        : block.title.trim();

      if (!placeName) return;

      // 取得或推斷座標
      const coords = block.coordinates || inferCoordinates(placeName, block.title, destination, true);
      if (!coords) return;

      const category = inferLocationCategory(block);
      const nameKey = `${placeName}_${coords[0].toFixed(2)}_${coords[1].toFixed(2)}`;

      const existing = visitedNames.get(nameKey);
      if (existing) {
        // 合併天數
        if (!existing.dayNumbers.includes(dayNum)) {
          existing.dayNumbers.push(dayNum);
          existing.dayNumbers.sort((a, b) => a - b);
        }
      } else {
        visitedNames.set(nameKey, {
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

  visitedNames.forEach((val) => result.push(val));
  return result;
}
