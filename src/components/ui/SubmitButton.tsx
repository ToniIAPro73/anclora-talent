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
    <button type="submit" disabled={pending} className={className} data-testid={dataTestId}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingText ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
