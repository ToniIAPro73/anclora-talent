import { describe, expect, test } from 'vitest';
import {
  buildLogicalPages,
  buildPreflightRows,
  clampZoom,
  computeMetrics,
  destinationFormat,
  destinationSupportsSpread,
  fitZoom,
  formatPageSize,
  marginsToMillimetres,
  resolvePreviewGeometry,
  spreadAt,
  stepPage,
} from './preview-workspace';

const overrides = { fontSize: 15, lineHeight: 1.2, pageWidth: 576, pageHeight: 866, margins: { top: 72, bottom: 44, left: 67, right: 66 } };

describe('resolvePreviewGeometry', () => {
  test('print keeps the project geometry', () => {
    const geometry = resolvePreviewGeometry({ destination: 'print', sourceFidelity: false, projectOverrides: overrides });
    expect(geometry.config.pageHeight).toBe(866);
    expect(geometry.recomposedForDevice).toBe(false);
  });

  test('digital destinations recompose reflowable documents with the device geometry', () => {
    const tablet = resolvePreviewGeometry({ destination: 'tablet', sourceFidelity: false, projectOverrides: overrides });
    const ereader = resolvePreviewGeometry({ destination: 'ereader', sourceFidelity: false, projectOverrides: overrides });
    expect(tablet.config.pageWidth).toBe(528);
    expect(ereader.config.pageWidth).toBe(480);
    expect(ereader.config.fontSize).toBe(15);
    expect(tablet.recomposedForDevice && ereader.recomposedForDevice).toBe(true);
  });

  test('source-fidelity documents never reflow whatever the destination', () => {
    for (const destination of ['desktop', 'tablet', 'ereader'] as const) {
      const geometry = resolvePreviewGeometry({ destination, sourceFidelity: true, projectOverrides: overrides });
      expect(geometry.config.pageWidth).toBe(576);
      expect(geometry.config.pageHeight).toBe(866);
      expect(geometry.sourceAuthoritative).toBe(true);
      expect(geometry.recomposedForDevice).toBe(false);
    }
  });

  test('destinations map to device presets and spread support', () => {
    expect(destinationFormat('ereader')).toBe('ereader');
    expect(destinationFormat('desktop')).toBe('laptop');
    expect(destinationSupportsSpread('desktop')).toBe(true);
    expect(destinationSupportsSpread('tablet')).toBe(false);
  });
});

describe('logical pages and spreads', () => {
  const pages = buildLogicalPages({ contentPageCount: 5, hasBackCover: true });

  test('cover first, printed numbers count the cover, back cover last', () => {
    expect(pages.map((page) => page.kind)).toEqual(['cover', 'content', 'content', 'content', 'content', 'content', 'back-cover']);
    expect(pages[1].printedNumber).toBe(2);
    expect(pages[5].printedNumber).toBe(6);
    expect(pages[0].printedNumber).toBeUndefined();
  });

  test('spreads pair an even printed page on the left with the next one; ends stand alone', () => {
    expect(spreadAt(pages, 0)).toEqual({ left: null, right: pages[0] });
    expect(spreadAt(pages, 1)).toEqual({ left: pages[1], right: pages[2] });
    expect(spreadAt(pages, 2)).toEqual({ left: pages[1], right: pages[2] });
    expect(spreadAt(pages, 5)).toEqual({ left: pages[5], right: null });
    expect(spreadAt(pages, 6)).toEqual({ left: null, right: pages[6] });
  });

  test('stepping in spread mode moves from spread to spread', () => {
    expect(stepPage(pages, 0, 1, 'spread')).toBe(1);
    expect(stepPage(pages, 1, 1, 'spread')).toBe(3);
    expect(stepPage(pages, 3, 1, 'spread')).toBe(5);
    expect(stepPage(pages, 5, 1, 'spread')).toBe(6);
    expect(stepPage(pages, 6, 1, 'spread')).toBe(6);
    expect(stepPage(pages, 3, -1, 'spread')).toBe(1);
    expect(stepPage(pages, 1, -1, 'spread')).toBe(0);
  });

  test('stepping in document mode moves page by page and clamps', () => {
    expect(stepPage(pages, 2, 1, 'document')).toBe(3);
    expect(stepPage(pages, 0, -1, 'document')).toBe(0);
    expect(stepPage(pages, 6, 1, 'document')).toBe(6);
  });
});

describe('fit and zoom', () => {
  test('fit shows the whole spread, capped at 100 %, floor 20 %', () => {
    expect(fitZoom({ stageWidth: 1000, stageHeight: 700, contentWidth: 1152, contentHeight: 866 })).toBe(77);
    expect(fitZoom({ stageWidth: 2000, stageHeight: 2000, contentWidth: 576, contentHeight: 866 })).toBe(100);
    expect(fitZoom({ stageWidth: 50, stageHeight: 50, contentWidth: 576, contentHeight: 866 })).toBe(20);
  });

  test('manual zoom is bounded to 50–150', () => {
    expect(clampZoom(10)).toBe(50);
    expect(clampZoom(400)).toBe(150);
    expect(clampZoom(87.4)).toBe(87);
  });
});

describe('metrics and sizes', () => {
  test('metrics come from the page list and the chapters behind it', () => {
    const pages = buildLogicalPages({ contentPageCount: 4, hasBackCover: true });
    const metrics = computeMetrics({ pages, contentPageSemanticTypes: ['prologue', 'toc', 'chapter', 'chapter'] });
    expect(metrics).toEqual({ total: 6, content: 4, preliminary: 2, hasCover: true, hasBackCover: true });
  });

  test('page size and margins are reported in inches and millimetres', () => {
    expect(formatPageSize({ pageWidth: 576, pageHeight: 864 })).toEqual({ inches: '6 × 9 in', millimetres: '152 × 229 mm' });
    expect(marginsToMillimetres({ top: 72, bottom: 72, left: 48, right: 48 })).toEqual({ top: 19, bottom: 19, left: 13, right: 13 });
  });
});

describe('buildPreflightRows', () => {
  const toLogicalPage = (page: number) => page + 1;

  test('reports only real analyzers and never a false green for the rest', () => {
    const rows = buildPreflightRows({ checks: [], violations: [], toLogicalPage });
    expect(rows.find((row) => row.id === 'fonts')?.status).toBe('ok');
    expect(rows.find((row) => row.id === 'images')?.partial).toBe(true);
    expect(rows.find((row) => row.id === 'safeArea')?.status).toBe('unchecked');
  });

  test('violations and checks surface with the page they navigate to', () => {
    const rows = buildPreflightRows({
      checks: [
        { channel: 'kdp', severity: 'warning', rule: 'kdp.fonts.embed', params: { font: 'Foo' } },
        { channel: 'kobo', severity: 'warning', rule: 'kobo.fonts.embed', params: { font: 'Foo' } },
        { channel: 'kdp', severity: 'error', rule: 'kdp.image.alt', params: { src: 'a.png' }, page: 3, blockId: 'b1' },
      ],
      violations: [{ page: 2, blockId: 'x', rule: 'keepTogether.table', message: 'Tabla partida' }],
      toLogicalPage,
    });
    const fonts = rows.find((row) => row.id === 'fonts')!;
    expect(fonts.status).toBe('warning');
    expect(fonts.findings).toHaveLength(1);
    expect(rows.find((row) => row.id === 'images')).toMatchObject({ status: 'error' });
    expect(rows.find((row) => row.id === 'images')!.findings[0].logicalPage).toBe(4);
    expect(rows.find((row) => row.id === 'composition')!.findings[0]).toMatchObject({ logicalPage: 3, message: 'Tabla partida' });
  });
});
