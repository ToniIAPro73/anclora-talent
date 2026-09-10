'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
  target?: React.HTMLAttributeAnchorTarget;
  rel?: string;
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
  target,
  rel,
}: NavigatingLinkProps) {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = React.useState(false);

  React.useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  const handleClick = React.useCallback((event: React.MouseEvent<HTMLAnchorElement>) => {
    // Preserve native link behavior for modified clicks, middle clicks and
    // explicit new-tab targets. These must never be converted into a router
    // button interaction.
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      target === '_blank' ||
      pathname === href
    ) {
      return;
    }

    setIsNavigating(true);
    onClick?.();
  }, [href, onClick, pathname, target]);

  return (
    <Link
      href={href}
      onClick={handleClick}
      role={role}
      title={title}
      target={target}
      rel={rel}
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
    </Link>
  );
}
