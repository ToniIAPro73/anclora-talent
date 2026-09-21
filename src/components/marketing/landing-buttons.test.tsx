import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UiPreferencesProvider } from '@/components/providers/UiPreferencesProvider';
import { LandingHeader } from './landing-header';
import { LandingHero } from './landing-hero';
import { LandingPricing } from './landing-pricing';
import { LandingFinalCta } from './landing-final-cta';
import { LandingProductStory, type ProductMoment } from './landing-product-story';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const nav = {
  features: 'Características',
  studio: 'Estudio',
  showcase: 'Vitrina',
  useCases: 'Audiencias',
  pricing: 'Acceso',
  faq: 'Preguntas',
  signIn: 'Iniciar sesión',
  signUp: 'Crear cuenta',
  dashboard: 'Ir al dashboard',
  toggleTheme: 'Cambiar tema',
  toggleLocale: 'Cambiar idioma',
  openMenu: 'Abrir menú',
  closeMenu: 'Cerrar menú',
};

/**
 * Standard landing CTA buttons must render as text only — no svg/img
 * descendant — and reuse the shared Dashboard/Workspace button primitive
 * (`dashboard-button` / `dashboard-button--primary`), not a one-off
 * landing-specific class. Icon-only system controls (theme toggle, locale
 * toggle, mobile menu button) are explicitly whitelisted and excluded from
 * this assertion — they are dedicated controls, not text CTAs.
 */
function expectNoIconTextButton(el: HTMLElement) {
  expect(el.querySelector('svg')).toBeNull();
  expect(el.querySelector('img')).toBeNull();
  expect(el.querySelector('[data-icon]')).toBeNull();
  expect(el.className).toMatch(/\bdashboard-button\b/);
}

