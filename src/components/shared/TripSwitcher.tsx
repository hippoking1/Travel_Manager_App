import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Check, Settings, Compass } from 'lucide-react';
import { useTripStore } from '../../stores/tripStore';
import { NewTripModal } from './NewTripModal';
import { Link } from 'react-router-dom';

export const TripSwitcher: React.FC = () => {
  const { trips, activeTripId, switchTrip, config, itinerary } = useTripStore();
  const [isOpen, setIsOpen] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeTrip = trips.find((t) => t.id === activeTripId) || trips[0];

  // 點擊外部自動關閉下拉選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectTrip = (tripId: string) => {
    switchTrip(tripId);
    setIsOpen(false);
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* 切換器膠囊按鈕 */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border transition-all select-none text-left ${
            isOpen
              ? 'bg-slate-800 border-red-500/80 text-white shadow-lg ring-1 ring-red-500/30'
              : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-slate-200 hover:text-white'
          }`}
          title="點擊切換或管理旅遊計畫"
        >
          <span className="text-sm sm:text-base leading-none shrink-0">
            {activeTrip?.coverEmoji || '🇨🇭'}
          </span>
          <div className="flex flex-col min-w-0 max-w-[110px] sm:max-w-[160px] md:max-w-[190px]">
            <span className="text-xs font-bold text-white truncate leading-tight">
              {config.tripName || activeTrip?.name || '旅遊計畫'}
            </span>
            <span className="text-[10px] text-slate-400 truncate leading-tight">
              {itinerary.length} 天規劃
            </span>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ${
              isOpen ? 'rotate-180 text-red-400' : ''
            }`}
          />
        </button>

        {/* 下拉面板 */}
        {isOpen && (
          <div className="absolute left-0 mt-2 w-72 sm:w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
            {/* 面板標題 */}
            <div className="px-3.5 py-2 border-b border-slate-800 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-red-400" />
                <span>我的旅遊計畫 ({trips.length})</span>
              </span>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowNewModal(true);
                }}
                className="text-[11px] font-semibold text-red-400 hover:text-red-300 flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" />
                <span>新增旅程</span>
              </button>
            </div>

            {/* 旅程清單 */}
            <div className="max-h-64 overflow-y-auto py-1 scrollbar-none space-y-0.5 px-1.5">
              {trips.map((trip) => {
                const isActive = trip.id === activeTripId;
                const daysCount = trip.config?.totalDays || trip.itinerary?.length || 1;
                return (
                  <button
                    key={trip.id}
                    onClick={() => handleSelectTrip(trip.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                      isActive
                        ? 'bg-red-600/15 border border-red-500/30 text-white'
                        : 'hover:bg-slate-800/80 text-slate-300 hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl shrink-0 p-1 rounded-lg bg-slate-800/60 border border-slate-700/50">
                        {trip.coverEmoji || '✈️'}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold truncate">
                            {trip.name}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          {trip.destination && (
                            <span className="truncate max-w-[100px]">{trip.destination}</span>
                          )}
                          <span>•</span>
                          <span className="font-mono text-slate-300 font-semibold">{daysCount} 天</span>
                          {trip.config?.startDate && (
                            <>
                              <span>•</span>
                              <span className="font-mono">{trip.config.startDate}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {isActive && (
                      <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center shrink-0 shadow-sm text-white">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 底部功能連結 */}
            <div className="mt-1 pt-2 border-t border-slate-800 px-3 flex items-center justify-between text-xs text-slate-400">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowNewModal(true);
                }}
                className="hover:text-white font-medium flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>建立新計畫</span>
              </button>

              <Link
                to="/settings"
                onClick={() => setIsOpen(false)}
                className="hover:text-white font-medium flex items-center gap-1 text-[11px]"
              >
                <Settings className="w-3 h-3 text-slate-400" />
                <span>旅程管理</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* 新增旅程 Modal */}
      <NewTripModal isOpen={showNewModal} onClose={() => setShowNewModal(false)} />
    </>
  );
};
