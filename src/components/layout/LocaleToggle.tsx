'use client';

import { useUiPreferences } from '@/components/providers/UiPreferencesProvider';
import { resolveLocaleMessages } from '@/lib/i18n/messages';

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
      {locale === 'es' ? messages.localeSpanish : messages.localeEnglish}
    </button>
  );
}
