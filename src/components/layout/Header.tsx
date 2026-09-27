import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { 
  CalendarDays, 
  MapPin, 
  Wallet, 
  CloudSun, 
  Mountain, 
  Settings, 
  Printer, 
  Clock 
} from 'lucide-react';
import { useTripStore } from '../../stores/tripStore';
import { getDaysUntilTrip } from '../../utils/dates';
import { SyncIndicator } from '../shared/SyncIndicator';

export const Header: React.FC = () => {
  const { config } = useTripStore();
  const countdown = getDaysUntilTrip(config.startDate);

  const navItems = [
    { to: '/', label: '每日行程', icon: CalendarDays },
    { to: '/map', label: '地理地圖', icon: MapPin },
    { to: '/budget', label: '預算與 STP', icon: Wallet },
    { to: '/weather', label: '天氣與穿搭', icon: CloudSun },
    { to: '/matterhorn', label: '馬特洪日出', icon: Mountain },
    { to: '/settings', label: '行程設定', icon: Settings },
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 shadow-lg no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* 左側：品牌 Logo 與標題 */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/30 group-hover:scale-105 transition-transform">
              <span className="text-white text-lg font-bold">🇨🇭</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg text-white tracking-tight">
                  Swiss Family Odyssey
                </span>
                <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
                  2027
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block truncate max-w-xs">
                {config.subtitle || '16 天多代家庭慢遊指南'}
              </p>
            </div>
          </Link>

          {/* 中間：PC/平板 導航列 */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* 右側：狀態膠囊 + 工具按鈕 */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 倒數標籤 */}
            {config.startDate && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-xs text-slate-200">
                <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="font-semibold text-sky-300">{countdown.text}</span>
              </div>
            )}

            {/* Google Sheets 同步狀態燈 */}
            <SyncIndicator />

            {/* 列印 PDF 手冊按鈕 (PC端) */}
            <button
              onClick={handlePrint}
              className="hidden md:flex items-center gap-1.5 p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="列印或輸出為 A4 乾淨 PDF 行程單"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* 手機/平板 設定快捷按鈕 */}
            <Link
              to="/settings"
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="旅行設定"
            >
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};
