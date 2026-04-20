import { forwardRef, HTMLAttributes } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement>;
type CardHeaderProps = HTMLAttributes<HTMLDivElement>;
type CardContentProps = HTMLAttributes<HTMLDivElement>;
type CardTitleProps = HTMLAttributes<HTMLHeadingElement>;
type CardDescriptionProps = HTMLAttributes<HTMLParagraphElement>;
type CardFooterProps = HTMLAttributes<HTMLDivElement>;

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`
        ac-card
        ${className}
      `.trim()}
      {...props}
    />
  )
);
Card.displayName = 'Card';

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`
        ac-card__header p-6
        ${className}
      `.trim()}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`
        ac-card__body p-6 pt-0
        ${className}
      `.trim()}
      {...props}
    />
  )
);
CardContent.displayName = 'CardContent';

const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className = '', ...props }, ref) => (
    <h2
      ref={ref}
      className={`
        ac-card__title text-lg
        ${className}
      `.trim()}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className = '', ...props }, ref) => (
    <p
      ref={ref}
      className={`
        text-sm text-[var(--text-secondary)]
        ${className}
      `.trim()}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`
        ac-card__footer items-center p-6 pt-0
        ${className}
      `.trim()}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter };
