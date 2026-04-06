import { forwardRef, TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', ...props }, ref) => (
    <textarea
      ref={ref}
      className={`
        w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg
        bg-[var(--surface-soft)] text-[var(--text-primary)]
        placeholder-[var(--text-tertiary)]
        focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent
        disabled:opacity-50 disabled:cursor-not-allowed
        resize-none
        ${className}
      `.trim()}
      {...props}
    />
  )
);

Textarea.displayName = 'Textarea';

export { Textarea };
