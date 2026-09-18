'use client';

import { useUiPreferences } from '@/components/providers/UiPreferencesProvider';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { Globe } from 'lucide-react';

export function LocaleToggle() {
  const { locale, setLocale } = useUiPreferences();
  const messages = resolveLocaleMessages(locale).shell;
  const nextLocale = locale === 'es' ? 'en' : 'es';

  return (
    <button
      type="button"
      onClick={() => setLocale(nextLocale)}
      aria-label={`${messages.localeLabel}: ${locale === 'es' ? messages.localeSpanish : messages.localeEnglish}`}
      data-testid="locale-toggle"
      className="talent-shell-locale-pill"
    >
      <Globe className="h-5 w-5" aria-hidden="true" />
      <span>{locale.toUpperCase()}</span>
    </button>
  );
}
