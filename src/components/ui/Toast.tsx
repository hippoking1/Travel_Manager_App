import React, { useEffect } from 'react';
import { create } from 'zustand';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'error';
  action?: ToastAction;
  duration?: number;
}

interface ToastStore {
  toasts: ToastItem[];
  add: (toast: Omit<ToastItem, 'id'>) => string;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (t) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newItem: ToastItem = { ...t, id };
    set((state) => ({ toasts: [...state.toasts.slice(-4), newItem] }));
    return id;
  },
  remove: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export function toast(message: string, options?: Omit<ToastItem, 'id' | 'message'>) {
  return useToastStore.getState().add({ message, ...options });
}

toast.success = (message: string, options?: Omit<ToastItem, 'id' | 'message' | 'type'>) => {
  return useToastStore.getState().add({ message, type: 'success', ...options });
};

toast.info = (message: string, options?: Omit<ToastItem, 'id' | 'message' | 'type'>) => {
  return useToastStore.getState().add({ message, type: 'info', ...options });
};

toast.error = (message: string, options?: Omit<ToastItem, 'id' | 'message' | 'type'>) => {
  return useToastStore.getState().add({ message, type: 'error', ...options });
};

export const ToastContainer: React.FC = () => {
  const { toasts, remove } = useToastStore();

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 lg:bottom-6 right-4 left-4 sm:left-auto sm:w-96 z-50 flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((t) => (
        <ToastItemCard key={t.id} item={t} onDismiss={() => remove(t.id)} />
      ))}
    </div>
  );
};

const ToastItemCard: React.FC<{ item: ToastItem; onDismiss: () => void }> = ({
  item,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, item.duration || 4000);
    return () => clearTimeout(timer);
  }, [item, onDismiss]);

  const icons = {
    info: <Info className="w-4 h-4 text-teal-600 dark:text-teal-400" />,
    success: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
    error: <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />,
  };

  return (
    <div className="pointer-events-auto bg-stone-900 text-stone-100 dark:bg-stone-800 dark:text-stone-100 border border-stone-800 dark:border-stone-700/80 rounded-2xl p-3.5 shadow-xl flex items-center justify-between gap-3 text-xs sm:text-sm animate-in slide-in-from-bottom-2 fade-in-0 duration-150">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="shrink-0">{icons[item.type || 'info']}</span>
        <span className="font-medium truncate">{item.message}</span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {item.action && (
          <button
            type="button"
            onClick={() => {
              item.action?.onClick();
              onDismiss();
            }}
            className="px-2.5 py-1 bg-stone-800 dark:bg-stone-700 hover:bg-stone-700 dark:hover:bg-stone-600 text-teal-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            {item.action.label}
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="text-stone-400 hover:text-stone-200 p-0.5 rounded cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
