export type UiTheme = 'dark' | 'light';
export type UiLocale = 'es' | 'en';

export type UiPreferences = {
  theme: UiTheme;
  locale: UiLocale;
};

export const THEME_COOKIE_NAME = 'anclora-theme';
export const LOCALE_COOKIE_NAME = 'anclora-locale';

export const defaultUiPreferences: UiPreferences = {
  theme: 'dark',
  locale: 'es',
};

export function resolveTheme(value?: string | null): UiTheme {
  return value === 'light' || value === 'dark' ? value : defaultUiPreferences.theme;
}

export function resolveLocale(value?: string | null): UiLocale {
  return value === 'en' || value === 'es' ? value : defaultUiPreferences.locale;
}
