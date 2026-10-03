import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  CalendarDays, 
  Building2, 
  CheckSquare, 
  MapPin, 
  Wallet, 
  CloudSun, 
  Mountain, 
  Settings, 
  Printer, 
  Sun, 
  Moon, 
  Clock, 
  Compass,
  Sparkles
} from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useActiveTrip } from '../../stores/selectors';
import { getDaysUntilTrip } from '../../utils/dates';
import { TripSwitcher } from '../shared/TripSwitcher';
import { SyncIndicator } from '../shared/SyncIndicator';
import { hasModule } from '../../config/modules';

export const Sidebar: React.FC = () => {
  const activeTrip = useActiveTrip();
  const { theme, setTheme } = useUIStore();
  const totalDays = activeTrip.config?.totalDays || activeTrip.itinerary?.length || 1;
  const countdown = getDaysUntilTrip(activeTrip.config?.startDate, totalDays);

  const navItems = [
    { to: '/', label: '每日行程', icon: CalendarDays },
    { to: '/bookings', label: '住宿與交通', icon: Building2 },
    { to: '/checklist', label: '行前清單', icon: CheckSquare },
    { to: '/map', label: '地理地圖', icon: MapPin },
    { to: '/budget', label: '預算記帳', icon: Wallet },
    { to: '/weather', label: '天氣與穿搭', icon: CloudSun },
  ];

  const isSwissEnabled = hasModule(activeTrip.modules, 'swiss');

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <aside className="w-64 h-screen sticky top-0 hidden lg:flex flex-col bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 z-30 select-none no-print">
      {/* 頂部 Logo 與 App 名稱 */}
      <div className="p-4 border-b border-stone-100 dark:border-stone-800">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-xl bg-teal-700 dark:bg-teal-500 text-white dark:text-stone-950 flex items-center justify-center shadow-xs">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm text-stone-900 dark:text-stone-100 tracking-tight">
                旅遊規劃助手
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 font-mono font-bold border border-teal-200 dark:border-teal-800">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-stone-400 truncate">自由行與多旅程排程</p>
          </div>
        </div>

        {/* 旅程切換器 */}
        <TripSwitcher />
      </div>

      {/* 中間導航選單 */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
          行程模組
        </span>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 font-bold border border-teal-200/60 dark:border-teal-800/40 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        {/* 目的地特色特輯 (動態模組) */}
        {isSwissEnabled && (
          <div className="pt-3">
            <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1 mb-1">
              <Sparkles className="w-3 h-3" />
              <span>瑞士專屬特輯</span>
            </span>
            <NavLink
              to="/matterhorn"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold border border-amber-200/60 dark:border-amber-800/40'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800/60'
                }`
              }
            >
              <Mountain className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Matterhorn 金頂日出</span>
            </NavLink>
          </div>
        )}
      </div>

      {/* 底部功能與狀態列 */}
      <div className="p-3 border-t border-stone-100 dark:border-stone-800 space-y-2">
        {/* 出發倒數 */}
        {activeTrip.config?.startDate && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/60 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-300">
            <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
            <span className="truncate font-medium">{countdown.text}</span>
          </div>
        )}

        <div className="flex items-center justify-between px-1">
          {/* 雲端同步狀態 */}
          <SyncIndicator />

          <div className="flex items-center gap-1">
            {/* 深淺色主題切換 */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              title={theme === 'dark' ? '切換為明亮紙感模式' : '切換為暗色模式'}
              aria-label="主題切換"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-stone-600" />}
            </button>

            {/* 列印 PDF */}
            <button
              type="button"
              onClick={() => window.print()}
              className="p-2 rounded-xl text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              title="列印或輸出為 A4 乾淨 PDF 行程單"
              aria-label="列印行程"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* 旅程設定 */}
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `p-2 rounded-xl transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100'
                    : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`
              }
              title="旅行總設定"
              aria-label="系統設定"
            >
              <Settings className="w-4 h-4" />
            </NavLink>
          </div>
        </div>
      </div>
    </aside>
  );
};
