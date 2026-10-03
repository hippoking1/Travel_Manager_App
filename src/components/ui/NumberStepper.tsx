import React from 'react';
import { Minus, Plus } from 'lucide-react';

export interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  label?: string;
  className?: string;
}

export const NumberStepper: React.FC<NumberStepperProps> = ({
  value,
  onChange,
  min = 1,
  max = 99,
  step = 1,
  unit = '',
  label,
  className = '',
}) => {
  const handleDecrement = () => {
    if (value - step >= min) {
      onChange(value - step);
    }
  };

  const handleIncrement = () => {
    if (value + step <= max) {
      onChange(value + step);
    }
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <span className="block text-xs font-semibold text-stone-600 dark:text-stone-300">
          {label}
        </span>
      )}
      <div className="inline-flex items-center bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/80 rounded-xl p-1">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          aria-label="減少"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-white dark:hover:bg-stone-700 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
        >
          <Minus className="w-4 h-4" />
        </button>

        <div className="px-3 min-w-[3.5rem] text-center font-mono font-bold text-sm text-stone-900 dark:text-stone-100">
          {value} {unit && <span className="text-xs font-normal text-stone-500">{unit}</span>}
        </div>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= max}
          aria-label="增加"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-white dark:hover:bg-stone-700 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
