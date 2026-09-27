import React from 'react';
import { NavLink } from 'react-router-dom';
import { CalendarDays, MapPin, Wallet, CloudSun, Mountain } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const tabs = [
    { to: '/', label: '行程', icon: CalendarDays },
    { to: '/map', label: '地圖', icon: MapPin },
    { to: '/budget', label: '預算', icon: Wallet },
    { to: '/weather', label: '天氣裝備', icon: CloudSun },
    { to: '/matterhorn', label: '日出專區', icon: Mountain },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 safe-bottom no-print">
      <nav className="flex items-center justify-around h-14 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center w-full h-full py-1 text-[11px] font-medium transition-colors ${
                  isActive
                    ? 'text-red-500 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};
