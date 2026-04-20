import { forwardRef } from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = forwardRef<HTMLInputElement, InputProps>(({ className = '', ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={`
        field-input
        placeholder-[var(--text-tertiary)]
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `.trim()}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export { Input };
