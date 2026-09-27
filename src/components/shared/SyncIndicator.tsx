import React, { useState, useEffect, useRef } from 'react';
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { syncManager } from '../../services/syncManager';
import { useTripStore } from '../../stores/tripStore';
import type { SyncStatusState } from '../../types';

export const SyncIndicator: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatusState>(syncManager.getStatus());
  const { fetchLatestFromSheets, isFetchingRemote } = useTripStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = syncManager.subscribe((status) => {
      setSyncStatus(status);
    });
    return unsubscribe;
  }, []);

  // 點擊外部自動關閉
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleManualSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await syncManager.flushQueue();
    await fetchLatestFromSheets();
  };

  const handleClearQueue = (e: React.MouseEvent) => {
    e.stopPropagation();
    syncManager.clearQueue();
  };

  const isWorking = syncStatus.isSyncing || isFetchingRemote;
  const hasError = !!syncStatus.lastError;
  const hasPending = syncStatus.pendingQueueCount > 0;

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* 頂部觸發按鈕 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
          isWorking
            ? 'bg-slate-800 text-sky-300 border-sky-500/40'
            : hasError && hasPending
            ? 'bg-amber-950/80 hover:bg-amber-900/80 text-amber-300 border-amber-600/60 shadow-lg shadow-amber-950/50'
            : syncStatus.isConfigured
            ? hasPending
              ? 'bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border-amber-600/50'
              : 'bg-slate-800/80 hover:bg-slate-700/80 text-emerald-300 border-slate-700/60'
            : 'bg-slate-800/80 hover:bg-slate-700/80 text-amber-300 border-slate-700/60'
        }`}
        title="點擊查看同步詳情與佇列管理"
      >
        {isWorking ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin" />
            <span className="hidden sm:inline text-sky-300">同步中...</span>
          </>
        ) : hasError && hasPending ? (
          <>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="text-amber-300 font-bold">待同步 ({syncStatus.pendingQueueCount})</span>
          </>
        ) : syncStatus.isConfigured ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                hasPending ? 'animate-ping bg-amber-400' : 'bg-emerald-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                hasPending ? 'bg-amber-500' : 'bg-emerald-500'
              }`}></span>
            </span>
            <Cloud className={`w-3.5 h-3.5 ${hasPending ? 'text-amber-400' : 'text-emerald-400'}`} />
            <span className="hidden sm:inline">
              {hasPending ? `待同步 (${syncStatus.pendingQueueCount})` : '雲端已連線'}
            </span>
          </>
        ) : (
          <>
            <CloudOff className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline text-amber-300">本機離線模式</span>
          </>
        )}
      </button>

      {/* 點擊展開的同步管理面板 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 p-4 bg-slate-900 text-slate-200 text-xs rounded-2xl shadow-2xl border border-slate-700 z-50 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <span className="font-bold text-white text-sm flex items-center gap-1.5">
              <Cloud className="w-4 h-4 text-sky-400" />
              <span>雲端資料同步中心</span>
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 連線狀態檢視 */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Google 試算表連線：</span>
              {syncStatus.isConfigured ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 已設定 URL
                </span>
              ) : (
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <CloudOff className="w-3.5 h-3.5" /> 尚未設定 (本機模式)
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">目前排隊待同步項目：</span>
              <span className={`font-mono font-bold ${hasPending ? 'text-amber-400' : 'text-slate-300'}`}>
                {syncStatus.pendingQueueCount} 筆
              </span>
            </div>

            {syncStatus.lastSyncedAt && (
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>上次成功同步：</span>
                <span className="text-slate-300 font-mono">
                  {new Date(syncStatus.lastSyncedAt).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>

          {/* 錯誤警告通知 */}
          {syncStatus.lastError && (
            <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-900/60 text-red-200 text-[11px] space-y-1 mb-3">
              <div className="font-bold flex items-center gap-1 text-red-300">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>同步失敗提示：</span>
              </div>
              <p className="line-clamp-3 opacity-90 leading-relaxed font-mono">
                {syncStatus.lastError}
              </p>
              <p className="text-[10px] text-red-400 mt-1">
                可能原因：Google 試算表中缺少相應的分頁名稱（如 TripConfig, Expenses），或 Apps Script 權限尚未開啟「所有人皆可存取」。
              </p>
            </div>
          )}

          {/* 操作按鈕群 */}
          <div className="space-y-2 pt-1 border-t border-slate-800">
            <button
              onClick={handleManualSync}
              disabled={isWorking}
              className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isWorking ? 'animate-spin' : ''}`} />
              <span>{isWorking ? '同步處理中...' : '立即手動強制同步'}</span>
            </button>

            {hasPending && (
              <button
                onClick={handleClearQueue}
                className="w-full bg-slate-800 hover:bg-red-950/50 hover:text-red-300 text-slate-300 font-semibold py-1.5 rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-700/80 transition-colors"
                title="清空佇列中卡住的排隊項目"
              >
                <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                <span>清空卡住的待同步佇列 ({syncStatus.pendingQueueCount})</span>
              </button>
            )}

            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              className="w-full text-center text-[11px] text-slate-400 hover:text-sky-300 py-1 block transition-colors"
            >
              檢查 Google Apps Script 網址設定 ➔
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
