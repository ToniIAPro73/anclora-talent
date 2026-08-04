import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { ProcessingModeBadge } from './ProcessingModeBadge';

const labels = {
  local: 'Procesado en tu dispositivo',
  service: 'Procesado en la nube privada de Anclora',
  browser: 'Procesado en tu navegador',
};

describe('ProcessingModeBadge (routing-policy.md: visible mode indicator)', () => {
  test.each([
    ['local', labels.local],
    ['service', labels.service],
    ['browser', labels.browser],
  ] as const)('declares the %s mode with its label', (mode, label) => {
    render(<ProcessingModeBadge mode={mode} labels={labels} />);

    const badge = screen.getByTestId('processing-mode-badge');
    expect(badge).toHaveAttribute('data-mode', mode);
    expect(badge).toHaveTextContent(label);
  });
});
