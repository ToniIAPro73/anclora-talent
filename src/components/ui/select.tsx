import { forwardRef, HTMLAttributes, ReactNode, useState, useContext, createContext, useMemo, useRef, useEffect } from 'react';

interface SelectContextType {
  value?: string;
  onValueChange?: (value: string) => void;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
}

const SelectContext = createContext<SelectContextType>({});

interface SelectProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
}

interface SelectTriggerProps extends HTMLAttributes<HTMLDivElement> {}

interface SelectContentProps extends HTMLAttributes<HTMLDivElement> {}

interface SelectItemProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
}

interface SelectValueProps extends HTMLAttributes<HTMLSpanElement> {
  placeholder?: string;
}

const Select = ({ value, onValueChange, children, ...props }: SelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const contextValue = useMemo(
    () => ({ value, onValueChange, isOpen, setIsOpen }),
    [value, onValueChange, isOpen]
  );

  return (
    <SelectContext.Provider value={contextValue}>
      <div {...props}>
        {children}
      </div>
    </SelectContext.Provider>
  );
};
Select.displayName = 'Select';

const SelectTrigger = forwardRef<HTMLDivElement, SelectTriggerProps>(
  ({ className = '', children, ...props }, ref) => {
    const { isOpen, setIsOpen } = useContext(SelectContext);

    return (
      <div
        ref={ref}
        onClick={() => setIsOpen?.(!isOpen)}
        className={`
          relative w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg
          bg-[var(--surface-soft)] text-[var(--text-primary)]
          focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent
          flex items-center justify-between text-left cursor-pointer
          ${className}
        `.trim()}
        {...props}
      >
        {children}
      </div>
    );
  }
);
SelectTrigger.displayName = 'SelectTrigger';

const SelectContent = forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className = '', children, ...props }, ref) => {
    const { isOpen } = useContext(SelectContext);

    if (!isOpen) return null;

    return (
      <div
        ref={ref}
        className={`
          absolute top-full left-0 right-0 mt-1 z-50
          bg-[var(--surface-soft)] border border-[var(--border-subtle)] rounded-lg
          max-h-48 overflow-y-auto
          ${className}
        `.trim()}
        {...props}
      >
        {children}
      </div>
    );
  }
);
SelectContent.displayName = 'SelectContent';

const SelectItem = forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className = '', value, children, ...props }, ref) => {
    const { onValueChange, setIsOpen } = useContext(SelectContext);

    return (
      <div
        ref={ref}
        onClick={() => {
          onValueChange?.(value);
          setIsOpen?.(false);
        }}
        className={`
          px-3 py-2 cursor-pointer hover:bg-[var(--surface-strong)]
          text-[var(--text-primary)]
          ${className}
        `.trim()}
        {...props}
      >
        {children}
      </div>
    );
  }
);
SelectItem.displayName = 'SelectItem';

const SelectValue = forwardRef<HTMLSpanElement, SelectValueProps>(
  ({ className = '', placeholder, children, ...props }, ref) => {
    const { value } = useContext(SelectContext);
    const displayValue = value || placeholder || children;

    return (
      <span
        ref={ref}
        className={`
          text-[var(--text-primary)] flex-1 text-left
          ${className}
        `.trim()}
        {...props}
      >
        {displayValue}
      </span>
    );
  }
);
SelectValue.displayName = 'SelectValue';

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue };
