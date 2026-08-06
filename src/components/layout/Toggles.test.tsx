import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { UiPreferencesProvider } from '@/components/providers/UiPreferencesProvider';
import { LocaleToggle } from './LocaleToggle';
import { ThemeToggle } from './ThemeToggle';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe('shell toggles v3', () => {
  test('locale toggle exposes one active value and flips to the other locale', () => {
    render(
      <UiPreferencesProvider initialPreferences={{ locale: 'es', theme: 'dark' }}>
        <LocaleToggle />
      </UiPreferencesProvider>,
    );

    const toggle = screen.getByTestId('locale-toggle');
    expect(toggle).toHaveTextContent('ES');
    fireEvent.click(toggle);
    expect(toggle).toHaveTextContent('EN');
  });

  test('theme toggle exposes one circular flip control', () => {
    render(
      <UiPreferencesProvider initialPreferences={{ locale: 'es', theme: 'dark' }}>
        <ThemeToggle />
      </UiPreferencesProvider>,
    );

    const toggle = screen.getByTestId('theme-toggle');
    expect(toggle.querySelector('[data-theme-state="dark"]')).toBeTruthy();
    fireEvent.click(toggle);
    expect(toggle.querySelector('[data-theme-state="light"]')).toBeTruthy();
  });
});
