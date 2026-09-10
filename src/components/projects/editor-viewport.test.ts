import { describe, expect, test } from 'vitest';
import { resolveEditorViewportLayout } from './editor-viewport';

describe('editor physical viewport contract', () => {
  test('forces a fitted single mobile column without changing publication device', () => {
    const layout = resolveEditorViewportLayout({
      physicalWidth: 390,
      publicationDevice: 'laptop',
      pageWidth: 576,
      requestedViewMode: 'double',
    });

    expect(layout).toEqual({
      physicalDevice: 'mobile',
      layoutDevice: 'mobile',
      viewMode: 'single',
      scale: 358 / 576,
    });
  });

  test('keeps desktop spread when the physical viewport is wide', () => {
    expect(
      resolveEditorViewportLayout({
        physicalWidth: 1440,
        publicationDevice: 'laptop',
        pageWidth: 576,
        requestedViewMode: 'double',
      }),
    ).toEqual({
      physicalDevice: 'wide',
      layoutDevice: 'desktop',
      viewMode: 'double',
      scale: 1,
    });
  });

  test('fits a 430px viewport at natural scale when the page fits', () => {
    expect(
      resolveEditorViewportLayout({
        physicalWidth: 430,
        publicationDevice: 'mobile',
        pageWidth: 355,
        requestedViewMode: 'single',
      }).scale,
    ).toBe(1);
  });
});
