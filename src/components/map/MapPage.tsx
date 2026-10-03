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
import { useTripStore } from '../../stores/tripStore';
import { useUIStore } from '../../stores/uiStore';
import { createCustomMarkerIcon, CATEGORY_COLORS } from './CategoryPin';
import { PageHeader } from '../ui/PageHeader';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
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

export const MapPage: React.FC = () => {
  const navigate = useNavigate();
  const { locations, itinerary, config } = useTripStore();
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

  // 聚合所有地點：locations + bases 中的坐標
  const allLocations: MapLocation[] = useMemo(() => {
    const list: MapLocation[] = [...locations];

    // 若基地有座標且尚未出現在清單中，動態補充為 base marker
    (config.bases || []).forEach((b) => {
      if (b.coordinates && !list.some((l) => l.coordinates[0] === b.coordinates![0] && l.coordinates[1] === b.coordinates![1])) {
        list.push({
          id: `base_${b.id}`,
          name: b.name,
          nameZh: b.nameZh,
          coordinates: b.coordinates,
          category: 'base',
          description: b.hotelName ? `住宿：${b.hotelName}` : b.notes || '住宿基地中心',
          dayNumbers: b.days || [],
        });
      }
    });

    return list;
  }, [locations, config.bases]);

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
        // 從 locations 查找對應 locationName
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

  const defaultCenter: [number, number] =
    allPoints[0] || (config.bases?.[0]?.coordinates ? config.bases[0].coordinates : [46.8182, 8.2275]);

  const handleGoToDay = (dayNum: number) => {
    toggleDayExpanded(dayNum);
    setSelectedBaseId('all');
    navigate('/');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      {/* 標題與簡介 */}
      <PageHeader
        title={`${config.tripName} 地理探索互動地圖`}
        subtitle="檢視住宿基地、景點海拔與每日行程足跡路線，支援 CARTO 深淺地圖圖磚與自動聚焦"
        emoji="🗺️"
      />

      {/* 篩選控制器卡片 */}
      <Card className="p-3.5 sm:p-4 space-y-3">
        {/* 天數切換 Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Route className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <span>路線天數：</span>
          </span>
          <button
            onClick={() => {
              setSelectedDay('all');
              setActiveLocation(null);
            }}
            className={`px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition-all ${
              selectedDay === 'all'
                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] border border-[var(--color-border)] hover:text-[var(--color-text)]'
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
                onClick={() => {
                  setSelectedDay(dayNum);
                  setActiveLocation(null);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold shrink-0 font-mono transition-all ${
                  isSelected
                    ? 'bg-[var(--color-primary)] text-white shadow-sm'
                    : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] border border-[var(--color-border)] hover:text-[var(--color-text)]'
                }`}
              >
                Day {dayNum}
              </button>
            );
          })}
        </div>

        {/* 分類篩選按鈕列 */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-t border-[var(--color-border)] pt-2.5">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition-all ${
              selectedCategory === 'all'
                ? 'bg-[var(--color-text)] text-[var(--color-bg)] font-bold shadow-sm'
                : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] border border-[var(--color-border)] hover:text-[var(--color-text)]'
            }`}
          >
            全部分類 ({allLocations.length})
          </button>

          {(Object.keys(CATEGORY_COLORS) as LocationCategory[]).map((cat) => {
            const meta = CATEGORY_COLORS[cat];
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1.5 border transition-all ${
                  isSelected
                    ? 'bg-[var(--color-bg-subtle)] text-[var(--color-text)] border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]'
                    : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:text-[var(--color-text)]'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.bg }} />
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* RWD 佈局：大螢幕雙欄 (左側地點列表、右側 Leaflet 地圖) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左側：地點清單卡片 */}
        <Card className="p-4 max-h-[480px] lg:max-h-[640px] overflow-y-auto space-y-2 shadow-sm order-2 lg:order-1">
          <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] font-semibold mb-2">
            <span>標記地點 ({filteredLocations.length})</span>
            <span>點擊快速聚焦</span>
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
                      ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] shadow-sm'
                      : 'bg-[var(--color-bg)] border-[var(--color-border)] hover:border-[var(--color-primary)]/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: meta.bg }} />
                        <h4 className="text-xs sm:text-sm font-bold text-[var(--color-text)]">
                          {loc.nameZh}
                        </h4>
                      </div>
                      <p className="text-[11px] text-[var(--color-text-muted)]">{loc.name}</p>
                    </div>

                    {loc.altitude && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-bg-subtle)] text-cyan-600 dark:text-cyan-400 border border-[var(--color-border)] shrink-0">
                        {loc.altitude}m
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[var(--color-text-muted)] mt-1.5 line-clamp-2 leading-relaxed">
                    {loc.description}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--color-border)] text-[11px]">
                    <span className="text-[var(--color-text-muted)] font-mono">
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

            {/* 地圖圖釘 Markers */}
            {filteredLocations.map((loc) => {
              const isSelected = activeLocation?.id === loc.id;
              const icon = createCustomMarkerIcon(loc.category, isSelected);

              return (
                <Marker
                  key={loc.id}
                  position={loc.coordinates}
                  icon={icon}
                  eventHandlers={{
                    click: () => setActiveLocation(loc),
                  }}
                >
                  <Popup>
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
                                onClick={() => handleGoToDay(d)}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-primary)] text-white font-bold"
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
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};
