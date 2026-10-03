import React from 'react';
import { Link } from 'react-router-dom';
import { Settings, Sun, Moon, Clock } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useActiveTrip } from '../../stores/selectors';
import { getDaysUntilTrip } from '../../utils/dates';
import { TripSwitcher } from '../shared/TripSwitcher';
import { SyncIndicator } from '../shared/SyncIndicator';

export const Header: React.FC = () => {
  const activeTrip = useActiveTrip();
  const { theme, setTheme } = useUIStore();
  const totalDays = activeTrip.config?.totalDays || activeTrip.itinerary?.length || 1;
  const countdown = getDaysUntilTrip(activeTrip.config?.startDate, totalDays);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="lg:hidden sticky top-0 z-40 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 shadow-xs no-print">
      <div className="px-3 sm:px-4">
        <div className="flex items-center justify-between h-14">
          {/* 左側：旅程切換器 */}
          <TripSwitcher compact={false} />

          {/* 右側：狀態膠囊 + 工具按鈕 */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* 倒數標籤 (平板尺寸以上顯示) */}
            {activeTrip.config?.startDate && (
              <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-[11px] font-medium text-stone-600 dark:text-stone-300">
                <Clock className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>{countdown.text}</span>
              </div>
            )}

            {/* 同步狀態燈 */}
            <SyncIndicator />

            {/* 主題切換 */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 rounded-xl text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="主題切換"
              aria-label="主題切換"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-stone-600" />
              )}
            </button>

            {/* 設定快捷按鈕 */}
            <Link
              to="/settings"
              className="p-1.5 rounded-xl text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="旅行設定"
              aria-label="設定"
            >
              <Settings className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};
