'use client';

import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { applyLocalePreference, applyThemePreference } from '@/lib/ui-preferences/preferences.client';
import {
  defaultUiPreferences,
  type UiLocale,
  type UiPreferences,
  type UiTheme,
} from '@/lib/ui-preferences/preferences';

type UiPreferencesContextValue = UiPreferences & {
  setTheme: (theme: UiTheme) => void;
  setLocale: (locale: UiLocale) => void;
};

const UiPreferencesContext = createContext<UiPreferencesContextValue | null>(null);

export function UiPreferencesProvider({
  children,
  initialPreferences,
}: {
  children: React.ReactNode;
  initialPreferences: UiPreferences;
}) {
  const router = useRouter();
  const [theme, setThemeState] = useState<UiTheme>(initialPreferences.theme);
  const [locale, setLocaleState] = useState<UiLocale>(initialPreferences.locale);

  useEffect(() => {
    applyThemePreference(theme);
  }, [theme]);

  useEffect(() => {
    applyLocalePreference(locale);
  }, [locale]);

  const value = useMemo<UiPreferencesContextValue>(
    () => ({
      theme,
      locale,
      setTheme: (nextTheme) => {
        setThemeState(nextTheme);
      },
      setLocale: (nextLocale) => {
        setLocaleState(nextLocale);
        startTransition(() => {
          router.refresh();
        });
      },
    }),
    [locale, router, theme],
  );

  return <UiPreferencesContext.Provider value={value}>{children}</UiPreferencesContext.Provider>;
}

export function useUiPreferences() {
  const context = useContext(UiPreferencesContext);

  if (!context) {
    return {
      ...defaultUiPreferences,
      setTheme: () => {},
      setLocale: () => {},
    };
  }

  return context;
}
