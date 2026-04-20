'use client';

import { Moon, Sun } from 'lucide-react';
import { useUiPreferences } from '@/components/providers/UiPreferencesProvider';
import { resolveLocaleMessages } from '@/lib/i18n/messages';

export function ThemeToggle() {
  const { locale, setTheme, theme } = useUiPreferences();
  const messages = resolveLocaleMessages(locale).shell;

  return (
    <div className="ac-theme-switcher border-[var(--border-strong)] bg-[var(--page-surface-muted)] shadow-[var(--shadow-soft)]">
      <button
        type="button"
        onClick={() => setTheme('dark')}
        aria-pressed={theme === 'dark'}
        aria-label={`${messages.themeLabel}: ${messages.themeDark}`}
        className="ac-theme-switcher__option"
      >
        <Moon className="h-4 w-4" />
        <span>{messages.themeDark}</span>
      </button>
      <button
        type="button"
        onClick={() => setTheme('light')}
        aria-pressed={theme === 'light'}
        aria-label={`${messages.themeLabel}: ${messages.themeLight}`}
        className="ac-theme-switcher__option"
      >
        <Sun className="h-4 w-4" />
        <span>{messages.themeLight}</span>
      </button>
    </div>
  );
}
