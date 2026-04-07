import { render, screen } from '@testing-library/react';
import { LandingProductShowcase } from './landing-product-showcase';

describe('LandingProductShowcase', () => {
  test('renders the product panels and anchor id', () => {
    render(
      <LandingProductShowcase
        id="product-showcase"
        eyebrow="Producto"
        description="Una plataforma donde documento, preview y portada dejan de competir entre sí."
        title="Un sistema editorial que une documento, preview y portada."
        panels={[
          { title: 'Documento canonico', description: 'Un solo origen de verdad.' },
          { title: 'Preview conectado', description: 'Lo que ves es lo que publicas.' },
          { title: 'Portada persistente', description: 'Assets listos para reutilizar.' },
        ]}
      />
    );

    expect(screen.getByRole('region', { name: /un sistema editorial/i })).toBeInTheDocument();
    expect(screen.getByText('Documento canonico')).toBeInTheDocument();
    expect(screen.getByText('Portada persistente')).toBeInTheDocument();
  });
});