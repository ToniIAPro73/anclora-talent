'use client';

import { Moon, Sun } from 'lucide-react';
import { useUiPreferences } from '@/components/providers/UiPreferencesProvider';
import { resolveLocaleMessages } from '@/lib/i18n/messages';

export function ThemeToggle() {
  const { locale, setTheme, theme } = useUiPreferences();
  const messages = resolveLocaleMessages(locale).shell;

  return (
    <div className="flex items-center gap-1 rounded-full border border-[var(--border-strong)] bg-[var(--page-surface-muted)] p-1 shadow-[var(--shadow-soft)]">
      <button
        type="button"
        onClick={() => setTheme('dark')}
        aria-pressed={theme === 'dark'}
        aria-label={`${messages.themeLabel}: ${messages.themeDark}`}
        className={`inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold transition ${
          theme === 'dark'
            ? 'border border-[var(--border-strong)] bg-[var(--surface-highlight)] text-[var(--text-primary)]'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        }`}
      >
        <Moon className="h-4 w-4" />
        <span>{messages.themeDark}</span>
      </button>
      <button
        type="button"
        onClick={() => setTheme('light')}
        aria-pressed={theme === 'light'}
        aria-label={`${messages.themeLabel}: ${messages.themeLight}`}
        className={`inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold transition ${
          theme === 'light'
            ? 'border border-[var(--border-strong)] bg-[var(--surface-highlight)] text-[var(--text-primary)]'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        }`}
      >
        <Sun className="h-4 w-4" />
        <span>{messages.themeLight}</span>
      </button>
    </div>
  );
}
