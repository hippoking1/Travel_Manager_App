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

  // 2. 匹配 q=lat,lng 或 ll=lat,lng 或 query=lat,lng
  const qMatch = str.match(/[?&](?:q|ll|query)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lng = parseFloat(qMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
  }

  // 3. 匹配純經緯度格式 "46.0207, 7.7491"
  const rawMatch = str.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);
  if (rawMatch) {
    const lat = parseFloat(rawMatch[1]);
    const lng = parseFloat(rawMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
  }

  return undefined;
}

/**
 * 依據文本（景點名、標題、地址、城市、Google Maps 連結）智慧推斷經緯度座標 [lat, lng]
 * 支援完全匹配、長度優先模糊子字串包含匹配與微偏移
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

  // 0. 若任一文字中含有精準經緯度或 Google Maps 座標連結，最高優先返回精確座標！
  for (const text of candidates) {
    const parsed = extractCoordsFromUrlOrText(text);
    if (parsed) return parsed;
  }

  // 1. 完全匹配優先
  for (const text of candidates) {
    const trimmed = text.trim();
    if (KNOWN_COORDINATES[trimmed]) {
      return applyJitterCoords(KNOWN_COORDINATES[trimmed], applyJitter);
    }
  }

  // 2. 子字串包含比對：將字典鍵依長度由大到小排序，避免短詞搶先誤判
  const sortedKeys = Object.keys(KNOWN_COORDINATES).sort((a, b) => b.length - a.length);

  for (const text of candidates) {
    for (const key of sortedKeys) {
      if (text.includes(key)) {
        return applyJitterCoords(KNOWN_COORDINATES[key], applyJitter);
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
