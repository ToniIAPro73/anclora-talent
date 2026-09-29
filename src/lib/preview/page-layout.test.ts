import { describe, expect, it } from 'vitest';
import { getPageContentHeight, PAGE_NUMBER_SAFE_BAND } from './page-layout';

describe('page-layout', () => {
  it('reserves the larger of the configured bottom margin and folio band', () => {
    expect(getPageContentHeight(864, { top: 24, bottom: 24 })).toBe(792);
    expect(getPageContentHeight(864, { top: 72, bottom: 72 })).toBe(720);
    expect(PAGE_NUMBER_SAFE_BAND).toBe(48);
  });
});
