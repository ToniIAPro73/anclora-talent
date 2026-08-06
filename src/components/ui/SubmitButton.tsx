'use client';

import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';

interface SubmitButtonProps {
  children: React.ReactNode;
  className?: string;
  loadingText?: string;
  'data-testid'?: string;
}

export function SubmitButton({ children, className, loadingText, 'data-testid': dataTestId }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={className}
      data-testid={dataTestId}
      data-loading-text={pending && typeof loadingText === 'string' ? loadingText : undefined}
      aria-busy={pending}
    >
      <span className="relative inline-flex items-center justify-center">
        <span className={pending ? 'opacity-0' : undefined}>{children}</span>
        {pending ? (
          <span className="absolute inset-0 inline-flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
          </span>
        ) : null}
      </span>
    </button>
  );
}
