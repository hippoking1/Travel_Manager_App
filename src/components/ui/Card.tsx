import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'outline' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  ...props
}, ref) => {
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4 sm:p-5',
    lg: 'p-5 sm:p-6',
  };

  const variantStyles = {
    default:
      'bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-sm rounded-2xl',
    subtle:
      'bg-stone-50 dark:bg-stone-900/60 border border-stone-200/60 dark:border-stone-800/60 rounded-2xl',
    outline:
      'bg-transparent border border-stone-300 dark:border-stone-800 rounded-2xl',
    interactive:
      'bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 hover:border-teal-600/50 dark:hover:border-teal-500/50 hover:shadow-md transition-all duration-200 rounded-2xl cursor-pointer',
  };

  return (
    <div
      ref={ref}
      className={`${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';
