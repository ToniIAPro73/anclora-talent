import { forwardRef, SelectHTMLAttributes, HTMLAttributes, ReactNode, useState } from 'react';

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  children?: ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
}

interface SelectTriggerProps extends HTMLAttributes<HTMLButtonElement> {}

interface SelectContentProps extends HTMLAttributes<HTMLDivElement> {}

interface SelectItemProps extends HTMLAttributes<HTMLOptionElement> {
  value: string;
}

interface SelectValueProps extends HTMLAttributes<HTMLSpanElement> {
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', value, onValueChange, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        value={value || ''}
        onChange={(e) => onValueChange?.(e.target.value)}
        className={`
          w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg
          bg-[var(--surface-soft)] text-[var(--text-primary)]
          focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `.trim()}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = 'Select';

const SelectTrigger = forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className = '', children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={`
        w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg
        bg-[var(--surface-soft)] text-[var(--text-primary)]
        focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent
        flex items-center justify-between text-left
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
        mt-1 max-h-48 overflow-y-auto
        ${className}
      `.trim()}
      {...props}
    />
  )
);
SelectContent.displayName = 'SelectContent';

const SelectItem = forwardRef<HTMLOptionElement, SelectItemProps>(
  ({ className = '', value, children, ...props }, ref) => (
    <option
      ref={ref}
      value={value}
      className={`
        text-[var(--text-primary)] bg-[var(--surface-soft)]
        ${className}
      `.trim()}
      {...props}
    >
      {children}
    </option>
  )
);
SelectItem.displayName = 'SelectItem';

const SelectValue = forwardRef<HTMLSpanElement, SelectValueProps>(
  ({ className = '', placeholder, children, ...props }, ref) => (
    <span
      ref={ref}
      className={`
        text-[var(--text-primary)] flex-1 text-left
        ${className}
      `.trim()}
      {...props}
    >
      {children || placeholder}
    </span>
  )
);
SelectValue.displayName = 'SelectValue';

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue };
