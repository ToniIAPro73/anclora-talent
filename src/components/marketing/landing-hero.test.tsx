import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LandingHero } from './landing-hero';

describe('LandingHero', () => {
  it('renders the primary and secondary CTAs with new editorial headline', () => {
    render(
      <LandingHero
        eyebrow="Anclora Talent"
        headline="Convierte tu manuscrito en un libro listo para publicar."
        subheadline="Escribe o importa, maqueta, diseña la cubierta y exporta a PDF, EPUB o DOCX."
        primaryCta={{ href: '/sign-up', label: 'Crear cuenta gratis' }}
        secondaryCta={{ href: '/sign-in', label: 'Iniciar sesión' }}
        trustText="100% tus derechos · Sin tarjeta"
        coverLabel="Estudio de cubierta"
        editorLabel="Editor de capítulos"
        spreadLabel="Contraportada & pliego"
      />
    );

    expect(
      screen.getByRole('heading', { name: /convierte tu manuscrito en un libro listo para publicar/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /crear cuenta gratis/i })).toHaveAttribute('href', '/sign-up');
    expect(screen.getByRole('link', { name: /iniciar sesión/i })).toHaveAttribute('href', '/sign-in');
    expect(screen.getByText(/100% tus derechos/i)).toBeInTheDocument();
    expect(screen.getByText('Estudio de cubierta')).toBeInTheDocument();
    expect(screen.getByText('Contraportada & pliego')).toBeInTheDocument();
  });
});
