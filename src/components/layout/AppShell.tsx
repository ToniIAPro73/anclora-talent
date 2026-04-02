'use client';

import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { FolderOpen, LayoutDashboard, PenSquare } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { useUiPreferences } from '@/components/providers/UiPreferencesProvider';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { LocaleToggle } from './LocaleToggle';
import { ThemeToggle } from './ThemeToggle';

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale } = useUiPreferences();
  const messages = resolveLocaleMessages(locale).shell;

  return (
    <div className="min-h-screen bg-[var(--app-gradient)] text-[var(--text-primary)]">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-5 px-4 py-4 lg:grid-cols-[280px_1fr]">
        <aside className="overflow-hidden rounded-[36px] border border-[var(--border-subtle)] bg-[var(--shell-surface)] p-6 shadow-[var(--shadow-strong)] backdrop-blur">
          <div className="flex items-center gap-3">
            <BrandLogo
              size={48}
              className="h-12 w-12 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-highlight)] shadow-[var(--shadow-soft)]"
            />
            <div>
              <p className="text-lg font-black text-[var(--text-primary)]">{messages.brand}</p>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-tertiary)]">{messages.badge}</p>
            </div>
          </div>

          <div className="mt-8 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5 text-[var(--text-primary)] shadow-[var(--shadow-soft)]">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">{messages.contractEyebrow}</p>
            <p className="mt-3 text-lg font-bold">{messages.contractTitle}</p>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              {messages.contractDescription}
            </p>
          </div>

          <nav className="mt-8 space-y-2 text-sm font-semibold">
            <Link href="/dashboard" className="flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--page-surface-muted)] hover:text-[var(--text-primary)]">
              <LayoutDashboard className="h-4 w-4" />
              {messages.navDashboard}
            </Link>
            <Link href="/projects/new" className="flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--page-surface-muted)] hover:text-[var(--text-primary)]">
              <PenSquare className="h-4 w-4" />
              {messages.navNewProject}
            </Link>
            <Link href="/dashboard" className="flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--page-surface-muted)] hover:text-[var(--text-primary)]">
              <FolderOpen className="h-4 w-4" />
              {messages.navProjects}
            </Link>
          </nav>

          <div className="mt-10 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">{messages.stackEyebrow}</p>
            <p className="mt-3 text-lg font-bold text-[var(--text-primary)]">{messages.stackTitle}</p>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              {messages.stackDescription}
            </p>
          </div>
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
