import { render, screen } from '@testing-library/react';
import { LandingBenefits } from './landing-benefits';

describe('LandingBenefits', () => {
  test('renders the benefit cards', () => {
    render(
      <LandingBenefits
        items={[
          { title: 'Mas claridad', description: 'Todo queda organizado desde el primer proyecto.' },
          { title: 'Mas velocidad', description: 'Menos decisiones redundantes en el flujo.' },
        ]}
      />
    );

    expect(screen.getByRole('heading', { name: 'Mas claridad' })).toBeInTheDocument();
    expect(screen.getByText('Mas velocidad')).toBeInTheDocument();
  });
});