import React from 'react';
import { create } from 'zustand';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, Info } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmState {
  isOpen: boolean;
  options: ConfirmOptions;
  resolve: ((value: boolean) => void) | null;
  ask: (options: ConfirmOptions) => Promise<boolean>;
  close: (result: boolean) => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  isOpen: false,
  options: { title: '' },
  resolve: null,
  ask: (options) => {
    return new Promise<boolean>((resolve) => {
      set({ isOpen: true, options, resolve });
    });
  },
  close: (result) => {
    const { resolve } = get();
    if (resolve) resolve(result);
    set({ isOpen: false, resolve: null });
  },
}));

export function useConfirm() {
  const ask = useConfirmStore((s) => s.ask);
  return ask;
}

export const ConfirmDialog: React.FC = () => {
  const { isOpen, options, close } = useConfirmStore();

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => close(false)}
      maxWidth="sm"
      showCloseButton={false}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-2xl shrink-0 ${
              options.danger
                ? 'bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400'
                : 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400'
            }`}
          >
            {options.danger ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <Info className="w-5 h-5" />
            )}
          </div>
          <div>
            <h4 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {options.title}
            </h4>
            {options.message && (
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                {options.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => close(false)}
          >
            {options.cancelLabel || '取消'}
          </Button>
          <Button
            variant={options.danger ? 'danger' : 'primary'}
            size="sm"
            onClick={() => close(true)}
          >
            {options.confirmLabel || (options.danger ? '確認刪除' : '確定')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
