import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  GripVertical, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  AlertTriangle, 
  Train, 
  Mountain, 
  Ship, 
  Bus, 
  Footprints, 
  MapPin, 
  Compass, 
  Copy, 
  ArrowRightCircle, 
  Inbox,
  ExternalLink
} from 'lucide-react';
import type { TimeBlock, TransportDetail, ContainerId } from '../../../types';
import { SCENIC_SUB_TAGS } from '../../../types';
import { useTripStore } from '../../../stores/tripStore';
import { useItinerary } from '../../../stores/selectors';
import { useConfirm } from '../../ui/ConfirmDialog';
import { PersonaBadge } from '../../shared/PersonaBadge';
import { Popover } from '../../ui/Popover';
import { formatTimeSpan } from '../../../lib/itinerary';
import { ActivityEditor } from './ActivityEditor';

export interface ActivityCardProps {
  block: TimeBlock;
  containerId: ContainerId;
  hasConflict?: boolean;
  isOverlay?: boolean;
  disabled?: boolean;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
  block,
  containerId,
  hasConflict = false,
  isOverlay = false,
  disabled = false,
}) => {
  const { deleteTimeBlockById, addTimeBlock, moveBlock } = useTripStore();
  const itinerary = useItinerary();
  const confirm = useConfirm();

  const [showEditModal, setShowEditModal] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: block.id || 'temp',
    data: {
      type: 'block',
      block,
      containerId,
    },
    disabled: disabled || isOverlay,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getTransportIcon = (type?: TransportDetail['type']) => {
    switch (type) {
      case 'train':
      case 'cogwheel':
        return <Train className="w-3 h-3 text-sky-600 dark:text-sky-400" />;
      case 'cable-car':
      case 'funicular':
        return <Mountain className="w-3 h-3 text-amber-600 dark:text-amber-400" />;
      case 'boat':
        return <Ship className="w-3 h-3 text-blue-600 dark:text-blue-400" />;
      case 'bus':
        return <Bus className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />;
      case 'walk':
      default:
        return <Footprints className="w-3 h-3 text-stone-500" />;
    }
  };

  const handleDelete = async () => {
    if (!block.id) return;
    const ok = await confirm({
      title: `確定要刪除「${block.title}」嗎？`,
      message: '此活動將自日程中移除。',
      danger: true,
      confirmLabel: '刪除活動',
    });
    if (ok) {
      deleteTimeBlockById(block.id);
    }
  };

  const handleDuplicate = () => {
    const copy: Omit<TimeBlock, 'id'> = {
      ...block,
      title: `${block.title} (副本)`,
    };
    if (containerId === 'backlog') {
      useTripStore.getState().addBacklogItem(copy);
    } else {
      addTimeBlock(containerId, copy);
    }
  };

  const timeText = formatTimeSpan(block.startTime, block.endTime, block.periodLabel);

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`group relative bg-white dark:bg-stone-900 border rounded-2xl p-3.5 transition-all select-none ${
          isOverlay
            ? 'shadow-2xl border-teal-500 ring-2 ring-teal-500/40 rotate-1 cursor-grabbing z-50'
            : isDragging
            ? 'opacity-30 border-dashed border-teal-400 bg-teal-50/20'
            : hasConflict
            ? 'border-amber-400 dark:border-amber-600/80 shadow-xs'
            : 'border-stone-200/80 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 hover:shadow-xs'
        }`}
      >
        {/* 卡片頂部：時間標記 / 衝突提示 / 拖曳把手 & 選單 */}
        <div className="flex items-center justify-between gap-1.5 mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            {timeText ? (
              <span className="font-mono text-xs font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 px-2 py-0.5 rounded-lg border border-teal-200/50 dark:border-teal-800/40">
                {timeText}
              </span>
            ) : (
              <span className="text-[11px] font-medium text-stone-400 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-lg">
                待排景點
              </span>
            )}

            {hasConflict && (
              <span
                title="與相鄰活動時間發生重疊，請留意時間安排或點擊自動重新排程"
                className="inline-flex items-center gap-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-md border border-amber-300 dark:border-amber-700"
              >
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                <span>時間衝突</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* 卡片動作選單 Popover */}
            {!isOverlay && (
              <Popover
                align="right"
                trigger={({ isOpen, toggle }) => (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle();
                    }}
                    aria-expanded={isOpen}
                    aria-label="活動選項"
                    className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                )}
              >
                {({ close }) => (
                  <div className="w-48 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xl py-1 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        close();
                        setShowEditModal(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 text-left"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>編輯活動細節</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        close();
                        handleDuplicate();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 text-left"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>建立活動副本</span>
                    </button>

                    {containerId !== 'backlog' && (
                      <button
                        type="button"
                        onClick={() => {
                          close();
                          if (block.id) moveBlock(block.id, 'backlog', 0);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 text-left"
                      >
                        <Inbox className="w-3.5 h-3.5 text-teal-600" />
                        <span>移入待排景點池</span>
                      </button>
                    )}

                    {/* 快速移至某天選單 */}
                    <div className="border-t border-stone-100 dark:border-stone-800 my-1 pt-1">
                      <span className="px-3 py-1 text-[10px] font-bold text-stone-400 uppercase block">
                        移到其他日程
                      </span>
                      <div className="max-h-32 overflow-y-auto">
                        {itinerary.map((d) => (
                          <button
                            key={d.id || d.day}
                            type="button"
                            onClick={() => {
                              close();
                              if (block.id) moveBlock(block.id, d.id || String(d.day), d.timeBlocks.length);
                            }}
                            className="w-full flex items-center gap-1.5 px-3 py-1 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 text-left truncate text-[11px]"
                          >
                            <ArrowRightCircle className="w-3 h-3 text-stone-400 shrink-0" />
                            <span className="truncate">Day {d.day} · {d.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-stone-100 dark:border-stone-800 my-1 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          close();
                          handleDelete();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-left font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>刪除活動</span>
                      </button>
                    </div>
                  </div>
                )}
              </Popover>
            )}

            {/* 拖曳把手 Grip Handle */}
            <div
              {...attributes}
              {...listeners}
              className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-grab active:cursor-grabbing touch-none"
              title="拖拉排序活動"
            >
              <GripVertical className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* 標題 */}
        <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-snug mb-1">
          {block.title}
        </h4>

        {/* 說明內文 */}
        {block.description && (
          <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2 leading-relaxed mb-2">
            {block.description}
          </p>
        )}

        {/* 交通簡介條 */}
        {block.transport && (
          <div className="bg-stone-50 dark:bg-stone-800/60 rounded-xl px-2.5 py-1.5 border border-stone-200/50 dark:border-stone-800 flex items-center gap-2 text-[11px] text-stone-700 dark:text-stone-300 mb-2">
            <span className="p-0.5 rounded bg-white dark:bg-stone-700 shadow-2xs">
              {getTransportIcon(block.transport.type)}
            </span>
            <span className="font-semibold">{block.transport.from}</span>
            <span className="text-stone-400">➔</span>
            <span className="font-semibold">{block.transport.to}</span>
            {block.transport.duration && (
              <span className="text-stone-400 ml-auto font-mono">
                {block.transport.duration}
              </span>
            )}
          </div>
        )}

        {/* 地點、海拔、導航與成員標籤 */}
        <div className="flex items-center justify-between gap-1 flex-wrap pt-1">
          <div className="flex items-center gap-1 flex-wrap">
            {block.tags.map((tag) => (
              <PersonaBadge key={tag} tag={tag} size="sm" />
            ))}

            {/* 景觀交通次標籤 (高山名峰、歷史文化、超市購物、親子風景) */}
            {block.subCategories?.map((cat) => {
              const meta = SCENIC_SUB_TAGS.find((m) => m.category === cat);
              if (!meta) return null;
              return (
                <span
                  key={cat}
                  className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
                >
                  {meta.emoji} {meta.label}
                </span>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-stone-400 ml-auto font-mono">
            {block.altitude && (
              <span className="inline-flex items-center gap-0.5">
                <Compass className="w-3 h-3 text-cyan-600" />
                <span>{block.altitude}m</span>
              </span>
            )}
            {block.locationName && (
              <span className="inline-flex items-center gap-0.5 truncate max-w-[120px]">
                <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                <span className="truncate">{block.locationName}</span>
              </span>
            )}
            {block.googleMapsUrl && (
              <a
                href={block.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-0.5 text-teal-600 dark:text-teal-400 hover:underline shrink-0"
                title="開啟 Google 地圖導航"
              >
                <span>導航</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 編輯 Modal */}
      {showEditModal && (
        <ActivityEditor
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          dayIdOrNumber={containerId === 'backlog' ? undefined : containerId}
          isBacklog={containerId === 'backlog'}
          initialBlock={block}
        />
      )}
    </>
  );
};
