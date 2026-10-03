import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`text-center py-12 px-4 bg-stone-50/70 dark:bg-stone-900/30 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 ${className}`}
    >
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400 dark:text-stone-500 mx-auto mb-3">
          {icon}
        </div>
      )}
      <h3 className="text-sm sm:text-base font-bold text-stone-800 dark:text-stone-200 mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-sm mx-auto mb-4 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="flex justify-center">{action}</div>}
    </div>
  );
};
