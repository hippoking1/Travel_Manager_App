import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const isIconOnly = !children && icon;

  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-150 select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]';

  const sizeStyles = {
    sm: isIconOnly ? 'p-1.5 rounded-lg text-xs' : 'px-3 py-1.5 rounded-lg text-xs gap-1.5',
    md: isIconOnly ? 'p-2 rounded-xl text-sm' : 'px-4 py-2 rounded-xl text-sm gap-2',
    lg: isIconOnly ? 'p-2.5 rounded-2xl text-base' : 'px-5 py-2.5 rounded-2xl text-base gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white shadow-sm shadow-teal-900/10 font-semibold dark:bg-teal-500 dark:hover:bg-teal-400 dark:text-stone-950',
    secondary:
      'bg-stone-200/80 hover:bg-stone-200 text-stone-800 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-100',
    outline:
      'bg-transparent border border-stone-300 hover:bg-stone-100/70 text-stone-800 dark:border-stone-700 dark:hover:bg-stone-800/80 dark:text-stone-200',
    ghost:
      'bg-transparent hover:bg-stone-200/50 text-stone-700 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800/70 dark:hover:text-stone-100',
    danger:
      'bg-red-600 hover:bg-red-700 text-white shadow-sm font-semibold dark:bg-red-600 dark:hover:bg-red-500',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
          {children}
          {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
        </>
      )}
    </button>
  );
};
