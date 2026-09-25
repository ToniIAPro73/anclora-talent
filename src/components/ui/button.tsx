import { forwardRef, ReactNode } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'default', size = 'md', className = '', isLoading = false, disabled, ...props }, ref) => {
    const baseStyles = 'ac-button';

    const variantStyles: Record<string, string> = {
      default: 'ac-button--primary',
      primary: 'ac-button--primary',
      secondary: 'ac-button--secondary',
      outline: 'ac-button--outline',
      ghost: 'ac-button--ghost',
      destructive: 'ac-button--destructive',
    };

    const sizeStyles = {
      sm: 'ac-button--sm',
      md: '',
      lg: 'ac-button--lg',
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
