import { describe, expect, test } from 'vitest';
import {
  defaultUiPreferences,
  resolveLocale,
  resolveTheme,
} from './preferences';

describe('ui preferences', () => {
  test('uses dark as the default theme', () => {
    expect(defaultUiPreferences.theme).toBe('dark');
    expect(resolveTheme(undefined)).toBe('dark');
  });

  test('uses spanish as the default locale', () => {
    expect(defaultUiPreferences.locale).toBe('es');
    expect(resolveLocale(undefined)).toBe('es');
  });

  test('falls back safely for invalid values', () => {
    expect(resolveTheme('system')).toBe('dark');
    expect(resolveLocale('de')).toBe('es');
  });

  test('accepts the supported values', () => {
    expect(resolveTheme('light')).toBe('light');
    expect(resolveTheme('dark')).toBe('dark');
    expect(resolveLocale('en')).toBe('en');
    expect(resolveLocale('es')).toBe('es');
  });
});
