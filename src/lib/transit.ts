// ============================================================
// 轉乘路徑與大眾運輸輔助函式庫 (Transit & Multi-Leg Route Planner)
// ============================================================

import type { TransportType, TransitLeg, TransportDetail } from '../types';

export interface TransportTypeMeta {
  type: TransportType;
  label: string;
  shortLabel: string;
  emoji: string;
  color: string;
  bgLight: string;
  badgeBorder: string;
}

export const TRANSPORT_TYPE_CONFIG: Record<TransportType, TransportTypeMeta> = {
  train: {
    type: 'train',
    label: '火車 / 鐵路 (Train)',
    shortLabel: '火車',
    emoji: '🚆',
    color: '#0284c7', // sky-600
    bgLight: 'rgba(2, 132, 199, 0.12)',
    badgeBorder: 'rgba(2, 132, 199, 0.3)',
  },
  metro: {
    type: 'metro',
    label: '捷運 / 地鐵 (Metro / Subway)',
    shortLabel: '捷運',
    emoji: '🚇',
    color: '#0d9488', // teal-600
    bgLight: 'rgba(13, 148, 136, 0.12)',
    badgeBorder: 'rgba(13, 148, 136, 0.3)',
  },
  'high-speed-rail': {
    type: 'high-speed-rail',
    label: '高鐵 / 新幹線 (High-Speed Rail)',
    shortLabel: '高鐵',
    emoji: '🚄',
    color: '#7c3aed', // violet-600
    bgLight: 'rgba(124, 58, 237, 0.12)',
    badgeBorder: 'rgba(124, 58, 237, 0.3)',
  },
  tram: {
    type: 'tram',
    label: '輕軌 / 路面電車 (Tram)',
    shortLabel: '路面電車',
    emoji: '🚋',
    color: '#e11d48', // rose-600
    bgLight: 'rgba(225, 29, 72, 0.12)',
    badgeBorder: 'rgba(225, 29, 72, 0.3)',
  },
  bus: {
    type: 'bus',
    label: '公車 / 巴士 (Bus)',
    shortLabel: '公車',
    emoji: '🚌',
    color: '#059669', // emerald-600
    bgLight: 'rgba(5, 150, 105, 0.12)',
    badgeBorder: 'rgba(5, 150, 105, 0.3)',
  },
  cogwheel: {
    type: 'cogwheel',
    label: '齒軌高山火車 (Cogwheel)',
    shortLabel: '齒軌火車',
    emoji: '🚞',
    color: '#d97706', // amber-600
    bgLight: 'rgba(217, 119, 6, 0.12)',
    badgeBorder: 'rgba(217, 119, 6, 0.3)',
  },
  'cable-car': {
    type: 'cable-car',
    label: '高空纜車 (Cable Car)',
    shortLabel: '空中纜車',
    emoji: '🚡',
    color: '#ea580c', // orange-600
    bgLight: 'rgba(234, 88, 12, 0.12)',
    badgeBorder: 'rgba(234, 88, 12, 0.3)',
  },
  funicular: {
    type: 'funicular',
    label: '地面斜坡纜車 (Funicular)',
    shortLabel: '斜坡纜車',
    emoji: '🚠',
    color: '#b45309', // amber-700
    bgLight: 'rgba(180, 83, 9, 0.12)',
    badgeBorder: 'rgba(180, 83, 9, 0.3)',
  },
  boat: {
    type: 'boat',
    label: '渡輪 / 湖泊遊船 (Boat / Ferry)',
    shortLabel: '遊船渡輪',
    emoji: '⛴️',
    color: '#2563eb', // blue-600
    bgLight: 'rgba(37, 99, 235, 0.12)',
    badgeBorder: 'rgba(37, 99, 235, 0.3)',
  },
  walk: {
    type: 'walk',
    label: '徒步 / 散策步行 (Walk)',
    shortLabel: '步行',
    emoji: '🚶',
    color: '#78716c', // stone-500
    bgLight: 'rgba(120, 113, 108, 0.12)',
    badgeBorder: 'rgba(120, 113, 108, 0.3)',
  },
  car: {
    type: 'car',
    label: '自駕 / 計程車 (Car / Taxi)',
    shortLabel: '自駕/計程車',
    emoji: '🚗',
    color: '#475569', // slate-600
    bgLight: 'rgba(71, 85, 105, 0.12)',
    badgeBorder: 'rgba(71, 85, 105, 0.3)',
  },
  flight: {
    type: 'flight',
    label: '國內 / 國際航班 (Flight)',
    shortLabel: '航班飛機',
    emoji: '✈️',
    color: '#0ea5e9', // sky-500
    bgLight: 'rgba(14, 165, 233, 0.12)',
    badgeBorder: 'rgba(14, 165, 233, 0.3)',
  },
};

/** 解析 'HH:mm' 為當日分鐘數 (0 ~ 1439) */
export function parseTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 24 || minutes < 0 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
}

/** 計算兩時刻相差的分鐘數 (支援跨午夜) */
export function calculateMinutesDiff(startStr?: string | null, endStr?: string | null): number | null {
  const startM = parseTimeToMinutes(startStr);
  const endM = parseTimeToMinutes(endStr);
  if (startM === null || endM === null) return null;
  let diff = endM - startM;
  if (diff < 0) {
    diff += 1440; // 跨夜加 24 小時
  }
  return diff;
}

