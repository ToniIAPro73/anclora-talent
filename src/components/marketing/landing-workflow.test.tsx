import { render, screen } from '@testing-library/react';
import { LandingWorkflow } from './landing-workflow';

describe('LandingWorkflow', () => {
  test('renders the three-step onboarding flow', () => {
    render(
      <LandingWorkflow
        eyebrow="Flujo de trabajo"
        title="Como funciona la plataforma"
        description="Tres pasos para llevar tu idea a una publicación real."
        stepLabel="Paso"
        advanceLabel="Siguiente"
        steps={[
          { title: 'Crea tu cuenta', description: 'Entra en segundos y deja listo tu espacio.' },
          { title: 'Lanza tu proyecto', description: 'Trabaja sobre un documento inicial consistente.' },
          { title: 'Edita y publica', description: 'Pasa de borrador a portada sin fricción.' },
        ]}
      />
    );

    expect(screen.getByRole('heading', { name: 'Crea tu cuenta' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lanza tu proyecto' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Edita y publica' })).toBeInTheDocument();
  });
});