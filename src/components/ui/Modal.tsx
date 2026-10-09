import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
  showCloseButton = true,
  closeOnBackdropClick = false,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
        document.body.style.overflow = 'hidden';
      }
    } else {
      if (dialog.open) {
        dialog.close();
        document.body.style.overflow = '';
      }
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const triggerShakeFeedback = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 320);
  };

  const handleCancel = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (closeOnBackdropClick) {
      onClose();
    } else {
      triggerShakeFeedback();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // 點擊事件必須發生在 dialog 元素本身 (::backdrop 區域)
    if (e.target !== dialog) return;

    const rect = dialog.getBoundingClientRect();
    const isInDialog =
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width;

    if (!isInDialog) {
      if (closeOnBackdropClick) {
        onClose();
      } else {
        // 點擊卡片外部區域時不關閉，並觸發輕微抖動視覺反饋，避免未儲存的輸入遺失
        triggerShakeFeedback();
      }
    }
  };

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-4xl',
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      className={`fixed inset-0 m-auto p-0 bg-transparent backdrop:bg-stone-950/60 backdrop:backdrop-blur-xs w-[calc(100%-2rem)] ${maxWidthClasses[maxWidth]} rounded-3xl outline-none shadow-2xl transition-all open:animate-in open:fade-in-0 open:zoom-in-95 z-50`}
    >
      <div
        className={`bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl overflow-hidden flex flex-col max-h-[88vh] transition-all duration-150 ${
          isShaking ? 'animate-modal-shake ring-2 ring-teal-500/60 shadow-2xl' : ''
        }`}
      >
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-stone-100 dark:border-stone-800/80 shrink-0">
            <div>
              {title && (
                <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 tracking-tight">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors ml-3 -mr-1"
                aria-label="關閉對話框"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </dialog>
  );
};