/** 將分鐘數格式化為好讀文字 (例: 75 -> "1 小時 15 分鐘", 25 -> "25 分鐘") */
export function formatMinutes(minutes: number): string {
  if (minutes <= 0) return '0 分鐘';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) {
    return `${hours} 小時 ${mins} 分鐘`;
  }
  if (hours > 0) {
    return `${hours} 小時`;
  }
  return `${mins} 分鐘`;
}

/** 計算兩段之間的轉乘等候緩衝時間 (分鐘) */
export function calculateTransferBuffer(
  prevArrivalTime?: string | null,
  nextDepartureTime?: string | null
): number | null {
  return calculateMinutesDiff(prevArrivalTime, nextDepartureTime);
}

/** 依起訖站點與自訂網址，產生 Google Maps 大眾運輸路線導航 URL */
export function buildGoogleMapsTransitUrl(params: {
  from?: string;
  to?: string;
  routeUrl?: string;
}): string {
  if (params.routeUrl && params.routeUrl.trim().length > 0) {
    return params.routeUrl.trim();
  }
  const from = (params.from || '').trim();
  const to = (params.to || '').trim();
  if (!from && !to) return '';
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&travelmode=transit`;
}

/** 規格化轉乘步驟，確保每項皆有唯一 id 與必要欄位 */
export function normalizeTransitLeg(leg: Partial<TransitLeg>, index = 0): TransitLeg {
  return {
    id: leg.id || `leg_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`,
    type: leg.type || 'train',
    lineName: leg.lineName?.trim() || undefined,
    from: leg.from?.trim() || '',
    fromPlatform: leg.fromPlatform?.trim() || undefined,
    to: leg.to?.trim() || '',
    toPlatform: leg.toPlatform?.trim() || undefined,
    departureTime: leg.departureTime?.trim() || undefined,
    arrivalTime: leg.arrivalTime?.trim() || undefined,
    duration: leg.duration?.trim() || undefined,
    cost: leg.cost?.trim() || undefined,
    passCoverage: leg.passCoverage?.trim() || undefined,
    notes: leg.notes?.trim() || undefined,
  };
}

/**
 * 依據 legs 陣列智慧彙整頂層 TransportDetail 摘要
 */
export function aggregateTransportDetail(
  legs: TransitLeg[],
  extra?: Partial<TransportDetail>
): TransportDetail | undefined {
  const validLegs = legs.filter((l) => (l.from && l.from.trim()) || (l.to && l.to.trim()) || l.lineName);
  if (validLegs.length === 0) {
    if (extra?.from && extra?.to) {
      return {
        type: extra.type || 'train',
        from: extra.from.trim(),
        to: extra.to.trim(),
        duration: extra.duration?.trim() || undefined,
        stpCoverage: extra.stpCoverage,
        discountNote: extra.discountNote,
        lineInfo: extra.lineInfo,
        departureTime: extra.departureTime,
        arrivalTime: extra.arrivalTime,
        platformInfo: extra.platformInfo,
        cost: extra.cost,
        routeUrl: extra.routeUrl,
        notes: extra.notes,
        legs: [
          normalizeTransitLeg({
            type: extra.type || 'train',
            from: extra.from,
            to: extra.to,
            departureTime: extra.departureTime,
            arrivalTime: extra.arrivalTime,
            duration: extra.duration,
            notes: extra.notes,
          }),
        ],
      };
    }
    return undefined;
  }

  const firstLeg = validLegs[0];
  const lastLeg = validLegs[validLegs.length - 1];

  // 計算預估總時間
  let computedDuration = extra?.duration;
  if (!computedDuration && firstLeg.departureTime && lastLeg.arrivalTime) {
    const diff = calculateMinutesDiff(firstLeg.departureTime, lastLeg.arrivalTime);
    if (diff !== null && diff > 0) {
      computedDuration = formatMinutes(diff);
    }
  }

  // 路線摘要串接 (例: "公車 205路 ➔ 捷運板南線 ➔ 台鐵自強號")
  const lineSummary = validLegs
    .map((l) => {
      const meta = TRANSPORT_TYPE_CONFIG[l.type];
      const name = l.lineName ? `${meta.shortLabel} ${l.lineName}` : `${meta.shortLabel} (${l.from}➔${l.to})`;
      return name;
    })
    .join(' ➔ ');

  return {
    type: firstLeg.type || extra?.type || 'train',
    from: firstLeg.from || extra?.from || '',
    to: lastLeg.to || extra?.to || '',
    departureTime: firstLeg.departureTime || extra?.departureTime,
    arrivalTime: lastLeg.arrivalTime || extra?.arrivalTime,
    duration: computedDuration || extra?.duration,
    stpCoverage: extra?.stpCoverage,
    discountNote: extra?.discountNote,
    lineInfo: extra?.lineInfo || (validLegs.length > 1 ? lineSummary : firstLeg.lineName),
    platformInfo: extra?.platformInfo || firstLeg.fromPlatform,
    cost: extra?.cost,
    routeUrl: extra?.routeUrl,
    notes: extra?.notes,
    legs: validLegs.map((l, idx) => normalizeTransitLeg(l, idx)),
  };
}
