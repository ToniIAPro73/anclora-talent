import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LandingHeader } from './landing-header';
import { LandingShowcase } from './landing-showcase';
import { LandingUseCases } from './landing-use-cases';
import { LandingPricing } from './landing-pricing';
import { LandingFaq } from './landing-faq';
import { UiPreferencesProvider } from '@/components/providers/UiPreferencesProvider';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

describe('New Landing Components', () => {
  it('renders LandingHeader with nav links and controls', () => {
    render(
      <UiPreferencesProvider
        initialPreferences={{ locale: 'es', theme: 'dark' }}
      >
        <LandingHeader
          nav={{
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
          }}
          primaryCta={{ href: '/sign-up', label: 'Crear cuenta' }}
          secondaryCta={{ href: '/sign-in', label: 'Iniciar sesión' }}
          isAuthenticated={false}
        />
      </UiPreferencesProvider>
    );

    expect(screen.getByText('Anclora Talent')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Características' })).toHaveAttribute(
      'href',
      '#caracteristicas'
    );
    expect(screen.getByRole('link', { name: 'Estudio' })).toHaveAttribute(
      'href',
      '#estudio'
    );
  });

  it('renders LandingShowcase items correctly', () => {
    render(
      <LandingShowcase
        eyebrow="Vitrina"
        title="Obras creadas"
        description="Selección de obras"
        items={[
          {
            category: 'Ficción',
            title: 'La Sombra del Farallón',
            author: 'M. Gómez',
            tagline: 'Novela histórica',
            specs: '284 páginas',
          },
        ]}
      />
    );

    const titleElements = screen.getAllByText('La Sombra del Farallón');
    expect(titleElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Por M. Gómez')).toBeInTheDocument();
  });

  it('renders LandingUseCases audience cards', () => {
    render(
      <LandingUseCases
        eyebrow="Audiencias"
        title="Para quién es"
        description="Distintos perfiles"
        useCases={[
          {
            title: 'Autores Independientes',
            role: 'Publicación Autónoma',
            description: 'Control total de tu obra',
            points: ['Sin comisiones', 'Exportación directa'],
          },
        ]}
      />
    );

    expect(screen.getByText('Autores Independientes')).toBeInTheDocument();
    expect(screen.getByText('Publicación Autónoma')).toBeInTheDocument();
  });

  it('renders LandingPricing with transparent details and CTA', () => {
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
        features={['Proyectos ilimitados', 'Exportación PDF y EPUB']}
      />
    );

    expect(screen.getByText('Plan Creador')).toBeInTheDocument();
    expect(screen.getByText('Gratis')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Crear cuenta gratuita' })).toHaveAttribute(
      'href',
      '/sign-up'
    );
  });

  it('renders LandingFaq and expands details on click', () => {
    render(
      <LandingFaq
        eyebrow="FAQ"
        title="Preguntas frecuentes"
        description="Dudas resueltas"
        items={[
          {
            question: '¿Conservo mis derechos de autor?',
            answer: 'Sí, el 100% de tus derechos te pertenecen.',
          },
        ]}
      />
    );

    expect(screen.getByText('¿Conservo mis derechos de autor?')).toBeInTheDocument();
    expect(screen.getByText('Sí, el 100% de tus derechos te pertenecen.')).toBeInTheDocument();
  });
});
