import { describe, expect, test } from 'vitest';
import { PageBreak } from './page-break-extension';

describe('page-break-extension', () => {
  test('parses manual and auto page breaks and renders manual by default', () => {
    const config = PageBreak.config as unknown as {
      parseHTML?: () => unknown[];
      renderHTML?: (props: { HTMLAttributes: Record<string, unknown> }) => unknown;
    };
    const parseRules = config.parseHTML?.() ?? [];
    const rendered = config.renderHTML?.({ HTMLAttributes: {} });

    expect(parseRules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tag: 'hr[data-page-break="manual"]' }),
        expect.objectContaining({ tag: 'hr[data-page-break="auto"]' }),
        expect.objectContaining({ tag: 'hr[data-page-break="true"]' }),
      ]),
    );
    expect(rendered).toEqual(['hr', { 'data-page-break': 'manual' }]);
  });

  test('does not register a custom node view so page breaks render as native hr elements', () => {
    expect(PageBreak.config.addNodeView).toBeUndefined();
  });
});
