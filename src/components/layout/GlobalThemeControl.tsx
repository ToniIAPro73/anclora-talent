'use client';

import { Moon, Sun } from 'lucide-react';
import { useUiPreferences } from '@/components/providers/UiPreferencesProvider';
import { resolveLocaleMessages } from '@/lib/i18n/messages';

export function GlobalThemeControl({
  className = '',
  'data-testid': testId = 'global-theme-control',
}: {
  className?: string;
  'data-testid'?: string;
} = {}) {
  const { locale, setTheme, theme } = useUiPreferences();
  const messages = resolveLocaleMessages(locale).shell;
  const isDark = theme === 'dark';
  const Icon = isDark ? Moon : Sun;
  const currentTheme = isDark ? messages.themeDark : messages.themeLight;

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={`${messages.themeLabel}: ${currentTheme}`}
      aria-pressed={!isDark}
      data-testid={testId}
      className={`global-header-control global-theme-control${className ? ` ${className}` : ''}`}
    >
      <Icon className="global-theme-control__icon" aria-hidden="true" />
    </button>
  );
}
