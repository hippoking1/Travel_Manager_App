import React from 'react';

export interface SegmentOption<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className = '',
}: SegmentedControlProps<T>) {
  const sizeStyles = {
    sm: 'p-0.5 text-xs',
    md: 'p-1 text-xs sm:text-sm',
  };

  const itemSizeStyles = {
    sm: 'px-2.5 py-1 rounded-lg gap-1.5',
    md: 'px-3 py-1.5 rounded-xl gap-2',
  };

  return (
    <div
      role="tablist"
      className={`inline-flex items-center bg-stone-200/70 dark:bg-stone-800/80 rounded-2xl border border-stone-200 dark:border-stone-800 ${sizeStyles[size]} ${className}`}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={isSelected}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer select-none ${
              itemSizeStyles[size]
            } ${
              isSelected
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs font-semibold'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
