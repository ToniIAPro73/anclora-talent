'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut } from 'lucide-react';
import { useUiPreferences } from '@/components/providers/UiPreferencesProvider';
import { resolveLocaleMessages } from '@/lib/i18n/messages';

export type UserMenuUser = {
  fullName: string;
  email: string;
};

export function UserMenu({ user }: { user: UserMenuUser }) {
  const router = useRouter();
  const { locale } = useUiPreferences();
  const messages = resolveLocaleMessages(locale).shell;

  const [open, setOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  const initial = (user.fullName.trim().charAt(0) || user.email.charAt(0) || '?').toUpperCase();

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.replace('/sign-in');
      router.refresh();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={messages.userMenuLabel}
        className="flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--surface-soft)] px-2 py-1 shadow-[var(--shadow-soft)]"
      >
        <span
          aria-hidden="true"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-highlight)] text-xs font-bold text-[var(--text-primary)]"
        >
          {initial}
        </span>
        <span className="hidden max-w-[140px] truncate text-sm font-semibold text-[var(--text-primary)] sm:inline">
          {user.fullName}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-[var(--text-tertiary)]" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={messages.userMenuLabel}
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-3 shadow-[var(--shadow-lg)] backdrop-blur-xl"
        >
          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{user.fullName}</p>
          <p className="truncate text-xs text-[var(--text-tertiary)]">{user.email}</p>
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-[var(--action-secondary-border)] bg-[var(--action-secondary-bg)] text-sm font-semibold text-[var(--action-secondary-fg)] hover:border-[var(--border-strong)] disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {isSigningOut ? messages.signingOut : messages.signOut}
          </button>
        </div>
      )}
    </div>
  );
}
