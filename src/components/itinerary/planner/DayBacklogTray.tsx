import React, { useState, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  Inbox,
  Plus,
  GripVertical,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { DayItinerary, TimeBlock } from '../../../types';
import { SCENIC_SUB_TAGS, PERSONA_CONFIG } from '../../../types';
import { useTripStore } from '../../../stores/tripStore';
import { useBases, useBacklog } from '../../../stores/selectors';
import { inferLocationCategory } from '../../../lib/geo/extractLocations';
import { toast } from '../../ui/Toast';
import { ActivityEditor } from './ActivityEditor';

interface DraggableBacklogCardProps {
  block: TimeBlock;
  targetDayId: string;
  targetDayNumber: number;
  disabled?: boolean;
}

const DraggableBacklogCard: React.FC<DraggableBacklogCardProps> = ({
  block,
  targetDayId,
  targetDayNumber,
  disabled = false,
}) => {
  const { moveBlock, undo } = useTripStore();
  const bases = useBases();
  const base = bases.find((b) => b.id === block.baseId);
  const category = inferLocationCategory(block);
  const subTagConfig = SCENIC_SUB_TAGS.find((st) => st.category === category);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: block.id || `backlog_${block.title}`,
    data: {
      type: 'block',
      block,
      containerId: 'backlog',
    },
    disabled,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!block.id) return;
    const currentItinerary = useTripStore.getState().itinerary;
    const targetDay = currentItinerary.find(
      (d) => (d.id || String(d.day)) === targetDayId || d.day === targetDayNumber
    );
    const targetIndex = targetDay ? targetDay.timeBlocks.length : 0;

    moveBlock(block.id, targetDayId, targetIndex);
    toast(`已將「${block.title}」排入 Day ${targetDayNumber}`, {
      action: {
        label: '復原',
        onClick: undo,
      },
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative bg-white dark:bg-stone-900 border rounded-2xl p-2.5 shadow-2xs hover:shadow-md transition-all select-none ${
        isDragging
          ? 'opacity-30 border-dashed border-amber-500 scale-95 z-50'
          : 'border-stone-200/90 dark:border-stone-800 hover:border-amber-400 dark:hover:border-amber-600'
      }`}
    >
      <div className="flex items-start justify-between gap-1.5">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-stone-300 hover:text-stone-600 dark:hover:text-stone-200 mt-0.5 p-0.5 rounded touch-none shrink-0"
          title="拖拉此景點方塊至上方日程排程"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h5
              className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate max-w-[170px]"
              title={block.title}
            >
              {block.title}
            </h5>
            {base && (
              <span
                style={{
                  backgroundColor: `${base.color}15`,
                  color: base.color,
                  borderColor: `${base.color}35`,
                }}
                className="px-1.5 py-0.2 rounded-md text-[10px] font-semibold border shrink-0"
              >
                {base.nameZh}
              </span>
            )}
            {subTagConfig && (
              <span className="px-1.5 py-0.2 rounded-md text-[10px] font-semibold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200/60 dark:border-stone-700 shrink-0">
                {subTagConfig.emoji} {subTagConfig.label}
              </span>
            )}
          </div>

          {block.description && (
            <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-1 mt-0.5">
              {block.description}
            </p>
          )}

          {/* 角色標籤 */}
          {block.tags && block.tags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap mt-1">
              {block.tags.map((tag) => {
                const p = PERSONA_CONFIG[tag];
                if (!p) return null;
                return (
                  <span
                    key={tag}
                    className="text-[9px] px-1 py-0.2 rounded bg-stone-50 dark:bg-stone-800/80 text-stone-500 border border-stone-200/50 dark:border-stone-800"
                  >
                    {p.emoji} {p.label}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* 一鍵排入當天按鈕 */}
        <button
          type="button"
          onClick={handleQuickAdd}
          className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200/80 dark:border-amber-800/60 transition-colors shrink-0 cursor-pointer shadow-2xs"
          title={`一鍵排入 Day ${targetDayNumber}`}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export interface DayBacklogTrayProps {
  day: DayItinerary;
  mode?: 'board' | 'timeline';
  disabled?: boolean;
}

export const DayBacklogTray: React.FC<DayBacklogTrayProps> = ({
  day,
  mode = 'board',
  disabled = false,
}) => {
  const bases = useBases();
  const backlog = useBacklog();
  const [isExpanded, setIsExpanded] = useState(true);
  const [filterMode, setFilterMode] = useState<'base' | 'all'>('base');
  const [showAddModal, setShowAddModal] = useState(false);

  const containerId = day.id || String(day.day);
  const currentBase = bases.find((b) => b.id === day.baseId);

  // 本區待排景點
  const baseBacklog = useMemo(() => {
    if (!day.baseId) return [];
    return backlog.filter((b) => b.baseId === day.baseId);
  }, [backlog, day.baseId]);

  // 決定目前顯示之清單 (預設優先篩選所屬景點區域之景點)
  const displayItems = useMemo(() => {
    if (filterMode === 'base' && day.baseId) {
      return baseBacklog;
    }
    return backlog;
  }, [filterMode, day.baseId, baseBacklog, backlog]);

  if (backlog.length === 0 && !showAddModal) {
    return null;
  }

  const isTimeline = mode === 'timeline';

  return (
    <>
      <div
        className={`border rounded-2xl transition-all ${
          isTimeline
            ? 'p-4 bg-white dark:bg-stone-900 border-amber-200/80 dark:border-amber-900/50 shadow-xs'
            : 'mx-2 mb-2 p-2.5 bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/70 dark:border-amber-900/40'
        }`}
      >
        {/* 托盤頂部控制列 */}
        <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-amber-200/50 dark:border-amber-900/30">
          <div className="flex items-center gap-1.5 min-w-0">
            <Inbox className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
              待排景點池
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-bold">
              {displayItems.length}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* 景點區域快速篩選切換標籤 */}
            {currentBase && (
              <div className="flex items-center rounded-lg bg-white/80 dark:bg-stone-800/80 p-0.5 border border-amber-200/60 dark:border-amber-800/40 text-[10px]">
                <button
                  type="button"
                  onClick={() => setFilterMode('base')}
                  className={`px-1.5 py-0.5 rounded-md font-semibold transition-all ${
                    filterMode === 'base'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                  }`}
                  title={`僅顯示屬於【${currentBase.nameZh}】之待排景點`}
                >
                  本區 ({baseBacklog.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`px-1.5 py-0.5 rounded-md font-semibold transition-all ${
                    filterMode === 'all'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                  }`}
                  title="顯示所有待排景點"
                >
                  全部 ({backlog.length})
                </button>
              </div>
            )}

            {/* 新增景點至待排池按鈕 */}
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="p-1 rounded-lg text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
              title="新增景點至待排池（自動綁定當天景點區域）"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            {/* 收合/展開按鈕 */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* 展開之景點方塊清單 */}
        {isExpanded && (
          <div className="pt-2">
            {displayItems.length > 0 ? (
              <div
                className={`space-y-2 overflow-y-auto scrollbar-none ${
                  isTimeline
                    ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 space-y-0 max-h-72'
                    : 'max-h-52'
                }`}
              >
                {displayItems.map((block) => (
                  <DraggableBacklogCard
                    key={block.id || block.title}
                    block={block}
                    targetDayId={containerId}
                    targetDayNumber={day.day}
                    disabled={disabled}
                  />
                ))}
              </div>
            ) : (
              /* 當前區域無待排景點時的友善提示 */
              <div className="py-3 px-2 text-center text-xs text-stone-400 space-y-1.5">
                <p>
                  {filterMode === 'base' && currentBase
                    ? `【${currentBase.nameZh}】區域目前尚無待排景點`
                    : '待排景點池暫無項目'}
                </p>
                <div className="flex items-center justify-center gap-2">
                  {filterMode === 'base' && backlog.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterMode('all')}
                      className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                    >
                      查看全部待排 ({backlog.length})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    <span>新增景點</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 新增景點至待排池 Modal */}
      {showAddModal && (
        <ActivityEditor
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          dayIdOrNumber={containerId}
          isBacklog={true}
        />
      )}
    </>
  );
};
