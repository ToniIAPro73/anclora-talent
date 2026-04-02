import {
  LOCALE_COOKIE_NAME,
  THEME_COOKIE_NAME,
  type UiLocale,
  type UiTheme,
} from './preferences';

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

function persistValue(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=${ONE_YEAR_IN_SECONDS}; samesite=lax`;
  window.localStorage.setItem(name, value);
}

export function applyThemePreference(theme: UiTheme) {
  document.documentElement.dataset.theme = theme;
  persistValue(THEME_COOKIE_NAME, theme);
}

export function applyLocalePreference(locale: UiLocale) {
  document.documentElement.lang = locale;
  document.documentElement.dataset.locale = locale;
  persistValue(LOCALE_COOKIE_NAME, locale);
}
