import React from 'react';
import { Trash2, Inbox, AlertTriangle, Clock, MapPin } from 'lucide-react';
import type { DayItinerary } from '../../../types';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';

export interface DeleteDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  day: DayItinerary;
  onConfirm: (options: { moveToBacklog: boolean }) => void;
}

export const DeleteDayModal: React.FC<DeleteDayModalProps> = ({
  isOpen,
  onClose,
  day,
  onConfirm,
}) => {
  const hasActivities = day.timeBlocks && day.timeBlocks.length > 0;
  const activityCount = day.timeBlocks ? day.timeBlocks.length : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 tracking-tight">
              刪除 Day {day.day} 日程
              {hasActivities && `（包含 ${activityCount} 個活動）`}
            </h3>
          </div>
        </div>
      }
      maxWidth={hasActivities ? 'lg' : 'md'}
    >
      {!hasActivities ? (
        /* 當天無活動時的簡潔確認 */
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-bold text-sm">
                確定要刪除第 {day.day} 天「{day.title}」嗎？
              </p>
              <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
                此天尚無任何活動排程。確認刪除後，後續的日程天數將自動向前遞補重新排序。
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
            <Button variant="ghost" onClick={onClose}>
              取消
            </Button>
            <Button
              variant="primary"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => onConfirm({ moveToBacklog: false })}
              icon={<Trash2 className="w-4 h-4" />}
            >
              確認刪除此天
            </Button>
          </div>
        </div>
      ) : (
        /* 當天排有活動時，分別詢問移入景點池或直接刪除 */
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-bold text-xs text-amber-900 dark:text-amber-200">
                Day {day.day}「{day.title}」目前排定有 {activityCount} 個活動
              </span>
            </div>
            <p className="text-xs text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
              請選擇如何處置這些活動：您可以將活動全數安全保留並移回待排景點池，或連同此天直接永久刪除。
            </p>
          </div>

          {/* 活動清單預覽 */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider block">
              受影響的活動清單 ({activityCount})
            </span>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {day.timeBlocks.map((block) => (
                <div
                  key={block.id}
                  className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/70 dark:border-stone-800 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-stone-800 dark:text-stone-200 truncate">
                      {block.title}
                    </p>
                    <div className="flex items-center gap-2.5 text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                      {(block.startTime || block.periodLabel) && (
                        <span className="flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3 text-stone-400" />
                          <span>{block.periodLabel || `${block.startTime} - ${block.endTime}`}</span>
                        </span>
                      )}
                      {block.locationName && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                          <span className="truncate">{block.locationName}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 兩大處置選項 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => onConfirm({ moveToBacklog: true })}
              className="p-4 rounded-2xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50/70 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-left transition-all group cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-2 mb-1.5 text-amber-900 dark:text-amber-200 font-bold text-sm">
                <div className="w-7 h-7 rounded-lg bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-amber-900 dark:text-amber-100 shrink-0">
                  <Inbox className="w-4 h-4" />
                </div>
                <span>移入景點池並刪除</span>
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300/80 leading-relaxed">
                將本天的 {activityCount} 個活動移回待排景點池保留（保留景點內容、地圖連結，清除預排時間），後續可拖拉安排至其他天。
              </p>
            </button>

            <button
              type="button"
              onClick={() => onConfirm({ moveToBacklog: false })}
              className="p-4 rounded-2xl border-2 border-red-200 dark:border-red-900 bg-red-50/70 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40 text-left transition-all group cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-2 mb-1.5 text-red-700 dark:text-red-300 font-bold text-sm">
                <div className="w-7 h-7 rounded-lg bg-red-200 dark:bg-red-900/80 flex items-center justify-center text-red-700 dark:text-red-200 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <span>直接全部刪除</span>
              </div>
              <p className="text-[11px] text-red-600/90 dark:text-red-400/80 leading-relaxed">
                連同本天的所有 {activityCount} 個活動直接永久刪除，不保留至景點池。其後天數自動向前遞補重新編號。
              </p>
            </button>
          </div>

          <div className="flex justify-end pt-2 border-t border-stone-100 dark:border-stone-800">
            <Button variant="ghost" onClick={onClose}>
              取消
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
