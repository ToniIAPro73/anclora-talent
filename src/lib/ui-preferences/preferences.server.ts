import { cookies } from 'next/headers';
import {
  LOCALE_COOKIE_NAME,
  THEME_COOKIE_NAME,
  resolveLocale,
  resolveTheme,
  type UiPreferences,
} from './preferences';

type CookieStoreLike = {
  get: (name: string) => { value?: string } | undefined;
};

export async function readUiPreferences(store?: CookieStoreLike): Promise<UiPreferences> {
  const cookieStore = store ?? (await cookies());

  return {
    theme: resolveTheme(cookieStore.get(THEME_COOKIE_NAME)?.value),
    locale: resolveLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value),
  };
}
