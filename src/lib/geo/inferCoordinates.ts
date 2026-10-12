import { KNOWN_COORDINATES } from './registry';

/**
 * 從 Google Maps URL 或經緯度字串解析出精確座標 [lat, lng]
 * 支援格式：
 * 1. @lat,lng (如: https://www.google.com/maps/place/.../@46.02071,7.74912,17z)
 * 2. ?q=lat,lng 或 &q=lat,lng 或 ?ll=lat,lng (如: https://maps.google.com/?q=46.0207,7.7491)
 * 3. 純經緯度格式 "46.0207, 7.7491"
 */
export function extractCoordsFromUrlOrText(text?: string): [number, number] | undefined {
  if (!text || typeof text !== 'string') return undefined;
  const str = text.trim();
  if (!str) return undefined;

  // 1. 匹配 @lat,lng
  const atMatch = str.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
  }

  // 2. 匹配 q=lat,lng 或 ll=lat,lng 或 query=lat,lng 或 destination=lat,lng 或 center=lat,lng 或 loc:lat,lng
  const qMatch = str.match(/[?&](?:q|ll|query|destination|center|loc|saddr|daddr|point)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lng = parseFloat(qMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
  }

  // 3. 匹配 Google Maps data 參數 !3d{lat}!4d{lng} (例如景點頁面精確地標座標)
  const dataMatch = str.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (dataMatch) {
    const lat = parseFloat(dataMatch[1]);
    const lng = parseFloat(dataMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
  }

  // 4. 匹配 lat=...&lng=... 或 lat=...&lon=...
  const latLngParamMatch = str.match(/[?&]lat=(-?\d+\.\d+)&(?:lng|lon)=(-?\d+\.\d+)/);
  if (latLngParamMatch) {
    const lat = parseFloat(latLngParamMatch[1]);
    const lng = parseFloat(latLngParamMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
  }

  // 5. 匹配純經緯度格式 "46.0207, 7.7491" 或包含於括號中 "(46.0207, 7.7491)"
  const rawMatch = str.match(/(?:^|[(\[\s])(-?\d{1,3}\.\d{3,8})\s*,\s*(-?\d{1,3}\.\d{3,8})(?:[)\]\s]|$)/);
  if (rawMatch) {
    const lat = parseFloat(rawMatch[1]);
    const lng = parseFloat(rawMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return [lat, lng];
    }
  }

  return undefined;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 依據文本（景點名、標題、地址、城市、Google Maps 連結）智慧推斷經緯度座標 [lat, lng]
 * 支援嚴格優先級、長度優先模糊子字串包含匹配、大小寫容錯與微偏移
 */
export function inferCoordinates(
  primaryText?: string,
  secondaryText?: string,
  fallbackDestination?: string,
  applyJitter = false
): [number, number] | undefined {
  const candidates = [primaryText, secondaryText, fallbackDestination].filter(
    (t): t is string => typeof t === 'string' && t.trim().length > 0
  );

  if (candidates.length === 0) return undefined;

  // 0. 最高優先級：若任一文字中含有精準經緯度或 Google Maps 座標連結，立即返回精確座標！
  for (const text of candidates) {
    const parsed = extractCoordsFromUrlOrText(text);
    if (parsed) return parsed;
  }

  const sortedKeys = Object.keys(KNOWN_COORDINATES).sort((a, b) => b.length - a.length);

  // 依候選文字優先級順序 (primaryText -> secondaryText -> fallbackDestination) 逐一匹配
  for (const text of candidates) {
    const trimmed = text.trim();

    // 1. 完全精確匹配優先
    if (KNOWN_COORDINATES[trimmed]) {
      return applyJitterCoords(KNOWN_COORDINATES[trimmed], applyJitter);
    }

    // 2. 嚴格包含匹配 (鍵名長度由大至小，避免短詞誤傷)
    for (const key of sortedKeys) {
      if (text.includes(key)) {
        return applyJitterCoords(KNOWN_COORDINATES[key], applyJitter);
      }
    }

    // 3. 不分大小寫子字串匹配 (適用英文/德文/法文拼寫)
    const lowerText = text.toLowerCase();
    for (const key of sortedKeys) {
      if (/^[a-z0-9\s.-]+$/i.test(key)) {
        const lowerKey = key.toLowerCase();
        if (key.length <= 4) {
          // 短英文詞使用 word boundary 避免誤判
          const regex = new RegExp(`\\b${escapeRegExp(lowerKey)}\\b`, 'i');
          if (regex.test(lowerText)) {
            return applyJitterCoords(KNOWN_COORDINATES[key], applyJitter);
          }
        } else if (lowerText.includes(lowerKey)) {
          return applyJitterCoords(KNOWN_COORDINATES[key], applyJitter);
        }
      }
    }
  }

  return undefined;
}

/**
 * 為避免同區域多個景點座標完全重疊，加上微量離散偏移 (~100-200公尺)
 */
function applyJitterCoords(coords: [number, number], jitter: boolean): [number, number] {
  if (!jitter) return [coords[0], coords[1]];
  const offsetLat = (Math.random() - 0.5) * 0.003;
  const offsetLng = (Math.random() - 0.5) * 0.003;
  return [Number((coords[0] + offsetLat).toFixed(5)), Number((coords[1] + offsetLng).toFixed(5))];
}
