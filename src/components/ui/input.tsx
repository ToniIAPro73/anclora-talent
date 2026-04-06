import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(({ className = '', ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={`
        w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg
        bg-[var(--surface-soft)] text-[var(--text-primary)]
        placeholder-[var(--text-tertiary)]
        focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `.trim()}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export { Input };
