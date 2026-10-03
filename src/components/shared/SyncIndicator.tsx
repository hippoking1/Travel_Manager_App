import React, { useState, useEffect } from 'react';
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
import { Popover } from '../ui/Popover';
import { Button } from '../ui/Button';

export const SyncIndicator: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatusState>(syncManager.getStatus());
  const { fetchLatestFromSheets, isFetchingRemote } = useTripStore();

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

  const handleClearQueue = () => {
    syncManager.clearQueue();
  };

  const isWorking = syncStatus.isSyncing || isFetchingRemote;
  const hasError = !!syncStatus.lastError;
  const hasPending = syncStatus.pendingQueueCount > 0;

  return (
    <Popover
      align="right"
      trigger={({ isOpen, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={isOpen}
          aria-label="雲端同步狀態"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border cursor-pointer select-none ${
            isWorking
              ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-500/40'
              : hasError && hasPending
              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-500/50'
              : syncStatus.isConfigured
              ? hasPending
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-500/40'
                : 'bg-stone-100 dark:bg-stone-800 text-teal-700 dark:text-teal-300 border-stone-200 dark:border-stone-700'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700'
          }`}
        >
          {isWorking ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 animate-spin" />
              <span className="hidden sm:inline">同步中</span>
            </>
          ) : hasError && hasPending ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="hidden sm:inline font-bold">待同步 ({syncStatus.pendingQueueCount})</span>
            </>
          ) : syncStatus.isConfigured ? (
            <>
              <span className="relative flex h-2 w-2">
                <span
                  className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    hasPending ? 'animate-ping bg-amber-400' : 'bg-teal-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    hasPending ? 'bg-amber-500' : 'bg-teal-500'
                  }`}
                />
              </span>
              <Cloud className={`w-3.5 h-3.5 ${hasPending ? 'text-amber-600' : 'text-teal-600 dark:text-teal-400'}`} />
              <span className="hidden sm:inline">
                {hasPending ? `${syncStatus.pendingQueueCount} 待同步` : '已連線'}
              </span>
            </>
          ) : (
            <>
              <CloudOff className="w-3.5 h-3.5 text-stone-400" />
              <span className="hidden sm:inline">離線模式</span>
            </>
          )}
        </button>
      )}
    >
      {({ close }) => (
        <div className="w-72 sm:w-80 p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xl text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2">
            <span className="font-bold text-stone-900 dark:text-stone-100 text-sm flex items-center gap-1.5">
              <Cloud className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>雲端資料同步狀態</span>
            </span>
            <button
              type="button"
              onClick={close}
              className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-stone-500 dark:text-stone-400">Google Sheets 連線：</span>
              {syncStatus.isConfigured ? (
                <span className="text-teal-600 dark:text-teal-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 已設定 URL
                </span>
              ) : (
                <span className="text-stone-500 font-medium flex items-center gap-1">
                  <CloudOff className="w-3.5 h-3.5" /> 本機模式 (未連線)
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-stone-500 dark:text-stone-400">排隊待同步筆數：</span>
              <span className={`font-mono font-bold ${hasPending ? 'text-amber-600 dark:text-amber-400' : 'text-stone-700 dark:text-stone-300'}`}>
                {syncStatus.pendingQueueCount} 筆
              </span>
            </div>

            {syncStatus.lastSyncedAt && (
              <div className="flex items-center justify-between text-[11px] text-stone-400">
                <span>上次成功同步：</span>
                <span className="font-mono text-stone-600 dark:text-stone-300">
                  {new Date(syncStatus.lastSyncedAt).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>

          {syncStatus.lastError && (
            <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 text-[11px] space-y-1">
              <div className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>同步失敗提示：</span>
              </div>
              <p className="line-clamp-2 font-mono text-[10px] opacity-90">
                {syncStatus.lastError}
              </p>
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
            <Button
              variant="primary"
              size="sm"
              onClick={handleManualSync}
              loading={isWorking}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              className="w-full"
            >
              {isWorking ? '同步處理中...' : '手動執行雲端同步'}
            </Button>

            {hasPending && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearQueue}
                icon={<Trash2 className="w-3.5 h-3.5 text-amber-500" />}
                className="w-full text-xs"
              >
                清空卡住的佇列 ({syncStatus.pendingQueueCount})
              </Button>
            )}

            <Link
              to="/settings"
              onClick={close}
              className="block text-center text-[11px] text-stone-400 hover:text-teal-600 dark:hover:text-teal-400 pt-1"
            >
              設定 Google Apps Script 網址 ➔
            </Link>
          </div>
        </div>
      )}
    </Popover>
  );
};
