import { render, screen } from '@testing-library/react';
import { LandingProofStrip } from './landing-proof-strip';

describe('LandingProofStrip', () => {
  test('renders the trust items as a readable list', () => {
    render(<LandingProofStrip items={['Proyectos persistentes', 'Documento, preview y portada', 'Acceso autenticado']} />);

    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getByText('Proyectos persistentes')).toBeInTheDocument();
    expect(screen.getByText('Documento, preview y portada')).toBeInTheDocument();
  });
});