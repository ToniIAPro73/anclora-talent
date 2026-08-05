import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { SubmitButton } from './SubmitButton';

describe('SubmitButton', () => {
  test('forwards data-testid to the rendered button', () => {
    render(
      <form action={() => {}}>
        <SubmitButton data-testid="create-project-submit-button">Guardar</SubmitButton>
      </form>,
    );

    expect(screen.getByTestId('create-project-submit-button')).toHaveAttribute('type', 'submit');
  });
});
