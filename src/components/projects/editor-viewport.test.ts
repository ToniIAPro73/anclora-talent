import { describe, expect, test } from 'vitest';
import { resolveEditorViewportLayout, calculateSpreadFitFactor } from './editor-viewport';

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

  test('calculateSpreadFitFactor scales down spread when wider than available viewport to prevent clipping', () => {
    // Natural spread: 576 * 2 + 32 = 1184px. Available viewport: 888px.
    const factor = calculateSpreadFitFactor({
      availableWidth: 888,
      naturalWidth: 1184,
    });
    expect(factor).toBeCloseTo(888 / 1184, 4);
    expect(factor).toBeLessThan(1);
  });

  test('calculateSpreadFitFactor preserves scale 1 when natural width fits within available width', () => {
    // Single page: 576px fits within 888px
    const singlePageFactor = calculateSpreadFitFactor({
      availableWidth: 888,
      naturalWidth: 576,
    });
    expect(singlePageFactor).toBe(1);

    // Wide screen spread: 1184px fits within 1400px
    const wideSpreadFactor = calculateSpreadFitFactor({
      availableWidth: 1400,
      naturalWidth: 1184,
    });
    expect(wideSpreadFactor).toBe(1);
  });

  test('calculateSpreadFitFactor respects minScale threshold', () => {
    const factor = calculateSpreadFitFactor({
      availableWidth: 200,
      naturalWidth: 1184,
      minScale: 0.5,
    });
    expect(factor).toBe(0.5);
  });
});
