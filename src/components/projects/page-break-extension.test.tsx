import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import type { NodeViewProps } from '@tiptap/react';

import { PageBreak, PageBreakComponent } from './page-break-extension';

function createNodeViewProps(breakType: 'manual' | 'auto'): NodeViewProps {
  return {
    editor: {} as NodeViewProps['editor'],
    node: { attrs: { breakType } } as NodeViewProps['node'],
    decorations: [],
    selected: false,
    extension: {} as NodeViewProps['extension'],
    getPos: () => 0,
    updateAttributes: () => undefined,
    deleteNode: () => undefined,
  };
}

describe('page-break-extension', () => {
  test('parses manual and auto page breaks and renders manual by default', () => {
    const parseRules = PageBreak.config.parseHTML?.() ?? [];
    const rendered = PageBreak.config.renderHTML?.({ HTMLAttributes: {} });

    expect(parseRules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tag: 'hr[data-page-break="manual"]' }),
        expect.objectContaining({ tag: 'hr[data-page-break="auto"]' }),
        expect.objectContaining({ tag: 'hr[data-page-break="true"]' }),
      ]),
    );
    expect(rendered).toEqual(['hr', { 'data-page-break': 'manual' }]);
  });

  test('manual break node view keeps the visual marker and forces a page cut', () => {
    render(<PageBreakComponent {...createNodeViewProps('manual')} />);

    const marker = screen.getByText('Salto de Página').closest('[data-page-break-visual]');
    expect(marker).toHaveAttribute('data-page-break-visual', 'manual');
    expect(marker).toHaveStyle({
      breakAfter: 'column',
      pageBreakAfter: 'always',
    });
  });

  test('auto break node view stays invisible but still forces a page cut', () => {
    render(<PageBreakComponent {...createNodeViewProps('auto')} />);

    const marker = document.querySelector('[data-page-break-visual="auto"]');
    expect(marker).toBeTruthy();
    expect(marker).toHaveStyle({
      breakAfter: 'column',
      pageBreakAfter: 'always',
    });
  });
});
