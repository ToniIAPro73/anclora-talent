import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { ContextualActionHint } from './ContextualActionHint';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveLocaleMessages } from '@/lib/i18n/messages';

describe('ContextualActionHint', () => {
  test('constrains long hints to the available viewport width', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8');
    expect(css).toContain('.cover-action-tooltip { position: fixed;');
    expect(css).toContain('width: min(18rem, calc(100vw - 1.5rem))');
  });

  test('provides separate localized import semantics in Spanish and English', () => {
    const spanish = resolveLocaleMessages('es').coverDesignSurface;
    const english = resolveLocaleMessages('en').coverDesignSurface;
    expect(spanish.background.imageImportHint).toContain('resto de las capas');
    expect(english.background.imageImportHint).toContain('other layers remain untouched');
    expect(spanish.workspace.importCoverJsonHint).toContain('sección de portada');
    expect(spanish.workspace.importBackCoverJsonHint).toContain('sección de contraportada');
    expect(english.workspace.importCoverJsonHint).toContain('only the cover section');
    expect(english.workspace.importBackCoverJsonHint).toContain('only the back-cover section');
  });

  test('shows a viewport-safe hint on hover and exposes its description accessibly', () => {
    render(
      <ContextualActionHint hint="Only the background changes; other layers remain untouched.">
        <button type="button" data-testid="action">Replace background</button>
      </ContextualActionHint>,
    );

    const button = screen.getByTestId('action');
    const descriptionId = button.getAttribute('aria-describedby');
    expect(descriptionId).toBeTruthy();
    expect(document.getElementById(descriptionId!)).toHaveTextContent('Only the background changes');

    fireEvent.mouseEnter(button);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Only the background changes');
    expect(screen.getByRole('tooltip')).toHaveClass('cover-action-tooltip');
  });

  test('shows the hint when the action receives keyboard focus', () => {
    render(
      <ContextualActionHint hint="Import replaces the current surface.">
        <button type="button">Import</button>
      </ContextualActionHint>,
    );

    fireEvent.focus(screen.getByRole('button', { name: 'Import' }));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Import replaces the current surface.');
  });
});
