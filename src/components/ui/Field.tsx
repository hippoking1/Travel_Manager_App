import React from 'react';

interface BaseFieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
}

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    BaseFieldProps {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, required, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? `input_${label}` : undefined);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-stone-600 dark:text-stone-300">
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full bg-white dark:bg-stone-900 border ${
            error ? 'border-red-500 focus:ring-red-500' : 'border-stone-300 dark:border-stone-700 focus:ring-teal-600 dark:focus:ring-teal-400'
          } rounded-xl px-3 py-2 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        {hint && !error && <p className="text-[11px] text-stone-500 dark:text-stone-400">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement>,
    BaseFieldProps {
  options?: { value: string | number; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, required, options, children, className = '', id, ...props }, ref) => {
    const selectId = id || (label ? `select_${label}` : undefined);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold text-stone-600 dark:text-stone-300">
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`w-full bg-white dark:bg-stone-900 border ${
              error ? 'border-red-500' : 'border-stone-300 dark:border-stone-700'
            } rounded-xl px-3 py-2 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-teal-600 dark:focus:ring-teal-400 focus:border-transparent transition-all appearance-none cursor-pointer pr-8 ${className}`}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-stone-500 dark:text-stone-400">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        {hint && !error && <p className="text-[11px] text-stone-500 dark:text-stone-400">{hint}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    BaseFieldProps {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, required, className = '', id, ...props }, ref) => {
    const textareaId = id || (label ? `textarea_${label}` : undefined);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={textareaId} className="block text-xs font-semibold text-stone-600 dark:text-stone-300">
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`w-full bg-white dark:bg-stone-900 border ${
            error ? 'border-red-500 focus:ring-red-500' : 'border-stone-300 dark:border-stone-700 focus:ring-teal-600 dark:focus:ring-teal-400'
          } rounded-xl px-3 py-2 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        {hint && !error && <p className="text-[11px] text-stone-500 dark:text-stone-400">{hint}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export interface TimeInputProps extends Omit<InputProps, 'type'> {}

export const TimeInput: React.FC<TimeInputProps> = (props) => {
  return (
    <Input
      type="time"
      className="font-mono text-center"
      {...props}
    />
  );
};
