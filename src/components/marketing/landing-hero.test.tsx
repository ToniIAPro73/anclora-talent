import { render, screen } from '@testing-library/react';
import { LandingHero } from './landing-hero';

describe('LandingHero', () => {
  test('renders the primary and secondary CTAs', () => {
    render(
      <LandingHero
        eyebrow="Anclora Talent"
        headline="Convierte talento en una presencia editorial lista para publicar."
        subheadline="Crea tu cuenta, lanza tu proyecto y trabaja sobre un flujo claro de documento, preview y portada."
        primaryCta={{ href: '/sign-up', label: 'Crear cuenta' }}
        secondaryCta={{ href: '/sign-in', label: 'Iniciar sesión' }}
      />
    );

    expect(screen.getByRole('heading', { name: /convierte talento/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/sign-up');
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/sign-in');
  });
});
