import { mutateSheet, isGasConfigured } from './sheetApi';
import type { SyncStatusState, DayItinerary } from '../types';

export interface QueueItem {
  id: string;
  tripId?: string;
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
  private itineraryDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.lastSyncedAt = localStorage.getItem('travel_last_synced_time');
    // 監聽瀏覽器網路恢復連線事件
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        if (isGasConfigured()) {
          this.flushQueue();
        }
      });
    }
  }

  /** 取得目前未完成同步佇列 */
  public getQueue(): QueueItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /** 一鍵清空所有待同步排隊佇列 (解決卡在待同步問題) */
  public clearQueue() {
    localStorage.removeItem(STORAGE_KEY);
    this.lastError = null;
    this.notify();
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
    payload: Record<string, unknown>,
    tripId?: string
  ) {
    if (!isGasConfigured()) {
      return;
    }

    const queue = this.getQueue();
    queue.push({
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sync_${Date.now()}_${Math.random()}`,
      tripId,
      timestamp: new Date().toISOString(),
      sheet,
      action,
      payload,
      retries: 0,
    });
    this.saveQueue(queue);

    // 觸發同步
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      this.flushQueue();
    }
  }

  /** 清空與批次送出佇列 */
  public async flushQueue() {
    if (this.isSyncing) return;
    const queue = this.getQueue();
    if (queue.length === 0) return;

    if (!isGasConfigured()) {
      this.clearQueue();
      return;
    }

    this.isSyncing = true;
    this.lastError = null;
    this.notify();

    const remaining: QueueItem[] = [];

    for (const item of queue) {
      try {
        const res = await mutateSheet(item.sheet, item.action, item.payload, item.tripId);
        if (!res.success) {
          throw new Error(res.error || 'Google 試算表寫入失敗');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.lastError = msg;
        // 限制最多重試 2 次，避免無效請求持續堆積
        if (item.retries < 2) {
          remaining.push({ ...item, retries: item.retries + 1 });
        }
      }
    }

    this.isSyncing = false;
    this.saveQueue(remaining);

    if (remaining.length === 0) {
      this.lastSyncedAt = new Date().toISOString();
      this.lastError = null;
      localStorage.setItem('travel_last_synced_time', this.lastSyncedAt);
    }

    this.notify();
  }

  /** 防抖同步日程 Itinerary 到 Google Sheets */
  public debouncedSyncItinerary(tripId: string, day: DayItinerary) {
    if (!isGasConfigured()) return;

    if (this.itineraryDebounceTimer) {
      clearTimeout(this.itineraryDebounceTimer);
    }

    this.itineraryDebounceTimer = setTimeout(() => {
      this.enqueue(
        'Itinerary',
        'UPDATE',
        {
          id: day.id || `day_${day.day}`,
          dayId: day.id || `day_${day.day}`,
          updates: {
            dayId: day.id || `day_${day.day}`,
            day: day.day,
            baseId: day.baseId,
            title: day.title,
            subtitle: day.subtitle,
            highlights: (day.highlights || []).join('; '),
            timeBlocksJson: JSON.stringify(day.timeBlocks || []),
            foodNotesJson: JSON.stringify(day.foodNotes || []),
          },
        },
        tripId
      );
    }, 1500);
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
