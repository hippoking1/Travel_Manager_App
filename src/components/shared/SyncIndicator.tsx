import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { syncManager } from '../../services/syncManager';
import { useTripStore } from '../../stores/tripStore';
import type { SyncStatusState } from '../../types';

export const SyncIndicator: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatusState>(syncManager.getStatus());
  const { fetchLatestFromSheets, isFetchingRemote } = useTripStore();
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const unsubscribe = syncManager.subscribe((status) => {
      setSyncStatus(status);
    });
    return unsubscribe;
  }, []);

  const handleManualSync = async () => {
    await syncManager.flushQueue();
    await fetchLatestFromSheets();
  };

  const isWorking = syncStatus.isSyncing || isFetchingRemote;

  return (
    <div className="relative inline-block">
      <button
        onClick={handleManualSync}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60"
        title="點擊立即手動同步 Google Sheets 雲端資料"
      >
        {isWorking ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin" />
            <span className="hidden sm:inline text-sky-300">同步中...</span>
          </>
        ) : syncStatus.isConfigured ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Cloud className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline text-emerald-300">
              {syncStatus.pendingQueueCount > 0 ? `待同步(${syncStatus.pendingQueueCount})` : '雲端已連線'}
            </span>
          </>
        ) : (
          <>
            <CloudOff className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline text-amber-300">本機離線模式</span>
          </>
        )}
      </button>

      {/* 浮動提示小卡 */}
      {showTooltip && (
        <div className="absolute right-0 mt-2 w-64 p-3 bg-slate-800 text-slate-200 text-xs rounded-xl shadow-2xl border border-slate-700 z-50 animate-in fade-in zoom-in-95">
          <div className="font-semibold text-white mb-1 flex items-center justify-between">
            <span>Google Sheets 狀態</span>
            {syncStatus.isConfigured ? (
              <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> 已綁定</span>
            ) : (
              <span className="text-amber-400">僅暫存於本機</span>
            )}
          </div>
          <p className="text-slate-400 mb-2 leading-relaxed">
            {syncStatus.isConfigured
              ? '所有記帳、行李打勾與日期更動皆會自動同步至家人共用的 Google 試算表。'
              : '前往設定頁面輸入 Google Apps Script URL，即可啟用多人免登入即時雲端同步！'}
          </p>
          {syncStatus.lastSyncedAt && (
            <div className="text-[10px] text-slate-500 border-t border-slate-700/60 pt-1.5">
              上次更新：{new Date(syncStatus.lastSyncedAt).toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
