import { KNOWN_COORDINATES } from './registry';

/**
 * 依據文本（景點名、標題、地址、城市）智慧推斷經緯度座標 [lat, lng]
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
