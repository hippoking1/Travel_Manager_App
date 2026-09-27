import L from 'leaflet';
import type { LocationCategory } from '../../types';

export const CATEGORY_COLORS: Record<LocationCategory, { bg: string; border: string; text: string; label: string }> = {
  base: {
    bg: '#3B82F6',
    border: '#1D4ED8',
    text: '#FFFFFF',
    label: '住宿基地',
  },
  peak: {
    bg: '#EF4444',
    border: '#B91C1C',
    text: '#FFFFFF',
    label: '高山名峰',
  },
  culture: {
    bg: '#EAB308',
    border: '#A16207',
    text: '#FFFFFF',
    label: '歷史文化',
  },
  shopping: {
    bg: '#10B981',
    border: '#047857',
    text: '#FFFFFF',
    label: '超市購物',
  },
  attraction: {
    bg: '#06B6D4',
    border: '#0E7490',
    text: '#FFFFFF',
    label: '親子風景',
  },
  station: {
    bg: '#8B5CF6',
    border: '#6D28D9',
    text: '#FFFFFF',
    label: '交通大站',
  },
};

/**
 * 動態建立彩色 Leaflet DivIcon，完全免除預設 png 圖檔找不到的困擾
 */
export function createCustomMarkerIcon(category: LocationCategory, isSelected: boolean = false) {
  const meta = CATEGORY_COLORS[category] || CATEGORY_COLORS.attraction;
  const size = isSelected ? 34 : 26;

  const html = `
    <div style="
      width: ${size}px;
      height: ${size}px;
      background-color: ${meta.bg};
      border: 2px solid ${isSelected ? '#FFFFFF' : meta.border};
      border-radius: 9999px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: ${size > 30 ? '14px' : '11px'};
      font-weight: bold;
      transition: all 0.2s ease-in-out;
      transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'};
    ">
      <span>●</span>
    </div>
  `;

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}
