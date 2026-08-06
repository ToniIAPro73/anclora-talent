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
  role?: string;
  onClick?: () => void;
  'aria-current'?: React.AriaAttributes['aria-current'];
  'aria-label'?: string;
  'data-testid'?: string;
}

export function NavigatingLink({
  href,
  className,
  children,
  pendingLabel,
  title,
  role,
  onClick,
  'aria-current': ariaCurrent,
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
    onClick?.();
    router.push(href);
  }, [href, onClick, pathname, router]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isNavigating}
      role={role}
      title={title}
      aria-current={ariaCurrent}
      aria-label={ariaLabel}
      data-testid={dataTestId}
      className={className}
      data-navigation-state={isNavigating ? 'loading' : 'idle'}
      data-pending-label={isNavigating && typeof pendingLabel === 'string' ? pendingLabel : undefined}
      aria-busy={isNavigating}
    >
      <span className="relative inline-flex items-center justify-center">
        <span className={isNavigating ? 'opacity-0' : undefined}>{children}</span>
        {isNavigating ? (
          <span className="absolute inset-0 inline-flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
          </span>
        ) : null}
      </span>
    </button>
  );
}
