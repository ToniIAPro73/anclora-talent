'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { ChevronLeft, ChevronRight, FolderOpen, LayoutDashboard, PenSquare } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { useUiPreferences } from '@/components/providers/UiPreferencesProvider';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { LocaleToggle } from './LocaleToggle';
import { ThemeToggle } from './ThemeToggle';

const SIDEBAR_KEY = 'anclora-sidebar-collapsed';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { locale } = useUiPreferences();
  const messages = resolveLocaleMessages(locale).shell;
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(SIDEBAR_KEY) === 'true');
    setMounted(true);
  }, []);

  const toggle = () =>
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_KEY, String(next));
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

  const sidebarCols = mounted && collapsed ? '72px 1fr' : '280px 1fr';

  return (
    <div className="min-h-screen bg-[var(--app-gradient)] text-[var(--text-primary)]">
      <div
        className="mx-auto grid min-h-screen max-w-7xl gap-5 px-4 py-4 transition-[grid-template-columns] duration-300"
        style={{ gridTemplateColumns: sidebarCols }}
      >
        <aside className="flex flex-col overflow-hidden rounded-[36px] border border-[var(--border-subtle)] bg-[var(--shell-surface)] shadow-[var(--shadow-strong)] backdrop-blur">
          <div className={`flex ${collapsed ? 'justify-center px-3 py-4' : 'justify-end px-6 pt-4'}`}>
            <button
              onClick={toggle}
              aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-tertiary)] shadow-[var(--shadow-soft)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
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
            <div className="mx-6 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5 text-[var(--text-primary)] shadow-[var(--shadow-soft)]">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">{messages.contractEyebrow}</p>
              <p className="mt-3 text-lg font-bold">{messages.contractTitle}</p>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{messages.contractDescription}</p>
            </div>
          )}

          <nav className={`mt-8 space-y-2 text-sm font-semibold ${collapsed ? 'px-3' : 'px-6'}`}>
            {navLinks.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={`flex items-center rounded-2xl border border-transparent py-3 text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--page-surface-muted)] hover:text-[var(--text-primary)] ${
                  collapsed ? 'justify-center px-2' : 'gap-3 px-4'
                } ${
                  isActive(href) ? 'border-[var(--border-strong)] bg-[var(--page-surface-muted)] text-[var(--text-primary)]' : ''
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && label}
              </Link>
            ))}
          </nav>

          {!collapsed && (
            <div className="mx-6 mt-10 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">{messages.stackEyebrow}</p>
              <p className="mt-3 text-lg font-bold text-[var(--text-primary)]">{messages.stackTitle}</p>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{messages.stackDescription}</p>
            </div>
          )}
        </aside>

        <div className="rounded-[40px] border border-[var(--border-subtle)] bg-[var(--shell-main-surface)] p-6 shadow-[var(--shadow-strong)] backdrop-blur xl:p-8">
          <header className="flex flex-col gap-4 border-b border-[var(--border-subtle)] pb-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">{messages.topbarEyebrow}</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--text-primary)]">{messages.topbarTitle}</h1>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <LocaleToggle />
              <ThemeToggle />
              <div className="rounded-full border border-[var(--border-strong)] bg-[var(--surface-soft)] px-2 py-1 shadow-[var(--shadow-soft)]">
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