describe('landing CTA buttons — shared Dashboard button system, no icons', () => {
  it('LandingHeader: unauthenticated desktop CTAs use dashboard-button classes with no icon', () => {
    render(
      <UiPreferencesProvider initialPreferences={{ locale: 'es', theme: 'dark' }}>
        <LandingHeader
          nav={nav}
          primaryCta={{ href: '/sign-up', label: 'Crear cuenta' }}
          secondaryCta={{ href: '/sign-in', label: 'Iniciar sesión' }}
          isAuthenticated={false}
        />
      </UiPreferencesProvider>,
    );

    const primary = screen.getAllByRole('link', { name: 'Crear cuenta' })[0];
    const secondary = screen.getAllByRole('link', { name: 'Iniciar sesión' })[0];
    expectNoIconTextButton(primary);
    expect(primary.className).toMatch(/\bdashboard-button--primary\b/);
    expectNoIconTextButton(secondary);
    expect(secondary.className).not.toMatch(/\bdashboard-button--primary\b/);
  });

  it('LandingHeader: authenticated "Ir al dashboard" CTA has no icon and uses the primary variant', () => {
    render(
      <UiPreferencesProvider initialPreferences={{ locale: 'es', theme: 'dark' }}>
        <LandingHeader
          nav={nav}
          primaryCta={{ href: '/dashboard', label: 'Ir al dashboard' }}
          secondaryCta={null}
          isAuthenticated
        />
      </UiPreferencesProvider>,
    );

    const dashboardLinks = screen.getAllByRole('link', { name: 'Ir al dashboard' });
    expect(dashboardLinks.length).toBeGreaterThan(0);
    dashboardLinks.forEach((link) => {
      expectNoIconTextButton(link);
      expect(link.className).toMatch(/\bdashboard-button--primary\b/);
      expect(link).toHaveAttribute('href', '/dashboard');
    });
  });

  it('LandingHeader: theme and locale toggles remain icon controls, untouched by the no-icon rule', () => {
    render(
      <UiPreferencesProvider initialPreferences={{ locale: 'es', theme: 'dark' }}>
        <LandingHeader
          nav={nav}
          primaryCta={{ href: '/sign-up', label: 'Crear cuenta' }}
          secondaryCta={{ href: '/sign-in', label: 'Iniciar sesión' }}
          isAuthenticated={false}
        />
      </UiPreferencesProvider>,
    );

    const themeToggle = screen.getByTestId('landing-theme-toggle');
    const localeToggle = screen.getByTestId('landing-locale-toggle');
    // Whitelisted icon-only system controls: preserve their icon.
    expect(themeToggle.querySelector('svg')).not.toBeNull();
    expect(localeToggle.querySelector('svg')).not.toBeNull();
  });

  it('LandingHero: primary and secondary CTAs use dashboard-button classes with no icon', () => {
    render(
      <LandingHero
        eyebrow="Anclora Talent"
        headline="Convierte tu manuscrito en un libro listo para publicar."
        subheadline="Escribe o importa."
        primaryCta={{ href: '/sign-up', label: 'Crear cuenta gratis' }}
        secondaryCta={{ href: '/sign-in', label: 'Iniciar sesión' }}
        exploreProductLabel="Ver flujo editorial"
      />,
    );

    const primary = screen.getByRole('link', { name: 'Crear cuenta gratis' });
    const secondary = screen.getByRole('link', { name: 'Iniciar sesión' });
    expectNoIconTextButton(primary);
    expect(primary.className).toMatch(/\bdashboard-button--primary\b/);
    expectNoIconTextButton(secondary);

    const explore = screen.getByRole('link', { name: 'Ver flujo editorial' });
    expect(explore.querySelector('svg')).toBeNull();
    expect(explore.textContent?.includes('↓')).toBe(false);
  });

  it('LandingPricing: CTA uses dashboard-button--primary with no icon', () => {
    render(
      <LandingPricing
        eyebrow="Acceso"
        title="Empieza hoy"
        description="Sin barreras"
        planName="Plan Creador"
        price="Gratis"
        cadence="durante la fase actual"
        featuresTitle="Incluye:"
        ctaText="Crear cuenta gratuita"
        footnote="Sin tarjeta requerida"
        features={['Proyectos ilimitados']}
      />,
    );

    const cta = screen.getByRole('link', { name: 'Crear cuenta gratuita' });
    expectNoIconTextButton(cta);
    expect(cta.className).toMatch(/\bdashboard-button--primary\b/);
  });

  it('LandingFinalCta: primary and secondary CTAs use dashboard-button classes with no icon', () => {
    render(
      <LandingFinalCta
        eyebrow="Siguiente paso"
        title="Abre tu cuenta"
        primaryCta={{ href: '/sign-up', label: 'Crear cuenta' }}
        secondaryCta={{ href: '/sign-in', label: 'Iniciar sesión' }}
        note="Sin tarjeta"
      />,
    );

    const primary = screen.getByRole('link', { name: 'Crear cuenta' });
    const secondary = screen.getByRole('link', { name: 'Iniciar sesión' });
    expectNoIconTextButton(primary);
    expect(primary.className).toMatch(/\bdashboard-button--primary\b/);
    expectNoIconTextButton(secondary);
  });

  it('LandingProductStory: Portada/Contraportada toggle has no icon and reflects selected state', () => {
    const moments: ProductMoment[] = [
      {
        id: 'cover',
        badge: '03 · Estudio de Cubierta',
        title: 'Diseño integral',
        description: 'Lienzo milimétrico.',
        pills: [],
        imageDark: '/landing/features/cover-studio-dark.png',
        imageLight: '/landing/features/cover-studio-light.png',
        altDark: 'Estudio de portada (oscuro)',
        altLight: 'Estudio de portada (claro)',
        backImageDark: '/landing/features/cover-studio-back-dark.png',
        backImageLight: '/landing/features/cover-studio-back-light.png',
        hasBackCoverToggle: true,
      },
    ];

    render(
      <LandingProductStory
        eyebrow="Flujo"
        title="Libro"
        description="Desc"
        moments={moments}
        frontLabel="Portada"
        backLabel="Contraportada"
        viewLabel="Vista:"
      />,
    );

    const front = screen.getByRole('button', { name: 'Portada' });
    const back = screen.getByRole('button', { name: 'Contraportada' });
    expect(front.querySelector('svg')).toBeNull();
    expect(back.querySelector('svg')).toBeNull();

    // Front is selected by default.
    expect(front).toHaveAttribute('aria-pressed', 'true');
    expect(back).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(back);
    expect(back).toHaveAttribute('aria-pressed', 'true');
    expect(front).toHaveAttribute('aria-pressed', 'false');
  });
});
