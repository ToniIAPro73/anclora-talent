'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

interface NavigatingLinkProps {
  href: string;
  className?: string;
  children: React.ReactNode;
  pendingLabel?: string;
  title?: string;
  'aria-label'?: string;
  'data-testid'?: string;
}

export function NavigatingLink({
  href,
  className,
  children,
  pendingLabel,
  title,
  'aria-label': ariaLabel,
  'data-testid': dataTestId,
}: NavigatingLinkProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = React.useState(false);

  React.useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  const handleClick = React.useCallback(() => {
    if (pathname === href) {
      return;
    }

    setIsNavigating(true);
    router.push(href);
  }, [href, pathname, router]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isNavigating}
      title={title}
      aria-label={ariaLabel}
      data-testid={dataTestId}
      className={className}
      data-navigation-state={isNavigating ? 'loading' : 'idle'}
    >
      {isNavigating ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{pendingLabel ?? children}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
