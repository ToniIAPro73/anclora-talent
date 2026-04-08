export type UiTheme = 'dark' | 'light';
export type UiLocale = 'es' | 'en';

export interface EditorPreferences {
  fontFamily?: string; // 'Default' or Google Font name
  fontSize?: string; // '12px', '16px', '20px', '24px', '32px'
  device?: 'mobile' | 'tablet' | 'desktop'; // Preferred viewport
  margins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export type UiPreferences = {
  theme: UiTheme;
  locale: UiLocale;
};

export const THEME_COOKIE_NAME = 'anclora-theme';
export const LOCALE_COOKIE_NAME = 'anclora-locale';
export const EDITOR_PREFERENCES_STORAGE_KEY = 'anclora-editor-preferences';

export const defaultUiPreferences: UiPreferences = {
  theme: 'dark',
  locale: 'es',
};

export const defaultEditorPreferences: EditorPreferences = {
  fontFamily: 'Default',
  fontSize: '16px',
  device: 'desktop',
  margins: {
    top: 24,
    bottom: 24,
    left: 24,
    right: 24,
  },
};

export function resolveTheme(value?: string | null): UiTheme {
  return value === 'light' || value === 'dark' ? value : defaultUiPreferences.theme;
}

export function resolveLocale(value?: string | null): UiLocale {
  return value === 'en' || value === 'es' ? value : defaultUiPreferences.locale;
}
