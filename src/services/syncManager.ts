import { mutateSheet, isGasConfigured } from './sheetApi';
import type { SyncStatusState } from '../types';

interface QueueItem {
  id: string;
  timestamp: string;
  sheet: string;
  action: 'APPEND' | 'UPDATE' | 'DELETE';
  payload: Record<string, unknown>;
  retries: number;
}

const STORAGE_KEY = 'travel_sync_offline_queue';

class SyncManager {
  private isSyncing = false;
  private listeners = new Set<(status: SyncStatusState) => void>();
  private lastError: string | null = null;
  private lastSyncedAt: string | null = null;

  constructor() {
    this.lastSyncedAt = localStorage.getItem('travel_last_synced_time');
    // 監聽瀏覽器網路恢復連線事件
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.flushQueue();
      });
    }
  }

  /** 取得目前未完成同步佇列 */
  private getQueue(): QueueItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /** 儲存佇列到 LocalStorage */
  private saveQueue(queue: QueueItem[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    this.notify();
  }

  /** 加入同步排程 */
  public enqueue(
    sheet: string,
    action: 'APPEND' | 'UPDATE' | 'DELETE',
    payload: Record<string, unknown>
  ) {
    const queue = this.getQueue();
    queue.push({
      id: crypto.randomUUID ? crypto.randomUUID() : `sync_${Date.now()}_${Math.random()}`,
      timestamp: new Date().toISOString(),
      sheet,
      action,
      payload,
      retries: 0,
    });
    this.saveQueue(queue);

    // 觸發同步
    if (navigator.onLine && isGasConfigured()) {
      this.flushQueue();
    }
  }

  /** 清空與批次送出佇列 */
  public async flushQueue() {
    if (this.isSyncing) return;
    const queue = this.getQueue();
    if (queue.length === 0) return;
    if (!isGasConfigured()) return;

    this.isSyncing = true;
    this.lastError = null;
    this.notify();

    const remaining: QueueItem[] = [];

    for (const item of queue) {
      try {
        const res = await mutateSheet(item.sheet, item.action, item.payload);
        if (!res.success) {
          throw new Error(res.error || '寫入失敗');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.lastError = msg;
        if (item.retries < 3) {
          remaining.push({ ...item, retries: item.retries + 1 });
        }
      }
    }

    this.isSyncing = false;
    this.saveQueue(remaining);

    if (remaining.length === 0) {
      this.lastSyncedAt = new Date().toISOString();
      localStorage.setItem('travel_last_synced_time', this.lastSyncedAt);
    }

    this.notify();
  }

  /** 訂閱同步狀態 */
  public subscribe(callback: (status: SyncStatusState) => void) {
    this.listeners.add(callback);
    callback(this.getStatus());
    return () => {
      this.listeners.delete(callback);
    };
  }

  public getStatus(): SyncStatusState {
    const queue = this.getQueue();
    return {
      isConfigured: isGasConfigured(),
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isSyncing: this.isSyncing,
      lastSyncedAt: this.lastSyncedAt,
      pendingQueueCount: queue.length,
      lastError: this.lastError,
    };
  }

  private notify() {
    const status = this.getStatus();
    this.listeners.forEach((fn) => fn(status));
  }
}

export const syncManager = new SyncManager();
