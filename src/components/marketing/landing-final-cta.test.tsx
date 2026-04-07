import { render, screen } from '@testing-library/react';
import { LandingFinalCta } from './landing-final-cta';

describe('LandingFinalCta', () => {
  test('renders the final signup action', () => {
    render(
      <LandingFinalCta
        eyebrow="Siguiente paso"
        title="Abre tu cuenta"
        primaryCta={{ href: '/sign-up', label: 'Crear cuenta' }}
        note="No credit card required"
      />
    );

    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/sign-up');
    expect(screen.getByText('No credit card required')).toBeInTheDocument();
  });
});