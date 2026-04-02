'use client';

import { Languages } from 'lucide-react';
import { useUiPreferences } from '@/components/providers/UiPreferencesProvider';
import { resolveLocaleMessages } from '@/lib/i18n/messages';

export function LocaleToggle() {
  const { locale, setLocale } = useUiPreferences();
  const messages = resolveLocaleMessages(locale).shell;

  return (
    <div className="flex items-center gap-1 rounded-full border border-[var(--border-strong)] bg-[var(--page-surface-muted)] p-1 shadow-[var(--shadow-soft)]">
      <span className="inline-flex min-h-10 items-center px-3 text-[var(--text-secondary)]">
        <Languages className="h-4 w-4" />
      </span>
      <button
        type="button"
        onClick={() => setLocale('es')}
        aria-pressed={locale === 'es'}
        aria-label={`${messages.localeLabel}: ${messages.localeSpanish}`}
        className={`inline-flex min-h-10 items-center rounded-full px-3 text-sm font-semibold transition ${
          locale === 'es'
            ? 'border border-[var(--border-strong)] bg-[var(--surface-highlight)] text-[var(--text-primary)]'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        }`}
      >
        {messages.localeSpanish}
      </button>
      <button
        type="button"
        onClick={() => setLocale('en')}
        aria-pressed={locale === 'en'}
        aria-label={`${messages.localeLabel}: ${messages.localeEnglish}`}
        className={`inline-flex min-h-10 items-center rounded-full px-3 text-sm font-semibold transition ${
          locale === 'en'
            ? 'border border-[var(--border-strong)] bg-[var(--surface-highlight)] text-[var(--text-primary)]'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        }`}
      >
        {messages.localeEnglish}
      </button>
    </div>
  );
}
