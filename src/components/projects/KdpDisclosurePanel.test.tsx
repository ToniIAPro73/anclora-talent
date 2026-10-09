import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { KdpDisclosurePanel } from './KdpDisclosurePanel';

const copy = resolveLocaleMessages('es').project;

describe('KdpDisclosurePanel', () => {
  it('shows the required badge and the AI-assisted declaration text', () => {
    render(
      <KdpDisclosurePanel
        copy={copy}
        disclosure={{
          status: 'required',
          required: true,
          aiBlockCount: 2,
          humanBlockCount: 5,
          text: 'Declaración de contenido generado con IA (Amazon KDP): este libro contiene contenido creado con asistencia de IA.',
        }}
      />,
    );

    expect(screen.getByTestId('kdp-disclosure-badge').getAttribute('data-required')).toBe('true');
    expect(screen.getByTestId('kdp-disclosure-text').textContent).toContain('asistencia de IA');
  });

  it('shows the exempt badge for 100% human content', () => {
    render(
      <KdpDisclosurePanel
        copy={copy}
        disclosure={{
          status: 'exempt-human',
          required: false,
          aiBlockCount: 0,
          humanBlockCount: 7,
          text: 'Declaración de contenido generado con IA (Amazon KDP): no requerida.',
        }}
      />,
    );

    expect(screen.getByTestId('kdp-disclosure-badge').getAttribute('data-required')).toBe('false');
    expect(screen.getByTestId('kdp-disclosure-badge').textContent).toContain('Exenta');
  });
});
