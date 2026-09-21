import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CookieConsent } from './CookieConsent';
import { LegalFooter } from './LegalFooter';
import { UiPreferencesProvider } from '@/components/providers/UiPreferencesProvider';

const pathname = vi.hoisted(() => ({ value: '/' }));
const routerRefresh = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.value,
  useRouter: () => ({ refresh: routerRefresh }),
}));

describe('LegalFooter', () => {
  beforeEach(() => {
    pathname.value = '/';
    localStorage.clear();
  });

  it('keeps the approved landing footer content and legal destinations', () => {
    render(<LegalFooter />);

    expect(screen.getByTestId('legal-footer')).toBeInTheDocument();
    expect(screen.getByText(/Todos los derechos reservados/i)).toBeInTheDocument();
    expect(screen.getByText(/ecosistema tecnológico/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Términos del servicio' })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: 'Política de privacidad' })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: 'Aviso legal' })).toHaveAttribute('href', '/legal');
    expect(screen.getByRole('link', { name: 'hola@anclora.com' })).toHaveAttribute('href', 'mailto:hola@anclora.com');
  });

  it('renders the same footer in English and uses the shared cookie event', () => {
    render(
      <UiPreferencesProvider initialPreferences={{ theme: 'dark', locale: 'en' }}>
        <LegalFooter mode="application" />
      </UiPreferencesProvider>,
    );

    expect(screen.getByRole('navigation', { name: 'Legal links' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cookies' }));
    expect(screen.getByRole('button', { name: 'Cookies' })).toBeInTheDocument();
  });

  it('opens the real cookie preferences UI from the application footer', () => {
    render(
      <>
        <LegalFooter mode="application" />
        <CookieConsent />
      </>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cookies' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Gestionar cookies')).toBeInTheDocument();
  });

  it('does not render the global footer on protected routes', () => {
    pathname.value = '/projects/project-1/cover';

    render(<LegalFooter />);

    expect(screen.queryByTestId('legal-footer')).not.toBeInTheDocument();
    expect(() => render(<LegalFooter mode="application" />)).not.toThrow();
  });
});
