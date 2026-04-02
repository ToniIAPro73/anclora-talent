import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

import {
  UiPreferencesProvider,
  useUiPreferences,
} from './UiPreferencesProvider';

function TestConsumer() {
  const { locale, setLocale, setTheme, theme } = useUiPreferences();

  return (
    <div>
      <p>{theme}</p>
      <p>{locale}</p>
      <button type="button" onClick={() => setTheme('light')}>
        light
      </button>
      <button type="button" onClick={() => setLocale('en')}>
        en
      </button>
    </div>
  );
}

describe('UiPreferencesProvider', () => {
  test('hydrates the document with the initial preferences and updates them', () => {
    render(
      <UiPreferencesProvider
        initialPreferences={{
          theme: 'dark',
          locale: 'es',
        }}
      >
        <TestConsumer />
      </UiPreferencesProvider>,
    );

    expect(screen.getByText('dark')).toBeInTheDocument();
    expect(screen.getByText('es')).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.lang).toBe('es');

    fireEvent.click(screen.getByRole('button', { name: 'light' }));
    fireEvent.click(screen.getByRole('button', { name: 'en' }));

    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.documentElement.lang).toBe('en');
  });
});
