import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Inbox, Plus, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { useBacklog } from '../../../stores/selectors';
import { Button } from '../../ui/Button';
import { ActivityCard } from './ActivityCard';
import { ActivityEditor } from './ActivityEditor';

export const BacklogPanel: React.FC<{ disabled?: boolean }> = ({ disabled = false }) => {
  const backlog = useBacklog();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: 'backlog',
    data: {
      type: 'backlog',
      containerId: 'backlog',
    },
    disabled,
  });

  const blockIds = backlog.map((b) => b.id || 'unknown');

  if (isCollapsed) {
    return (
      <div className="shrink-0 flex flex-col items-center justify-between p-2 bg-stone-100/90 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800 rounded-3xl w-12 h-[calc(100vh-13rem)] select-none">
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="p-1 rounded-xl text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
          title="展開待排景點池"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center gap-2 [writing-mode:vertical-rl] rotate-180 text-xs font-bold text-stone-500 dark:text-stone-400">
          <span className="flex items-center gap-1">
            <Inbox className="w-3.5 h-3.5" />
            <span>待排景點池</span>
          </span>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-stone-200 dark:bg-stone-800">
            {backlog.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="p-1.5 rounded-xl bg-teal-600 text-white shadow-xs hover:bg-teal-700"
          title="新增待排景點"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div
        className={`w-72 sm:w-80 shrink-0 flex flex-col max-h-[calc(100vh-13rem)] bg-stone-100/90 dark:bg-stone-900/60 border rounded-3xl overflow-hidden transition-all duration-150 ${
          isOver
            ? 'border-teal-500 ring-2 ring-teal-500/20 bg-teal-50/20 dark:bg-teal-950/20'
            : 'border-stone-200/80 dark:border-stone-800/80 shadow-xs'
        }`}
      >
        {/* Header */}
        <div className="p-3.5 border-b border-stone-200/80 dark:border-stone-800 bg-white/70 dark:bg-stone-900/80 backdrop-blur-xs flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 flex items-center justify-center border border-teal-200/60 dark:border-teal-800/60">
              <Inbox className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  待排景點池
                </h3>
                <span className="font-mono text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                  {backlog.length}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                可隨時拖曳放入任一天日程
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="收起待排池"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Droppable Content */}
        <div
          ref={setNodeRef}
          className="flex-1 overflow-y-auto p-2.5 space-y-2.5 min-h-[140px] scrollbar-none"
        >
          <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
            {backlog.map((block) => (
              <ActivityCard
                key={block.id || block.title}
                block={block}
                containerId="backlog"
                disabled={disabled}
              />
            ))}
          </SortableContext>

          {backlog.length === 0 && (
            <div className="h-40 border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-2xl flex flex-col items-center justify-center text-stone-400 text-xs p-4 text-center">
              <Sparkles className="w-5 h-5 text-stone-300 dark:text-stone-600 mb-1" />
              <span className="font-semibold text-stone-500">尚無待排景點</span>
              <span className="text-[10px] mt-0.5 text-stone-400">
                可點下方按鈕新增想去的地點，或將日程中的活動拖回此處暫存
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 border-t border-stone-200/80 dark:border-stone-800 bg-white/70 dark:bg-stone-900/80">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddModal(true)}
            icon={<Plus className="w-3.5 h-3.5" />}
            className="w-full text-xs"
          >
            新增想去的地點靈感
          </Button>
        </div>
      </div>

      {showAddModal && (
        <ActivityEditor
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          isBacklog={true}
        />
      )}
    </>
  );
};
