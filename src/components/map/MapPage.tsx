import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { 
  Compass, 
  ExternalLink, 
  Calendar, 
  Video, 
  MapPin as MapPinIcon 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTripStore } from '../../stores/tripStore';
import { useUIStore } from '../../stores/uiStore';
import { createCustomMarkerIcon, CATEGORY_COLORS } from './CategoryPin';
import type { MapLocation, LocationCategory } from '../../types';

// 子元件：負責在點擊清單項目時將地圖平滑平移至該座標
const MapCenterController: React.FC<{ targetCoords: [number, number] | null }> = ({
  targetCoords,
}) => {
  const map = useMap();
  useEffect(() => {
    if (targetCoords) {
      map.flyTo(targetCoords, 13, { duration: 1.2 });
    }
  }, [targetCoords, map]);
  return null;
};

export const MapPage: React.FC = () => {
  const navigate = useNavigate();
  const { locations } = useTripStore();
  const { toggleDayExpanded, setSelectedBaseId } = useUIStore();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeLocation, setActiveLocation] = useState<MapLocation | null>(null);

  // 瑞士地理中心預設視野 (琉森至因特拉肯之間)
  const defaultCenter: [number, number] = [46.8182, 8.2275];
  const defaultZoom = 8;

  const filteredLocations = locations.filter((loc) => {
    if (selectedCategory === 'all') return true;
    return loc.category === selectedCategory;
  });

  const handleGoToDay = (dayNum: number) => {
    toggleDayExpanded(dayNum);
    setSelectedBaseId('all');
    navigate('/');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* 標題與簡介 */}
      <div className="mb-4">
        <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
          <MapPinIcon className="w-6 h-6 text-red-500" />
          <span>瑞士 16 天地理探索互動地圖</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          收錄 4 大基地木屋、Stoos最陡纜車、First懸崖、馬特洪冰川天堂(3883m)與德瑞跨境購物點。
        </p>
      </div>

      {/* 分類篩選按鈕列 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-none mb-4">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
            selectedCategory === 'all'
              ? 'bg-white text-slate-900 shadow-md'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          全部標記 ({locations.length})
        </button>

        {(Object.keys(CATEGORY_COLORS) as LocationCategory[]).map((cat) => {
          const meta = CATEGORY_COLORS[cat];
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1.5 border transition-all ${
                isSelected
                  ? 'bg-slate-800 text-white border-white ring-1'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: meta.bg }}
              />
              <span>{meta.label}</span>
            </button>
          );
        })}
      </div>

      {/* RWD 佈局：大螢幕雙欄 (左側地點列表、右側 Leaflet 地圖) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左側：地點快選清單卡片 */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 max-h-[500px] lg:max-h-[650px] overflow-y-auto space-y-2.5 shadow-xl order-2 lg:order-1">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span>標記地點列表 ({filteredLocations.length})</span>
            <span>點擊快速平移定位</span>
          </div>

          {filteredLocations.map((loc) => {
            const isCurrent = activeLocation?.id === loc.id;
            const meta = CATEGORY_COLORS[loc.category] || CATEGORY_COLORS.attraction;
            return (
              <div
                key={loc.id}
                onClick={() => setActiveLocation(loc)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  isCurrent
                    ? 'bg-slate-800 border-red-500 shadow-md'
                    : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: meta.bg }}
                      />
                      <h4 className="text-xs sm:text-sm font-bold text-white">
                        {loc.nameZh}
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-400">{loc.name}</p>
                  </div>

                  {loc.altitude && (
                    <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700 shrink-0">
                      {loc.altitude}m
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 mt-1.5 line-clamp-2 leading-relaxed">
                  {loc.description}
                </p>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-[11px]">
                  <span className="text-slate-400">
                    Day {loc.dayNumbers.join(', ')}
                  </span>
                  {loc.stpNote && (
                    <span className="text-emerald-400 font-medium truncate max-w-[150px]">
                      {loc.stpNote}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 右側：全功能 Leaflet 地圖容器 */}
        <div className="lg:col-span-2 h-[420px] sm:h-[500px] lg:h-[650px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative order-1 lg:order-2 z-10">
          <MapContainer
            center={defaultCenter}
            zoom={defaultZoom}
            scrollWheelZoom={false}
            className="w-full h-full"
          >
            {/* OpenStreetMap 經典磁磚圖層 */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* 視角控制器 */}
            <MapCenterController
              targetCoords={activeLocation ? activeLocation.coordinates : null}
            />

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
                    <div className="p-1 space-y-2 min-w-[200px] max-w-xs text-slate-100">
                      <div className="border-b border-slate-700/80 pb-1.5">
                        <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">
                          {CATEGORY_COLORS[loc.category]?.label || '景點'}
                        </span>
                        <h4 className="text-sm font-bold text-white leading-tight">
                          {loc.nameZh}
                        </h4>
                        <div className="text-[11px] text-slate-400">{loc.name}</div>
                      </div>

                      {loc.altitude && (
                        <div className="flex items-center gap-1 text-xs text-cyan-300 font-mono">
                          <Compass className="w-3.5 h-3.5" />
                          <span>海拔：{loc.altitude} 公尺</span>
                        </div>
                      )}

                      <p className="text-xs text-slate-300 leading-relaxed">
                        {loc.description}
                      </p>

                      {loc.stpNote && (
                        <div className="bg-emerald-950/60 p-1.5 rounded text-[11px] text-emerald-300 border border-emerald-900/60">
                          {loc.stpNote}
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between gap-2">
                        {/* 關聯天數跳轉 */}
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span className="text-[11px] text-slate-300">行程：</span>
                          {loc.dayNumbers.map((d) => (
                            <button
                              key={d}
                              onClick={() => handleGoToDay(d)}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-red-600 text-white font-bold hover:bg-red-500"
                            >
                              D{d}
                            </button>
                          ))}
                        </div>

                        {/* 即時攝影機 */}
                        {loc.webcamUrl && (
                          <a
                            href={loc.webcamUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 font-medium"
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
