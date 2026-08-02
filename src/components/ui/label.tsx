import { forwardRef, LabelHTMLAttributes } from 'react';

type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className = '', ...props }, ref) => (
    <label
      ref={ref}
      className={`
        text-sm font-medium text-[var(--text-primary)]
        ${className}
      `.trim()}
      {...props}
    />
  )
);

Label.displayName = 'Label';

export { Label };
