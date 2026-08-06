'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, FolderOpen, LayoutDashboard } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { useUiPreferences } from '@/components/providers/UiPreferencesProvider';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import type { SessionUser } from '@/lib/auth/session';
import { LocaleToggle } from './LocaleToggle';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';
import { NavigatingLink } from '@/components/ui/NavigatingLink';

const SIDEBAR_KEY = 'anclora-sidebar-collapsed';

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
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(SIDEBAR_KEY) === 'true';
  });

  const toggle = () =>
    setCollapsed(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem(SIDEBAR_KEY, String(next));
      }
      return next;
    });

  const navLinks = [
    { href: '/dashboard', icon: LayoutDashboard, label: messages.navDashboard },
    { href: '/projects', icon: FolderOpen, label: messages.navProjects },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href === '/projects') return pathname === '/projects';
    return pathname.startsWith(href);
  };

  const sidebarCols = collapsed ? '88px 1fr' : '320px 1fr';

  return (
    <div className="min-h-screen bg-[var(--app-gradient)] text-[var(--text-primary)]">
      <div
        className="talent-shell-grid"
        style={{ gridTemplateColumns: sidebarCols }}
      >
        <aside className="talent-shell-sidebar ac-sidebar-nav min-w-0 overflow-hidden">
          <div className={`flex ${collapsed ? 'justify-center px-3 py-4' : 'justify-end px-6 pt-4'}`}>
            <button
              onClick={toggle}
              aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
              className="talent-shell-sidebar-toggle"
            >
              {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
            </button>
          </div>

          <div className={`flex items-center ${collapsed ? 'justify-center px-3 pb-4' : 'gap-3 px-6 pb-4'}`}>
            <BrandLogo size={40} />
            {!collapsed && (
              <div className="min-w-0 overflow-hidden">
                <p className="truncate text-lg font-black text-[var(--text-primary)]">{messages.brand}</p>
              </div>
            )}
          </div>

          <nav className={`talent-shell-sidebar-nav ac-sidebar-nav mt-8 text-sm font-semibold ${collapsed ? 'px-3' : 'px-6'}`}>
            <div className="ac-sidebar-nav__group">
              <div className="ac-sidebar-nav__list">
                {navLinks.map(({ href, icon: Icon, label }) => (
                  <NavigatingLink
                    key={href}
                    href={href}
                    pendingLabel={collapsed ? undefined : label}
                    title={collapsed ? label : undefined}
                    aria-label={collapsed ? label : undefined}
                    aria-current={isActive(href) ? 'page' : undefined}
                    className={`ac-sidebar-nav__item talent-shell-sidebar-link ${collapsed ? 'justify-center px-2' : 'justify-start px-0'}`}
                  >
                    {collapsed ? (
                      <span className="talent-shell-sidebar-link__icon">
                        <Icon className="h-4 w-4 flex-shrink-0" />
                      </span>
                    ) : (
                      <span className="ac-sidebar-nav__item-label talent-shell-sidebar-link__label">
                        <span className="talent-shell-sidebar-link__icon">
                          <Icon className="h-4 w-4 flex-shrink-0" />
                        </span>
                        <span className="talent-shell-sidebar-link__text">{label}</span>
                      </span>
                    )}
                  </NavigatingLink>
                ))}
              </div>
            </div>
          </nav>
        </aside>

        <div className="talent-shell-main min-w-0 xl:p-8">
          <header className="ac-topbar talent-shell-topbar flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="ac-topbar__titles">
              <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">{messages.topbarTitle}</h1>
            </div>
            <div className="ac-topbar__actions talent-shell-topbar-actions flex flex-wrap items-center justify-end gap-3">
              <LocaleToggle />
              <ThemeToggle />
              <UserMenu user={user} />
            </div>
          </header>
          <div className="pt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
