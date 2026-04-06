import { forwardRef, SelectHTMLAttributes, HTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}
interface SelectTriggerProps extends HTMLAttributes<HTMLButtonElement> {}
interface SelectContentProps extends HTMLAttributes<HTMLDivElement> {}
interface SelectItemProps extends HTMLAttributes<HTMLOptionElement> {
  value: string;
}
interface SelectValueProps extends HTMLAttributes<HTMLSpanElement> {
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', ...props }, ref) => (
    <select
      ref={ref}
      className={`
        w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg
        bg-[var(--surface-soft)] text-[var(--text-primary)]
        focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `.trim()}
      {...props}
    />
  )
);
Select.displayName = 'Select';

const SelectTrigger = forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className = '', children, ...props }, ref) => (
    <button
      ref={ref}
      className={`
        w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg
        bg-[var(--surface-soft)] text-[var(--text-primary)]
        focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent
        flex items-center justify-between
        ${className}
      `.trim()}
      {...props}
    >
      {children}
    </button>
  )
);
SelectTrigger.displayName = 'SelectTrigger';

const SelectContent = forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`
        bg-[var(--surface-soft)] border border-[var(--border-subtle)] rounded-lg
        ${className}
      `.trim()}
      {...props}
    />
  )
);
SelectContent.displayName = 'SelectContent';

const SelectItem = forwardRef<HTMLOptionElement, SelectItemProps>(
  ({ className = '', ...props }, ref) => (
    <option
      ref={ref}
      className={`
        text-[var(--text-primary)]
        ${className}
      `.trim()}
      {...props}
    />
  )
);
SelectItem.displayName = 'SelectItem';

const SelectValue = forwardRef<HTMLSpanElement, SelectValueProps>(
  ({ className = '', placeholder, ...props }, ref) => (
    <span
      ref={ref}
      className={`
        text-[var(--text-primary)]
        ${className}
      `.trim()}
      {...props}
    >
      {placeholder}
    </span>
  )
);
SelectValue.displayName = 'SelectValue';

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue };
