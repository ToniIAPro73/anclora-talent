import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HomePage from './page';
import { getCurrentUser } from '@/lib/auth/guards';
import { readUiPreferences } from '@/lib/ui-preferences/preferences.server';

vi.mock('@/lib/auth/guards', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/ui-preferences/preferences.server', () => ({
  readUiPreferences: vi.fn(),
}));

describe('HomePage', () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockReset();
    vi.mocked(readUiPreferences).mockResolvedValue({ locale: 'es', theme: 'dark' });
  });

  it('shows the new signup-first hero for anonymous users', { timeout: 10000 }, async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    render(await HomePage());

    const heroHeading = screen.getByRole('heading', {
      name: 'Convierte talento en una presencia editorial lista para publicar.',
    });
    const heroSection = heroHeading.closest('section');

    expect(heroHeading).toBeInTheDocument();
    expect(heroSection).not.toBeNull();

    const heroScope = within(heroSection!);

    expect(heroScope.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute(
      'href',
      '/sign-up',
    );
    expect(heroScope.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute(
      'href',
      '/sign-in',
    );
  });

  it('switches the primary CTA for authenticated users', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'user_123',
      email: 'test@example.com',
      fullName: 'Test User',
    });

    render(await HomePage());

    const heroHeading = screen.getByRole('heading', {
      name: 'Convierte talento en una presencia editorial lista para publicar.',
    });
    const heroScope = within(heroHeading.closest('section')!);

    expect(heroScope.getByRole('link', { name: 'Ir al dashboard' })).toHaveAttribute(
      'href',
      '/dashboard',
    );
    expect(heroScope.queryByRole('link', { name: 'Abrir plataforma' })).not.toBeInTheDocument();
  });
});
