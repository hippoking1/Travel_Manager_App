import React from 'react';
import { Header } from './Header';
import { MobileNav } from './MobileNav';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-red-500 selection:text-white">
      {/* 頂部 Sticky 導航 */}
      <Header />

      {/* 主內容區：底邊預留空間避免被手機底部導覽列遮擋 */}
      <main className="flex-1 pb-20 lg:pb-12">
        {children}
      </main>

      {/* 手機底部導覽列 */}
      <MobileNav />
    </div>
  );
};
