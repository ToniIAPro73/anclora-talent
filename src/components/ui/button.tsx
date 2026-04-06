import { forwardRef, ReactNode } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'default', size = 'md', className = '', isLoading = false, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

    const variantStyles = {
      default: 'bg-[var(--button-primary-bg)] text-[var(--button-primary-fg)] hover:bg-[var(--button-primary-hover)] border-[var(--button-primary-border)]',
      outline: 'border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--surface-soft)] hover:border-[var(--border-strong)]',
      ghost: 'text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]',
      destructive: 'bg-red-600 text-white hover:bg-red-700',
    };

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} disabled:opacity-50 disabled:cursor-not-allowed ${className}`.trim()}
        {...props}
      >
        {isLoading ? '...' : children}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { Button };
