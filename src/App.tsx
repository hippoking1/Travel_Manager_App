import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ItineraryPage } from './components/itinerary/ItineraryPage';
import { MapPage } from './components/map/MapPage';
import { BookingsPage } from './components/bookings/BookingsPage';
import { AttractionsPage } from './components/attractions/AttractionsPage';
import { BudgetPage } from './components/budget/BudgetPage';
import { WeatherPage } from './components/weather/WeatherPage';
import { ChecklistPage } from './components/checklist/ChecklistPage';
import { MatterhornPage } from './components/special/MatterhornPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { ImportPage } from './components/import/ImportPage';
import { useTripStore } from './stores/tripStore';

export const App: React.FC = () => {
  const { fetchLatestFromSheets } = useTripStore();

  // App 啟動時自動嘗試與 Google Sheets 靜默背景同步一次
  useEffect(() => {
    fetchLatestFromSheets();
  }, [fetchLatestFromSheets]);

  // 當使用者在不同裝置編輯並切換回此視窗分頁時，自動靜默拉取最新雲端資料
  useEffect(() => {
    let lastPullTime = Date.now();
    const handleActive = () => {
      // 至少間隔 10 秒以上才重新觸發拉取，防止頻繁聚焦洗頻
      if (Date.now() - lastPullTime > 10000 && document.visibilityState === 'visible') {
        lastPullTime = Date.now();
        fetchLatestFromSheets();
      }
    };

    window.addEventListener('focus', handleActive);
    document.addEventListener('visibilitychange', handleActive);
    return () => {
      window.removeEventListener('focus', handleActive);
      document.removeEventListener('visibilitychange', handleActive);
    };
  }, [fetchLatestFromSheets]);

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppShell>
        <Routes>
          <Route path="/" element={<ItineraryPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/attractions" element={<AttractionsPage />} />
          <Route path="/checklist" element={<ChecklistPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/budget" element={<BudgetPage />} />
          <Route path="/weather" element={<WeatherPage />} />
          <Route path="/matterhorn" element={<MatterhornPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          {/* 未知路由重導向回首頁 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
};

export default App;
