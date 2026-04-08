import { describe, expect, test } from 'vitest';

import { PageBreak } from './page-break-extension';

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
});
