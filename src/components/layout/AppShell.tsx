import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ToastContainer } from '../ui/Toast';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row antialiased">
      {/* 桌面端側邊欄導航 (≥ lg) */}
      <Sidebar />

      {/* 主內容包裝區 */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* 移動/平板端頂部導航 (< lg) */}
        <Header />

        {/* 頁面主要內容 */}
        <main className="flex-1 pb-20 lg:pb-8 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* 移動端底部 5-Tab 導航 (< lg) */}
      <MobileNav />

      {/* 全域 Promise 對話框與 Toast 提示中心 */}
      <ConfirmDialog />
      <ToastContainer />
    </div>
  );
};
