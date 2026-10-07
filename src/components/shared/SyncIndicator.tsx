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
  const [pushResult, setPushResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isPushing, setIsPushing] = useState(false);

  const { fetchLatestFromSheets, pushActiveTripToSheets, isFetchingRemote, config } = useTripStore();

  useEffect(() => {
    const unsubscribe = syncManager.subscribe((status) => {
      setSyncStatus(status);
    });
    return unsubscribe;
  }, []);

  const handleManualSync = async () => {
    setPushResult(null);
    await syncManager.flushQueue();
    await fetchLatestFromSheets();
  };

  const handleFullPush = async () => {
    setIsPushing(true);
    setPushResult(null);
    try {
      const res = await pushActiveTripToSheets();
      if (res.success) {
        setPushResult({
          success: true,
          message: res.stats
            ? `已發布！包含 ${res.stats.itinerary || 0} 天行程、${res.stats.accommodations || 0} 筆住宿、${res.stats.checklist || 0} 項清單`
            : res.message || '已成功將整份行程推播至 Google 試算表！',
        });
      } else {
        setPushResult({
          success: false,
          message: res.error || '推播失敗，請檢查網路或 Apps Script URL',
        });
      }
    } finally {
      setIsPushing(false);
    }
  };

  const handleClearQueue = () => {
    syncManager.clearQueue();
  };

  const isWorking = syncStatus.isSyncing || isFetchingRemote || isPushing;
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
        <div className="w-72 sm:w-88 p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xl text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2">
            <span className="font-bold text-stone-900 dark:text-stone-100 text-sm flex items-center gap-1.5">
              <Cloud className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Google Sheets 雲端同步中心</span>
            </span>
            <button
              type="button"
              onClick={close}
              className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5 bg-stone-50 dark:bg-stone-800/50 p-2.5 rounded-xl border border-stone-100 dark:border-stone-800">
            <div className="flex items-center justify-between">
              <span className="text-stone-500 dark:text-stone-400">當前作用中旅程：</span>
              <span className="font-bold text-stone-800 dark:text-stone-200 truncate max-w-[160px]">
                {config.tripName || '未命名旅程'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-stone-500 dark:text-stone-400">雲端連線狀態：</span>
              {syncStatus.isConfigured ? (
                <span className="text-teal-600 dark:text-teal-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 已綁定 Web App
                </span>
              ) : (
                <span className="text-stone-500 font-medium flex items-center gap-1">
                  <CloudOff className="w-3.5 h-3.5" /> 本機模式 (未綁定)
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-stone-500 dark:text-stone-400">待傳送暫存佇列：</span>
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

          {pushResult && (
            <div className={`p-2.5 rounded-xl border text-[11px] space-y-1 ${
              pushResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
            }`}>
              <div className="font-bold flex items-center gap-1">
                {pushResult.success ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertTriangle className="w-3.5 h-3.5 text-red-600" />}
                <span>{pushResult.success ? '推播成功！' : '推播失敗：'}</span>
              </div>
              <p className="leading-relaxed">{pushResult.message}</p>
            </div>
          )}

          {syncStatus.lastError && (
            <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 text-[11px] space-y-1">
              <div className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>錯誤提示：</span>
              </div>
              <p className="line-clamp-2 font-mono text-[10px] opacity-90">
                {syncStatus.lastError}
              </p>
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
            {/* 核心功能：一鍵將當前行程推播至 Google 試算表 */}
            <Button
              variant="primary"
              size="sm"
              onClick={handleFullPush}
              loading={isPushing}
              icon={<Cloud className="w-3.5 h-3.5" />}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold"
            >
              {isPushing ? '正在發布整份行程至試算表...' : '🚀 一鍵發布當前行程至 Google 試算表'}
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualSync}
                loading={isWorking && !isPushing}
                icon={<RefreshCw className="w-3 h-3" />}
                className="text-xs"
              >
                拉取雲端更新
              </Button>

              <a
                href="https://docs.google.com/spreadsheets/d/1CbeP5RJPTVrFCdFZDVDzT3zkwiQtf7Twyhenox0siiA/edit"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold"
              >
                <span>開啟試算表 ↗</span>
              </a>
            </div>

            {hasPending && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearQueue}
                icon={<Trash2 className="w-3.5 h-3.5 text-amber-500" />}
                className="w-full text-xs text-amber-600"
              >
                清空排隊佇列 ({syncStatus.pendingQueueCount})
              </Button>
            )}

            <Link
              to="/settings"
              onClick={close}
              className="block text-center text-[11px] text-stone-400 hover:text-teal-600 dark:hover:text-teal-400 pt-1"
            >
              檢查 / 變更 Google Apps Script 網址 ➔
            </Link>
          </div>
        </div>
      )}
    </Popover>
  );
};
