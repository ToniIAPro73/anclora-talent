import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { UiPreferencesProvider } from '@/components/providers/UiPreferencesProvider';
import { GlobalLanguageControl } from './GlobalLanguageControl';
import { GlobalThemeControl } from './GlobalThemeControl';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe('global header controls', () => {
  test('locale toggle exposes one active value and flips to the other locale', () => {
    render(
      <UiPreferencesProvider initialPreferences={{ locale: 'es', theme: 'dark' }}>
        <GlobalLanguageControl />
      </UiPreferencesProvider>,
    );

    const toggle = screen.getByTestId('global-language-control');
    expect(toggle).toHaveTextContent('ES');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveTextContent('EN');
  });

  test('theme toggle exposes one circular flip control', () => {
    render(
      <UiPreferencesProvider initialPreferences={{ locale: 'es', theme: 'dark' }}>
        <GlobalThemeControl />
      </UiPreferencesProvider>,
    );

    const toggle = screen.getByTestId('global-theme-control');
    expect(toggle.querySelector('svg')).toBeTruthy();
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });
});
