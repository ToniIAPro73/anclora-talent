import { describe, expect, test } from 'vitest';

import { estimateTotalPages } from './page-calculator';

describe('page-calculator', () => {
  test('counts manual page breaks as additional pages', () => {
    const pages = estimateTotalPages('<p>Uno</p><hr data-page-break="true" /><p>Dos</p>', {
      device: 'desktop',
      fontSize: '16px',
      marginTop: 24,
      marginBottom: 24,
      marginLeft: 24,
      marginRight: 24,
    });

    expect(pages).toBe(2);
  });
});
