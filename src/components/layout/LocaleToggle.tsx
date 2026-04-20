'use client';

import { Languages } from 'lucide-react';
import { useUiPreferences } from '@/components/providers/UiPreferencesProvider';
import { resolveLocaleMessages } from '@/lib/i18n/messages';

export function LocaleToggle() {
  const { locale, setLocale } = useUiPreferences();
  const messages = resolveLocaleMessages(locale).shell;

  return (
    <div className="ac-language-switcher border-[var(--border-strong)] bg-[var(--page-surface-muted)] shadow-[var(--shadow-soft)]">
      <span className="inline-flex min-h-10 items-center px-3 text-[var(--text-secondary)]">
        <Languages className="h-4 w-4" />
      </span>
      <button
        type="button"
        onClick={() => setLocale('es')}
        aria-current={locale === 'es'}
        aria-label={`${messages.localeLabel}: ${messages.localeSpanish}`}
        className="ac-language-switcher__option"
      >
        {messages.localeSpanish}
      </button>
      <button
        type="button"
        onClick={() => setLocale('en')}
        aria-current={locale === 'en'}
        aria-label={`${messages.localeLabel}: ${messages.localeEnglish}`}
        className="ac-language-switcher__option"
      >
        {messages.localeEnglish}
      </button>
    </div>
  );
}
