import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
import { autoBreakSignature } from './AdvancedRichTextEditor';

describe('autoBreakSignature (typing must not reset content unless pagination changes)', () => {
  const hr = '<hr data-page-break="auto">';

  it('is identical when only text or serialization differs', () => {
    const a = `<p>uno</p><p>dos</p>${hr}<p>tres</p>`;
    const b = `<p>uno!</p><p class="x">dos más</p>${hr}<p>tres</p>`;
    expect(autoBreakSignature(a)).toBe(autoBreakSignature(b));
  });

  it('changes when an automatic break moves between blocks', () => {
    expect(autoBreakSignature(`<p>a</p>${hr}<p>b</p><p>c</p>`)).not.toBe(
      autoBreakSignature(`<p>a</p><p>b</p>${hr}<p>c</p>`),
    );
  });

  it('changes when a break appears or disappears', () => {
    expect(autoBreakSignature(`<p>a</p><p>b</p>`)).not.toBe(autoBreakSignature(`<p>a</p>${hr}<p>b</p>`));
  });

  it('ignores manual page breaks (they are content, not layout)', () => {
    const manual = '<hr data-page-break="manual">';
    expect(autoBreakSignature(`<p>a</p>${manual}<p>b</p>`)).toBe(autoBreakSignature(`<p>a</p>${manual}<p>bb</p>`));
  });
});
