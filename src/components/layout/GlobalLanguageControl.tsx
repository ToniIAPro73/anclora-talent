'use client';

import { Globe } from 'lucide-react';
import { useUiPreferences } from '@/components/providers/UiPreferencesProvider';
import { resolveLocaleMessages } from '@/lib/i18n/messages';

export function GlobalLanguageControl() {
  const { locale, setLocale } = useUiPreferences();
  const messages = resolveLocaleMessages(locale).shell;
  const nextLocale = locale === 'es' ? 'en' : 'es';
  const currentLanguage = locale === 'es' ? messages.localeSpanish : messages.localeEnglish;

  return (
    <button
      type="button"
      onClick={() => setLocale(nextLocale)}
      aria-label={`${messages.localeLabel}: ${currentLanguage}`}
      aria-pressed={locale === 'en'}
      data-testid="global-language-control"
      className="global-header-control global-language-control"
    >
      <Globe className="global-language-control__icon" aria-hidden="true" />
      <span>{locale.toUpperCase()}</span>
    </button>
  );
}
