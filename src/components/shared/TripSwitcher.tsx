import React, { useState } from 'react';
import { ChevronDown, Plus, Check, Settings, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTripStore } from '../../stores/tripStore';
import { useActiveTrip } from '../../stores/selectors';
import { Popover } from '../ui/Popover';
import { NewTripModal } from './NewTripModal';

export const TripSwitcher: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { trips, activeTripId, switchTrip } = useTripStore();
  const activeTrip = useActiveTrip();
  const [showNewModal, setShowNewModal] = useState(false);

  const totalDays = activeTrip.config?.totalDays || activeTrip.itinerary?.length || 1;

  return (
    <>
      <Popover
        align="left"
        trigger={({ isOpen, toggle }) => (
          <button
            type="button"
            onClick={toggle}
            aria-expanded={isOpen}
            aria-label="切換旅遊計畫"
            className={`flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border transition-all text-left cursor-pointer select-none ${
              isOpen
                ? 'bg-stone-100 dark:bg-stone-800 border-teal-600 dark:border-teal-500 ring-1 ring-teal-600 dark:ring-teal-500'
                : 'bg-stone-100/80 dark:bg-stone-800/60 hover:bg-stone-200/60 dark:hover:bg-stone-800 border-stone-200 dark:border-stone-700/80'
            }`}
          >
            <span className="text-base sm:text-lg leading-none shrink-0 p-1 rounded-lg bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-700/60 shadow-xs">
              {activeTrip?.coverEmoji || '✈️'}
            </span>

            {!compact && (
              <div className="flex flex-col min-w-0 max-w-[120px] sm:max-w-[160px]">
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate leading-tight">
                  {activeTrip?.name || '我的旅遊計畫'}
                </span>
                <span className="text-[10px] text-stone-500 dark:text-stone-400 truncate leading-tight">
                  {totalDays} 天規劃
                </span>
              </div>
            )}

            <ChevronDown
              className={`w-3.5 h-3.5 text-stone-400 transition-transform shrink-0 ${
                isOpen ? 'rotate-180 text-teal-600 dark:text-teal-400' : ''
              }`}
            />
          </button>
        )}
      >
        {({ close }) => (
          <div className="w-72 sm:w-80 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xl py-2 overflow-hidden">
            {/* Header */}
            <div className="px-3.5 py-2 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500 dark:text-stone-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Compass className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>所有旅遊計畫 ({trips.length})</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  close();
                  setShowNewModal(true);
                }}
                className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新旅程</span>
              </button>
            </div>

            {/* List */}
            <div className="max-h-64 overflow-y-auto py-1 scrollbar-none space-y-0.5 px-1.5">
              {trips.map((trip) => {
                const isActive = trip.id === activeTripId;
                const days = trip.config?.totalDays || trip.itinerary?.length || 1;
                return (
                  <button
                    key={trip.id}
                    type="button"
                    onClick={() => {
                      switchTrip(trip.id);
                      close();
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-teal-50 dark:bg-teal-950/40 border border-teal-500/30 text-stone-900 dark:text-stone-100 font-medium'
                        : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-lg shrink-0 p-1 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                        {trip.coverEmoji || '✈️'}
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs font-bold truncate block">
                          {trip.name}
                        </span>
                        <div className="text-[11px] text-stone-400 flex items-center gap-1.5 mt-0.5">
                          {trip.destination && (
                            <span className="truncate max-w-[100px]">{trip.destination}</span>
                          )}
                          <span>•</span>
                          <span className="font-mono">{days} 天</span>
                        </div>
                      </div>
                    </div>

                    {isActive && (
                      <div className="w-4 h-4 rounded-full bg-teal-600 dark:bg-teal-500 flex items-center justify-center shrink-0 text-white dark:text-stone-950">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-1 pt-2 border-t border-stone-100 dark:border-stone-800 px-3 flex items-center justify-between text-xs text-stone-500">
              <button
                type="button"
                onClick={() => {
                  close();
                  setShowNewModal(true);
                }}
                className="hover:text-stone-900 dark:hover:text-stone-200 font-medium flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-teal-600" />
                <span>建立新計畫</span>
              </button>

              <Link
                to="/settings"
                onClick={close}
                className="hover:text-stone-900 dark:hover:text-stone-200 font-medium flex items-center gap-1 text-[11px]"
              >
                <Settings className="w-3 h-3 text-stone-400" />
                <span>旅程管理</span>
              </Link>
            </div>
          </div>
        )}
      </Popover>

      <NewTripModal isOpen={showNewModal} onClose={() => setShowNewModal(false)} />
    </>
  );
};
