import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Compass,
  ExternalLink,
  Calendar,
  Video,
  Route,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useActiveTrip } from '../../stores/selectors';
import { useUIStore } from '../../stores/uiStore';
import { createCustomMarkerIcon, CATEGORY_COLORS } from './CategoryPin';
import { PageHeader } from '../ui/PageHeader';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { extractAllTripLocations, inferCoordinates } from '../../lib/geo';
import type { MapLocation, LocationCategory } from '../../types';

// 子元件：依座標列表自動調校視野 fitBounds
const MapBoundsController: React.FC<{
  targetCoords: [number, number] | null;
  allPoints: [number, number][];
}> = ({ targetCoords, allPoints }) => {
  const map = useMap();

  useEffect(() => {
    if (targetCoords) {
      map.flyTo(targetCoords, 14, { duration: 1.2 });
    } else if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [targetCoords, allPoints, map]);

  return null;
};

type MapLayerType = 'osm' | 'topo' | 'satellite';

const TILE_LAYERS: Record<
  MapLayerType,
  { name: string; icon: string; url: string; attribution: string; maxZoom: number }
> = {
  osm: {
    name: '標準地圖',
    icon: '🗺️',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  topo: {
    name: '地形等高線',
    icon: '⛰️',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, USGS, NOAA',
    maxZoom: 19,
  },
  satellite: {
    name: '衛星影像',
    icon: '🛰️',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
    maxZoom: 18,
  },
};

// 子元件：個別點位 Marker，支援選中時自動彈出 Popup 與聚焦高亮
const LocationMarker: React.FC<{
  loc: MapLocation;
  isSelected: boolean;
  isDimmed: boolean;
  onSelect: () => void;
  onGoToDay: (dayNum: number) => void;
}> = ({ loc, isSelected, isDimmed, onSelect, onGoToDay }) => {
  const markerRef = React.useRef<L.Marker | null>(null);

  React.useEffect(() => {
    if (isSelected && markerRef.current) {
      markerRef.current.openPopup();
    }
  }, [isSelected]);

  const icon = useMemo(() => {
    return createCustomMarkerIcon(loc.category, isSelected);
  }, [loc.category, isSelected]);

  return (
    <Marker
      ref={markerRef}
      position={loc.coordinates}
      icon={icon}
      opacity={isDimmed ? 0.35 : 1}
      zIndexOffset={isSelected ? 1000 : 0}
      eventHandlers={{
        click: onSelect,
      }}
    >
      <Popup autoPan={false}>
        <div className="p-1 space-y-2 min-w-[200px] max-w-xs text-stone-900 dark:text-stone-100">
          <div className="border-b border-stone-200 dark:border-stone-700 pb-1.5">
            <span className="text-[10px] uppercase font-bold text-sky-600 dark:text-sky-400 tracking-wider">
              {CATEGORY_COLORS[loc.category]?.label || '景點'}
            </span>
            <h4 className="text-sm font-bold leading-tight">
              {loc.nameZh}
            </h4>
            <div className="text-[11px] text-stone-500">{loc.name}</div>
          </div>

          {loc.altitude && (
            <div className="flex items-center gap-1 text-xs text-cyan-600 dark:text-cyan-400 font-mono">
              <Compass className="w-3.5 h-3.5" />
              <span>海拔：{loc.altitude} 公尺</span>
            </div>
          )}

          <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
            {loc.description}
          </p>

          {loc.stpNote && (
            <div className="bg-emerald-50 dark:bg-emerald-950/60 p-1.5 rounded text-[11px] text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {loc.stpNote}
            </div>
          )}

          <div className="pt-2 border-t border-stone-200 dark:border-stone-700 flex items-center justify-between gap-2">
            {/* 關聯天數跳轉 */}
            {loc.dayNumbers?.length > 0 && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-stone-400" />
                <span className="text-[11px] text-stone-500">行程：</span>
                {loc.dayNumbers.map((d) => (
                  <button
                    key={d}
                    onClick={() => onGoToDay(d)}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-primary)] text-white font-bold hover:opacity-90"
                  >
                    D{d}
                  </button>
                ))}
              </div>
            )}

            {/* 即時攝影機 */}
            {loc.webcamUrl && (
              <a
                href={loc.webcamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-400 font-medium"
              >
                <Video className="w-3 h-3" />
                <span>WebCam</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
};

export const MapPage: React.FC = () => {
  const navigate = useNavigate();
  const activeTrip = useActiveTrip();
  const { itinerary, config } = activeTrip;
  const { toggleDayExpanded, setSelectedBaseId, theme } = useUIStore();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDay, setSelectedDay] = useState<number | 'all'>('all');
  const [activeLocation, setActiveLocation] = useState<MapLocation | null>(null);
  const [mapLayer, setMapLayer] = useState<MapLayerType>('osm');

  // 判斷深色模式 (僅在標準地圖套用暗色濾鏡，不影響衛星圖與地形圖)
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  // 聚合所有地點：從行程 activities, 住宿預訂, 住宿地區 與 自訂 locations 全面萃取
  const allLocations: MapLocation[] = useMemo(() => {
    return extractAllTripLocations(activeTrip);
  }, [activeTrip]);

  // 各分類數量統計
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allLocations.length };
    (Object.keys(CATEGORY_COLORS) as LocationCategory[]).forEach((cat) => {
      counts[cat] = allLocations.filter((loc) => loc.category === cat).length;
    });
    return counts;
  }, [allLocations]);

  // 篩選後的地點
  const filteredLocations = useMemo(() => {
    return allLocations.filter((loc) => {
      if (selectedCategory !== 'all' && loc.category !== selectedCategory) return false;
      if (selectedDay !== 'all') {
        const matchesDay = loc.dayNumbers.includes(selectedDay);
        if (!matchesDay) return false;
      }
      return true;
    });
  }, [allLocations, selectedCategory, selectedDay]);

  // 當前選取天數的景點連線軌跡
  const routePolylineCoords: [number, number][] = useMemo(() => {
    if (selectedDay === 'all') return [];
    const dayData = itinerary.find((d) => d.day === selectedDay);
    if (!dayData) return [];

    const coordsList: [number, number][] = [];
    dayData.timeBlocks.forEach((tb) => {
      if (tb.coordinates) {
        coordsList.push(tb.coordinates);
      } else {
        const found = allLocations.find(
          (l) => l.name === tb.locationName || l.nameZh === tb.locationName || l.nameZh === tb.title
        );
        if (found) coordsList.push(found.coordinates);
      }
    });

    return coordsList;
  }, [selectedDay, itinerary, allLocations]);

  // 所有要 fitBounds 的點位
  const allPoints: [number, number][] = useMemo(() => {
    if (routePolylineCoords.length > 0) return routePolylineCoords;
    return filteredLocations.map((l) => l.coordinates);
  }, [routePolylineCoords, filteredLocations]);

  // 智慧初始中心點：若已有景點則以首個景點為準，若無則依旅程名稱/目的地推算，最後才以瑞士為備援
  const defaultCenter: [number, number] = useMemo(() => {
    if (allPoints.length > 0) return allPoints[0];
    const baseWithCoords = config.bases?.find((b) => b.coordinates);
    if (baseWithCoords?.coordinates) return baseWithCoords.coordinates;
    const destCoords = inferCoordinates(config.tripName, activeTrip.destination);
    if (destCoords) return destCoords;
    return [46.8182, 8.2275];
  }, [allPoints, config.bases, config.tripName, activeTrip.destination]);

  const listRef = React.useRef<HTMLDivElement | null>(null);

  // 切換分類或天數時，自動滾動回清單頂部
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedCategory, selectedDay]);

  const handleGoToDay = (dayNum: number) => {
    toggleDayExpanded(dayNum);
    setSelectedBaseId('all');
    navigate('/');
  };

  const handleSelectCategory = (cat: string) => {
    setSelectedCategory(cat);
    setActiveLocation(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      {/* 標題與簡介 */}
      <PageHeader
        title={`${config.tripName} 地理探索互動地圖`}
        subtitle="檢視住宿基地、景點海拔與每日行程足跡路線，支援自由切換圖磚風格與單點自動彈窗聚焦"
        emoji="🗺️"
      />

      {/* 篩選控制器卡片 */}
      <Card className="p-3.5 sm:p-4 space-y-3">
        {/* 天數切換 Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Route className="w-3.5 h-3.5 text-sky-600" />
            <span>路線天數：</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setSelectedDay('all');
              setActiveLocation(null);
            }}
            className={`px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition-all ${
              selectedDay === 'all'
                ? 'bg-sky-600 text-white font-bold shadow-xs'
                : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:bg-stone-50'
            }`}
          >
            全部天數
          </button>
          {Array.from({ length: config.totalDays || itinerary.length || 1 }).map((_, i) => {
            const dayNum = i + 1;
            const isSelected = selectedDay === dayNum;
            return (
              <button
                key={dayNum}
                type="button"
                onClick={() => {
                  setSelectedDay(dayNum);
                  setActiveLocation(null);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold shrink-0 font-mono transition-all ${
                  isSelected
                    ? 'bg-sky-600 text-white font-bold shadow-xs'
                    : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:bg-stone-50'
                }`}
              >
                Day {dayNum}
              </button>
            );
          })}
        </div>

        {/* 分類篩選按鈕列 (精準切換與醒目選中樣式) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-t border-stone-200 dark:border-stone-800 pt-2.5">
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setActiveLocation(null);
            }}
            className={`px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition-all ${
              selectedCategory === 'all'
                ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-bold shadow-xs ring-2 ring-stone-900 dark:ring-stone-100'
                : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:bg-stone-50'
            }`}
          >
            全部分類 ({categoryCounts.all || 0})
          </button>

          {(Object.keys(CATEGORY_COLORS) as LocationCategory[]).map((cat) => {
            const meta = CATEGORY_COLORS[cat];
            const isSelected = selectedCategory === cat;
            const count = categoryCounts[cat] || 0;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleSelectCategory(cat)}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1.5 border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border-2 border-sky-600 dark:border-sky-400 font-bold shadow-xs ring-2 ring-sky-500/20'
                    : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:bg-stone-50'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: meta.bg }} />
                <span>{meta.label}</span>
                <span className="text-[10px] opacity-75 font-mono">({count})</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* RWD 佈局：大螢幕雙欄 (左側地點列表、右側 Leaflet 地圖) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左側：地點清單卡片 */}
        <Card 
          ref={listRef}
          className="p-4 max-h-[480px] lg:max-h-[640px] overflow-y-auto space-y-2 shadow-sm order-2 lg:order-1"
        >
          {/* 目前分類篩選指示條 */}
          {selectedCategory !== 'all' && (
            <div className="flex items-center justify-between bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 px-3 py-1.5 rounded-xl text-xs text-sky-800 dark:text-sky-300 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[selectedCategory as LocationCategory]?.bg }} />
                <span>已篩選分類：<strong>{CATEGORY_COLORS[selectedCategory as LocationCategory]?.label}</strong> ({filteredLocations.length})</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
              >
                清除篩選 ✕
              </button>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-stone-500 font-semibold mb-2">
            <span>標記地點 ({filteredLocations.length})</span>
            {activeLocation ? (
              <button
                type="button"
                onClick={() => setActiveLocation(null)}
                className="text-[11px] text-sky-600 hover:underline cursor-pointer"
              >
                重設為全部視野
              </button>
            ) : (
              <span>點擊快速聚焦</span>
            )}
          </div>

          {filteredLocations.length === 0 ? (
            <EmptyState
              title="無符合的地點標記"
              description="可嘗試切換上方分類或選擇「全部天數」檢視所有座標。"
            />
          ) : (
            filteredLocations.map((loc) => {
              const isCurrent = activeLocation?.id === loc.id;
              const meta = CATEGORY_COLORS[loc.category] || CATEGORY_COLORS.attraction;
              return (
                <div
                  key={loc.id}
                  onClick={() => setActiveLocation(loc)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isCurrent
                      ? 'bg-sky-50 dark:bg-sky-950/50 border-sky-500 shadow-sm ring-1 ring-sky-500'
                      : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-sky-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: meta.bg }} />
                        <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                          {loc.nameZh}
                        </h4>
                      </div>
                      <p className="text-[11px] text-stone-500">{loc.name}</p>
                    </div>

                    {loc.altitude && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-cyan-600 dark:text-cyan-400 border border-stone-200 dark:border-stone-700 shrink-0">
                        {loc.altitude}m
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-stone-600 dark:text-stone-300 mt-1.5 line-clamp-2 leading-relaxed">
                    {loc.description}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-100 dark:border-stone-800 text-[11px]">
                    <span className="text-stone-500 font-mono">
                      {loc.dayNumbers?.length > 0 ? `Day ${loc.dayNumbers.join(', ')}` : '常設地點'}
                    </span>
                    {loc.stpNote && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium truncate max-w-[150px]">
                        {loc.stpNote}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </Card>

        {/* 右側：全功能 Leaflet 地圖容器 */}
        <div className="lg:col-span-2 h-[420px] sm:h-[500px] lg:h-[640px] rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-md relative order-1 lg:order-2 z-10">
          {/* 當前聚焦地點指示浮層 */}
          {activeLocation && (
            <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[var(--color-primary)] shadow-md text-xs">
              <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
              <span className="font-bold text-[var(--color-text)]">
                {activeLocation.nameZh}
              </span>
              <button
                onClick={() => setActiveLocation(null)}
                className="ml-1 text-[11px] px-2 py-0.5 rounded-md bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)]"
              >
                重設視野
              </button>
            </div>
          )}

          {/* 圖層風格切換控制膠囊 (免 API Key，自由切換標準 / 地形 / 衛星) */}
          <div className="absolute top-3 right-3 z-[1000] flex items-center bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border border-stone-200 dark:border-stone-800 rounded-xl p-1 shadow-md gap-1">
            {(Object.keys(TILE_LAYERS) as MapLayerType[]).map((key) => {
              const layer = TILE_LAYERS[key];
              const active = mapLayer === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMapLayer(key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                    active
                      ? 'bg-[var(--color-primary)] text-white shadow-xs font-bold'
                      : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                  title={layer.name}
                >
                  <span>{layer.icon}</span>
                  <span className="hidden sm:inline">{layer.name}</span>
                </button>
              );
            })}
          </div>

          <MapContainer
            center={defaultCenter}
            zoom={8}
            scrollWheelZoom={false}
            className={`w-full h-full ${isDark && mapLayer === 'osm' ? 'dark-tiles' : ''}`}
          >
            {/* 免 API Key 之高解析地圖圖磚 */}
            <TileLayer
              key={mapLayer}
              attribution={TILE_LAYERS[mapLayer].attribution}
              url={TILE_LAYERS[mapLayer].url}
              maxZoom={TILE_LAYERS[mapLayer].maxZoom}
            />

            {/* 視角與 fitBounds 控制器 */}
            <MapBoundsController
              targetCoords={activeLocation ? activeLocation.coordinates : null}
              allPoints={allPoints}
            />

            {/* 日程連線軌跡 (當選定特定天數時) */}
            {routePolylineCoords.length > 1 && (
              <Polyline
                positions={routePolylineCoords}
                pathOptions={{
                  color: '#0EA5E9',
                  weight: 4,
                  opacity: 0.8,
                  dashArray: '6, 8',
                }}
              />
            )}

            {/* 地圖圖釘 Markers：支援選取時自動展開 Popup 與淡化未選取圖釘 */}
            {filteredLocations.map((loc) => {
              const isSelected = activeLocation?.id === loc.id;
              const isDimmed = activeLocation !== null && !isSelected;

              return (
                <LocationMarker
                  key={loc.id}
                  loc={loc}
                  isSelected={isSelected}
                  isDimmed={isDimmed}
                  onSelect={() => setActiveLocation(loc)}
                  onGoToDay={handleGoToDay}
                />
              );
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};
