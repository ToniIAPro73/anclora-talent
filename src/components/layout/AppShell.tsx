'use client';

import { useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { useUiPreferences } from '@/components/providers/UiPreferencesProvider';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import type { SessionUser } from '@/lib/auth/session';
import { NavigatingLink } from '@/components/ui/NavigatingLink';
import { LocaleToggle } from './LocaleToggle';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

export function AppShell({
  user,
  children,
}: {
  user: Pick<SessionUser, 'fullName' | 'email'>;
  children: React.ReactNode;
}) {
  const { locale } = useUiPreferences();
  const messages = resolveLocaleMessages(locale).shell;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    {
      href: '/dashboard',
      label: messages.navDashboard,
      active: pathname === '/dashboard' && searchParams.get('projects') !== '1',
    },
    {
      href: '/dashboard?focus=new-project',
      label: messages.navNewProject,
      active: false,
    },
    {
      href: '/dashboard?projects=1',
      label: messages.navProjects,
      active: searchParams.get('projects') === '1',
    },
  ];

  return (
    <div className="talent-app-shell-frame min-h-screen bg-[var(--app-gradient)] text-[var(--text-primary)]">
      <div className="talent-shell-grid">
        <div className="talent-shell-main min-w-0">
          <header className="talent-shell-topbar">
            <div className="talent-shell-brand">
              <BrandLogo size={42} />
              <div className="talent-shell-brand__name">{messages.brand}</div>
            </div>

            <div className="talent-shell-brand__copy">
              <p>{messages.topbarTitle}</p>
              <span>{messages.topbarSubtitle}</span>
            </div>

            <nav className="talent-shell-nav" aria-label={messages.navLabel}>
              {navLinks.map((link) => (
                <NavigatingLink
                  key={link.href}
                  href={link.href}
                  pendingLabel={link.label}
                  aria-current={link.active ? 'page' : undefined}
                  className="talent-shell-nav__link"
                >
                  {link.label}
                </NavigatingLink>
              ))}
            </nav>

            <div className="talent-shell-topbar-actions">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((open) => !open)}
                aria-expanded={mobileMenuOpen}
                aria-label={messages.mobileMenuLabel}
                className="talent-shell-mobile-menu-button"
              >
                {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
              <LocaleToggle />
              <ThemeToggle />
              <UserMenu user={user} />
            </div>

            {mobileMenuOpen ? (
              <div className="talent-shell-mobile-menu" role="menu" aria-label={messages.navLabel}>
                {navLinks.map((link) => (
                  <NavigatingLink
                    key={link.href}
                    href={link.href}
                    pendingLabel={link.label}
                    role="menuitem"
                    onClick={() => setMobileMenuOpen(false)}
                    className="talent-shell-mobile-menu__link"
                  >
                    {link.label}
                  </NavigatingLink>
                ))}
              </div>
            ) : null}
          </header>

          <div className="talent-shell-content">{children}</div>
        </div>
      </div>
    </div>
  );
}
