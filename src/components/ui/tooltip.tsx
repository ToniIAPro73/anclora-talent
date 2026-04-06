import { forwardRef, HTMLAttributes, ReactNode, useState, useContext, createContext, useMemo } from 'react';

interface TooltipContextType {
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
}

const TooltipContext = createContext<TooltipContextType>({});

interface TooltipProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

interface TooltipTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

interface TooltipContentProps extends HTMLAttributes<HTMLDivElement> {
  side?: 'top' | 'right' | 'bottom' | 'left';
}

const Tooltip = ({ children, ...props }: TooltipProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const contextValue = useMemo(
    () => ({ isOpen, setIsOpen }),
    [isOpen]
  );

  return (
    <TooltipContext.Provider value={contextValue}>
      <div {...props}>
        {children}
      </div>
    </TooltipContext.Provider>
  );
};
Tooltip.displayName = 'Tooltip';

const TooltipTrigger = forwardRef<HTMLButtonElement, TooltipTriggerProps>(
  ({ className = '', children, asChild = false, ...props }, ref: any) => {
    const { setIsOpen } = useContext(TooltipContext);

    const handlers = {
      onMouseEnter: () => setIsOpen?.(true),
      onMouseLeave: () => setIsOpen?.(false),
      onFocus: () => setIsOpen?.(true),
      onBlur: () => setIsOpen?.(false),
    };

    if (asChild && children) {
      return (
        <div ref={ref} {...handlers} className="relative inline-flex">
          {children}
        </div>
      );
    }

    return (
      <button
        ref={ref}
        type="button"
        className={`
          relative inline-flex items-center justify-center
          ${className}
        `.trim()}
        {...handlers}
        {...props}
      >
        {children}
      </button>
    );
  }
);
TooltipTrigger.displayName = 'TooltipTrigger';

const TooltipContent = forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ className = '', children, side = 'top', ...props }, ref) => {
    const { isOpen } = useContext(TooltipContext);

    if (!isOpen) return null;

    const sideClass = {
      top: 'bottom-full mb-2',
      right: 'left-full ml-2',
      bottom: 'top-full mt-2',
      left: 'right-full mr-2',
    }[side];

    return (
      <div
        ref={ref}
        className={`
          absolute ${sideClass} z-50
          px-2 py-1 text-xs font-medium text-white
          bg-slate-900 rounded whitespace-nowrap
          pointer-events-none
          ${className}
        `.trim()}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TooltipContent.displayName = 'TooltipContent';

export { Tooltip, TooltipTrigger, TooltipContent };
