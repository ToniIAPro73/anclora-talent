'use client';

import { Moon, Sun } from 'lucide-react';
import { useUiPreferences } from '@/components/providers/UiPreferencesProvider';
import { resolveLocaleMessages } from '@/lib/i18n/messages';

export function ThemeToggle() {
  const { locale, setTheme, theme } = useUiPreferences();
  const messages = resolveLocaleMessages(locale).shell;
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      aria-label={`${messages.themeLabel}: ${theme === 'dark' ? messages.themeDark : messages.themeLight}`}
      aria-pressed={theme === 'light'}
      data-testid="theme-toggle"
      className="talent-shell-theme-flip"
    >
      <span className="talent-shell-theme-flip__cube" data-theme-state={theme}>
        <span className="talent-shell-theme-flip__face talent-shell-theme-flip__face--front">
          <Moon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="talent-shell-theme-flip__face talent-shell-theme-flip__face--back">
          <Sun className="h-4 w-4" aria-hidden="true" />
        </span>
      </span>
    </button>
  );
}
