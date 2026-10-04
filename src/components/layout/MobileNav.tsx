import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  CalendarDays, 
  Building2, 
  MapPin, 
  Wallet, 
  MoreHorizontal, 
  CheckSquare, 
  CloudSun, 
  Mountain, 
  Settings, 
  Printer, 
  X,
  Compass,
  Sparkles
} from 'lucide-react';
import { useActiveTrip } from '../../stores/selectors';
import { hasModule } from '../../config/modules';

export const MobileNav: React.FC = () => {
  const [showMore, setShowMore] = useState(false);
  const activeTrip = useActiveTrip();
  const isSwissEnabled = hasModule(activeTrip.modules, 'swiss');

  const primaryTabs = [
    { to: '/', label: '行程', icon: CalendarDays },
    { to: '/bookings', label: '住宿交通', icon: Building2 },
    { to: '/map', label: '地圖', icon: MapPin },
    { to: '/budget', label: '預算', icon: Wallet },
  ];

  return (
    <>
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-lg border-t border-stone-200 dark:border-stone-800 safe-bottom no-print">
        <nav className="flex items-center justify-around h-14 px-1">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center w-full h-full py-1 text-[11px] font-medium transition-colors ${
                    isActive
                      ? 'text-teal-700 dark:text-teal-400 font-bold'
                      : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`
                }
              >
                <Icon className="w-5 h-5 mb-0.5" />
                <span>{tab.label}</span>
              </NavLink>
            );
          })}

          {/* 更多功能抽屜按鈕 */}
          <button
            type="button"
            onClick={() => setShowMore(true)}
            className="flex flex-col items-center justify-center w-full h-full py-1 text-[11px] font-medium text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 cursor-pointer"
          >
            <MoreHorizontal className="w-5 h-5 mb-0.5" />
            <span>更多</span>
          </button>
        </nav>
      </div>

      {/* 「更多」底部選單抽屜 (Bottom Sheet) */}
      {showMore && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end lg:hidden animate-in fade-in-0 duration-150"
          onClick={() => setShowMore(false)}
        >
          <div
            className="bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 rounded-t-3xl p-5 space-y-4 safe-bottom max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <span className="font-bold text-sm text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>更多旅遊規劃功能</span>
              </span>
              <button
                type="button"
                onClick={() => setShowMore(false)}
                className="p-1 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* AI 智慧匯入醒目捷徑 */}
            <NavLink
              to="/import"
              onClick={() => setShowMore(false)}
              className="p-3.5 rounded-2xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-center justify-between font-bold text-teal-900 dark:text-teal-200 shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black">AI 智慧行程匯入</div>
                  <div className="text-[10px] text-teal-700/80 dark:text-teal-400 font-normal">
                    複製 Prompt、貼上對話即刻排程
                  </div>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-200/60 dark:bg-teal-900 text-teal-800 dark:text-teal-300 font-bold">
                PRO
              </span>
            </NavLink>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <NavLink
                to="/checklist"
                onClick={() => setShowMore(false)}
                className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-800 flex items-center gap-2.5 font-semibold text-stone-800 dark:text-stone-200 hover:border-teal-500"
              >
                <CheckSquare className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
                <div>
                  <span className="block">行前清單</span>
                  <span className="text-[10px] text-stone-400 font-normal">洋蔥穿搭與必備物品</span>
                </div>
              </NavLink>

              <NavLink
                to="/weather"
                onClick={() => setShowMore(false)}
                className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-800 flex items-center gap-2.5 font-semibold text-stone-800 dark:text-stone-200 hover:border-teal-500"
              >
                <CloudSun className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <span className="block">天氣穿搭</span>
                  <span className="text-[10px] text-stone-400 font-normal">各基地即時預報</span>
                </div>
              </NavLink>

              {isSwissEnabled && (
                <NavLink
                  to="/matterhorn"
                  onClick={() => setShowMore(false)}
                  className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 flex items-center gap-2.5 font-semibold text-amber-900 dark:text-amber-200 hover:border-amber-500"
                >
                  <Mountain className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div>
                    <span className="block">Matterhorn 日出</span>
                    <span className="text-[10px] text-amber-600/70 font-normal">黃金日出攝影機位</span>
                  </div>
                </NavLink>
              )}

              <NavLink
                to="/settings"
                onClick={() => setShowMore(false)}
                className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-800 flex items-center gap-2.5 font-semibold text-stone-800 dark:text-stone-200 hover:border-teal-500"
              >
                <Settings className="w-5 h-5 text-stone-500 shrink-0" />
                <div>
                  <span className="block">旅行設定</span>
                  <span className="text-[10px] text-stone-400 font-normal">旅伴、基地與雲端</span>
                </div>
              </NavLink>
            </div>

            <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => {
                  setShowMore(false);
                  window.print();
                }}
                className="w-full p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium flex items-center justify-center gap-2 text-xs"
              >
                <Printer className="w-4 h-4" />
                <span>列印或匯出 PDF 行程單</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
