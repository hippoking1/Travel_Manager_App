import React, { useState } from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { 
  GripHorizontal, 
  Plus, 
  Zap, 
  MoreVertical, 
  Edit2, 
  Trash2
} from 'lucide-react';
import type { DayItinerary } from '../../../types';
import { useTripStore } from '../../../stores/tripStore';
import { useConfig, useBases } from '../../../stores/selectors';
import { formatDayDate } from '../../../utils/dates';
import { findConflicts } from '../../../lib/itinerary';
import { Popover } from '../../ui/Popover';
import { Modal } from '../../ui/Modal';
import { Input } from '../../ui/Field';
import { Button } from '../../ui/Button';
import { toast } from '../../ui/Toast';
import { ActivityCard } from './ActivityCard';
import { ActivityEditor } from './ActivityEditor';
import { DayBacklogTray } from './DayBacklogTray';
import { QuickAddBaseModal } from '../../shared/QuickAddBaseModal';
import { DeleteDayModal } from './DeleteDayModal';

export interface DayColumnProps {
  day: DayItinerary;
  dayIndex: number;
  disabled?: boolean;
}

export const DayColumn: React.FC<DayColumnProps> = ({
  day,
  dayIndex,
  disabled = false,
}) => {
  const config = useConfig();
  const bases = useBases();
  const { updateDay, deleteDay, reflowDay } = useTripStore();

  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [showEditDayModal, setShowEditDayModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editTitle, setEditTitle] = useState(day.title);
  const [editSubtitle, setEditSubtitle] = useState(day.subtitle);
  const [editBaseId, setEditBaseId] = useState(day.baseId);
  const [showQuickAddBase, setShowQuickAddBase] = useState(false);

  const containerId = day.id || String(day.day);
  const base = bases.find((b) => b.id === day.baseId);
  const formattedDate = formatDayDate(config.startDate, day.day);

  // Column 整欄可拖拉重排天數順序
  const {
    attributes,
    listeners,
    setNodeRef: setColumnRef,
    transform,
    transition,
    isDragging: isColumnDragging,
  } = useSortable({
    id: containerId,
    data: {
      type: 'day-column',
      dayIndex,
      day,
      containerId,
    },
    disabled,
  });

  // Droppable 容器供活動拖進此天
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `droppable-day-${containerId}`,
    data: {
      type: 'day',
      containerId,
    },
  });

  const columnStyle: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const blockIds = day.timeBlocks.map((b) => b.id || 'unknown');
  const conflictIds = findConflicts(day.timeBlocks);

  const handleDeleteDay = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDeleteDay = (options: { moveToBacklog: boolean }) => {
    deleteDay(containerId, options);
    setShowDeleteModal(false);
    if (options.moveToBacklog) {
      toast.success(
        `已將 Day ${day.day} 的 ${day.timeBlocks.length} 個活動移入景點池，並刪除該日。`
      );
    } else {
      toast.success(`已刪除 Day ${day.day} 及其排程活動。`);
    }
  };

  const handleSaveDayInfo = (e: React.FormEvent) => {
    e.preventDefault();
    updateDay(containerId, {
      title: editTitle.trim(),
      subtitle: editSubtitle.trim(),
      baseId: editBaseId,
    });
    setShowEditDayModal(false);
  };

  return (
    <>
      <div
        ref={setColumnRef}
        data-day-id={containerId}
        style={columnStyle}
        className={`w-72 sm:w-80 shrink-0 flex flex-col max-h-[calc(100vh-13rem)] bg-stone-100/90 dark:bg-stone-900/60 border rounded-3xl overflow-hidden transition-all duration-150 ${
          isColumnDragging
            ? 'opacity-40 border-dashed border-teal-500 ring-2 ring-teal-500/20 shadow-xl'
            : isOver
            ? 'border-teal-500 ring-2 ring-teal-500/20 bg-teal-50/20 dark:bg-teal-950/20'
            : 'border-stone-200/80 dark:border-stone-800/80 shadow-xs'
        }`}
      >
        {/* 欄位頂部：把手、天數標籤、基地與選單 */}
        <div className="p-3.5 border-b border-stone-200/80 dark:border-stone-800 bg-white/70 dark:bg-stone-900/80 backdrop-blur-xs select-none">
          <div className="flex items-center justify-between mb-1.5">
            {/* 拖拉整天順序之頂部把手 */}
            <div
              {...attributes}
              {...listeners}
              className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 px-1 py-0.5 rounded touch-none"
              title="按住此處可左右拖拉重排整天日程"
            >
              <GripHorizontal className="w-4 h-4" />
              <span className="font-mono text-xs font-bold text-stone-900 dark:text-stone-100">
                DAY {String(day.day).padStart(2, '0')}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {base && (
                <span
                  style={{
                    backgroundColor: `${base.color}15`,
                    color: base.color,
                    borderColor: `${base.color}35`,
                  }}
                  className="px-2 py-0.5 rounded-full text-[11px] font-semibold border"
                >
                  {base.nameZh}
                </span>
              )}

              {/* 欄位操作選單 */}
              <Popover
                align="right"
                trigger={({ isOpen, toggle }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    aria-expanded={isOpen}
                    aria-label="日程選項"
                    className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                )}
              >
                {({ close }) => (
                  <div className="w-44 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xl py-1 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        close();
                        reflowDay(containerId);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 text-left"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>⚡ 自動重排時程</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        close();
                        setEditTitle(day.title);
                        setEditSubtitle(day.subtitle);
                        setEditBaseId(day.baseId);
                        setShowEditDayModal(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 text-left"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>編輯標題與基地</span>
                    </button>

                    <div className="border-t border-stone-100 dark:border-stone-800 my-1" />

                    <button
                      type="button"
                      onClick={() => {
                        close();
                        handleDeleteDay();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-left font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>刪除整天日程</span>
                    </button>
                  </div>
                )}
              </Popover>
            </div>
          </div>

          <div className="flex items-baseline justify-between gap-1">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
              {day.title}
            </h3>
            <span className="text-[11px] font-mono text-stone-400 shrink-0">
              {formattedDate}
            </span>
          </div>

          {day.subtitle && (
            <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
              {day.subtitle}
            </p>
          )}
        </div>

        {/* 活動列表 Droppable 區域 */}
        <div
          ref={setDroppableRef}
          className="flex-1 overflow-y-auto p-2.5 space-y-2.5 min-h-[140px] scrollbar-none"
        >
          <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
            {day.timeBlocks.map((block) => (
              <ActivityCard
                key={block.id || block.title}
                block={block}
                containerId={containerId}
                hasConflict={conflictIds.has(block.id || '')}
                disabled={disabled}
              />
            ))}
          </SortableContext>

          {day.timeBlocks.length === 0 && (
            <div className="h-32 border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-2xl flex flex-col items-center justify-center text-stone-400 text-xs p-3 text-center">
              <span>暫無活動</span>
              <span className="text-[10px] mt-0.5 opacity-70">可自景點池拖拉至此</span>
            </div>
          )}
        </div>

        {/* 每日下方：待排景點池快選與拖拉托盤 */}
        <DayBacklogTray day={day} mode="board" disabled={disabled} />

        {/* 欄位底部按鈕 */}
        <div className="p-2.5 border-t border-stone-200/80 dark:border-stone-800 bg-white/70 dark:bg-stone-900/80 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => reflowDay(containerId)}
            icon={<Zap className="w-3.5 h-3.5 text-amber-500" />}
            title="一鍵依照活動順序緊湊重新排程"
            className="text-[11px] text-stone-500"
          >
            自動排時程
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddActivityModal(true)}
            icon={<Plus className="w-3.5 h-3.5" />}
            className="text-xs ml-auto"
          >
            新增活動
          </Button>
        </div>
      </div>

      {/* 新增活動 Modal */}
      {showAddActivityModal && (
        <ActivityEditor
          isOpen={showAddActivityModal}
          onClose={() => setShowAddActivityModal(false)}
          dayIdOrNumber={containerId}
        />
      )}

      {/* 編輯當天標題與基地 Modal */}
      {showEditDayModal && (
        <Modal
          isOpen={showEditDayModal}
          onClose={() => setShowEditDayModal(false)}
          title={`編輯 Day ${day.day} 資訊`}
        >
          <form onSubmit={handleSaveDayInfo} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-stone-600 dark:text-stone-300">
                  所屬景點區域
                </label>
                <button
                  type="button"
                  onClick={() => setShowQuickAddBase(true)}
                  className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>新增區域</span>
                </button>
              </div>
              <select
                value={editBaseId}
                onChange={(e) => setEditBaseId(e.target.value)}
                className="w-full bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-900 dark:text-stone-100"
              >
                {bases.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nameZh} ({b.name})
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="當天主要標題"
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />

            <Input
              label="副標題 / 重點路線"
              value={editSubtitle}
              onChange={(e) => setEditSubtitle(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setShowEditDayModal(false)}>
                取消
              </Button>
              <Button type="submit" variant="primary">
                儲存資訊
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {showQuickAddBase && (
        <QuickAddBaseModal
          isOpen={showQuickAddBase}
          onClose={() => setShowQuickAddBase(false)}
          onCreated={(newId) => setEditBaseId(newId)}
        />
      )}

      {showDeleteModal && (
        <DeleteDayModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          day={day}
          onConfirm={handleConfirmDeleteDay}
        />
      )}
    </>
  );
};
