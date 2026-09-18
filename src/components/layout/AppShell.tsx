'use client';

import { useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Image from 'next/image';
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

  const compactDashboard = pathname === '/dashboard';
  const compactNewProject = pathname === '/projects/new';
  const focusedWorkspace = compactDashboard || compactNewProject;
  const navLinks = [
    {
      href: '/dashboard',
      label: messages.navDashboard,
      active: pathname === '/dashboard' && searchParams.get('projects') !== '1',
    },
    {
      href: compactDashboard ? '/projects/new' : '/dashboard?focus=new-project',
      label: messages.navNewProject,
      active: false,
    },
  ];

  return (
      <div className={`talent-app-shell-frame min-h-screen bg-[var(--app-gradient)] text-[var(--text-primary)]${compactDashboard ? ' talent-dashboard-shell' : ''}${compactNewProject ? ' talent-new-project-shell' : ''}`}>
      <div className="talent-shell-grid">
        <div className="talent-shell-main min-w-0">
          <header className="talent-shell-topbar">
            <div className="talent-shell-brand">
              {focusedWorkspace ? <Image src="/brand/anclora-talent.webp" alt="" width={34} height={34} priority className="object-contain" /> : <BrandLogo size={42} />}
              <div className="talent-shell-brand__name">{messages.brand}</div>
            </div>

            <div className="talent-shell-brand__copy">
              <p>{compactDashboard ? messages.navDashboard : compactNewProject ? messages.navNewProject : messages.topbarTitle}</p>
              {!focusedWorkspace && <span>{messages.topbarSubtitle}</span>}
            </div>

            {!focusedWorkspace && (
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
            )}

            <div className="talent-shell-topbar-actions">
              {compactDashboard && <NavigatingLink href="/projects/new" pendingLabel={messages.navNewProject} className="dashboard-button dashboard-button--primary dashboard-header-create">{messages.navNewProject}</NavigatingLink>}
              {compactNewProject && <><NavigatingLink href="/dashboard" pendingLabel={messages.navDashboard} className="dashboard-button dashboard-button--primary new-project-dashboard">{messages.navDashboard}</NavigatingLink><NavigatingLink href="/dashboard" pendingLabel={messages.navCancel} className="dashboard-button dashboard-button--primary new-project-cancel">{messages.navCancel}</NavigatingLink></>}
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

            {mobileMenuOpen && !focusedWorkspace ? (
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

          <main id="main-content" className="talent-shell-content">{children}</main>
        </div>
      </div>
    </div>
  );
}
