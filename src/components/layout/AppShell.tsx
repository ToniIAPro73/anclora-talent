'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { ChevronLeft, ChevronRight, FolderOpen, LayoutDashboard, PenSquare } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { useUiPreferences } from '@/components/providers/UiPreferencesProvider';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { LocaleToggle } from './LocaleToggle';
import { ThemeToggle } from './ThemeToggle';
import { EditorPreferencesSidebar } from '@/components/projects/EditorPreferencesSidebar';
import { NavigatingLink } from '@/components/ui/NavigatingLink';

const SIDEBAR_KEY = 'anclora-sidebar-collapsed';

export function AppShell({ children }: { children: React.ReactNode }) {
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
    { href: '/projects/new', icon: PenSquare, label: messages.navNewProject },
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
        <aside className="talent-shell-sidebar ac-sidebar-nav">
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
            <BrandLogo
              size={48}
              className="h-12 w-12 flex-shrink-0 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-highlight)] shadow-[var(--shadow-soft)]"
            />
            {!collapsed && (
              <div className="min-w-0 overflow-hidden">
                <p className="truncate text-lg font-black text-[var(--text-primary)]">{messages.brand}</p>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-tertiary)]">{messages.badge}</p>
              </div>
            )}
          </div>

          {!collapsed && (
            <div className="ac-surface-panel ac-surface-panel--strong mx-6 text-[var(--text-primary)]">
              <p className="ac-surface-panel__eyebrow">{messages.contractEyebrow}</p>
              <p className="text-lg font-bold">{messages.contractTitle}</p>
              <p className="text-sm leading-6 text-[var(--text-secondary)]">{messages.contractDescription}</p>
            </div>
          )}

          <nav className={`talent-shell-sidebar-nav ac-sidebar-nav mt-8 text-sm font-semibold ${collapsed ? 'px-3' : 'px-6'}`}>
            <div className="ac-sidebar-nav__group">
              {!collapsed && <p className="ac-sidebar-nav__eyebrow">{messages.topbarEyebrow}</p>}
              <div className="ac-sidebar-nav__list">
                {navLinks.map(({ href, icon: Icon, label }) => (
                  <NavigatingLink
                    key={href}
                    href={href}
                    pendingLabel={label}
                    title={collapsed ? label : undefined}
                    aria-current={isActive(href) ? 'page' : undefined}
                    className={`ac-sidebar-nav__item talent-shell-sidebar-link ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'}`}
                  >
                    <span className="ac-sidebar-nav__item-label talent-shell-sidebar-link__label">
                      <span className="talent-shell-sidebar-link__icon">
                        <Icon className="h-4 w-4 flex-shrink-0" />
                      </span>
                      {!collapsed && <span className="talent-shell-sidebar-link__text">{label}</span>}
                    </span>
                  </NavigatingLink>
                ))}
              </div>
            </div>
          </nav>

          {!collapsed && (
            <div className="ac-surface-panel ac-surface-panel--subtle mx-6 mt-10">
              <p className="ac-surface-panel__eyebrow">{messages.stackEyebrow}</p>
              <p className="text-lg font-bold text-[var(--text-primary)]">{messages.stackTitle}</p>
              <p className="text-sm leading-6 text-[var(--text-secondary)]">{messages.stackDescription}</p>
            </div>
          )}

          {!collapsed && (
            <div className="mx-6 mt-10 flex-1">
              <EditorPreferencesSidebar />
            </div>
          )}
        </aside>

        <div className="talent-shell-main xl:p-8">
          <header className="ac-topbar talent-shell-topbar flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="ac-topbar__titles">
              <p className="ac-topbar__eyebrow">{messages.topbarEyebrow}</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--text-primary)]">{messages.topbarTitle}</h1>
            </div>
            <div className="ac-topbar__actions talent-shell-topbar-actions flex flex-wrap items-center justify-end gap-3">
              <LocaleToggle />
              <ThemeToggle />
              <div className="talent-shell-user-button rounded-full border border-[var(--border-strong)] bg-[var(--surface-soft)] px-2 py-1 shadow-[var(--shadow-soft)]">
                <UserButton />
              </div>
            </div>
          </header>
          <div className="pt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
