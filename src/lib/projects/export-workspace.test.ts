import { describe, expect, test } from 'vitest';
import type { ComposeViolation } from '@/lib/compose/compose';
import type { PreflightCheck } from '@/lib/preflight/preflight';
import type { ProjectCapabilities } from './capabilities';
import {
  buildExportUrl,
  effectivePageSize,
  EXPORT_FORMATS,
  exportFileName,
  formatAvailability,
  formatFileSize,
  formatGate,
  isOriginalPdfExport,
  summarizeExportGeometry,
} from './export-workspace';

const editable: ProjectCapabilities = {
  canEditContent: true, canEditCover: true, canCompose: true, canExportOriginalPdf: true, canExportDocx: true, canExportEpub: true,
  canExportHtml: true, canExportMarkdown: true, canGenerateCommercialAssets: true, canGenerateLaunchPack: true, canCreateEditableCopy: false,
};
const fixedPdf: ProjectCapabilities = {
  ...editable, canEditContent: false, canEditCover: false, canCompose: false, canExportDocx: false, canExportEpub: false,
  canExportHtml: false, canExportMarkdown: false, canCreateEditableCopy: true,
};
const violation = (rule = 'widowsOrphans'): ComposeViolation => ({ page: 1, blockId: 'b', rule, message: 'm' });
const check = (channel: PreflightCheck['channel'], rule: string, severity: PreflightCheck['severity'] = 'error'): PreflightCheck => ({ channel, severity, rule, params: {} });

describe('availability comes from the capability matrix', () => {
  test('editable projects can export everything', () => {
    for (const format of EXPORT_FORMATS) expect(formatAvailability(format.id, editable)).toEqual({ available: true });
    expect(isOriginalPdfExport('pdf', editable)).toBe(false);
  });

  test('fixed-PDF projects keep only the original PDF; the reason is explicit', () => {
    expect(formatAvailability('pdf', fixedPdf)).toEqual({ available: true });
    expect(isOriginalPdfExport('pdf', fixedPdf)).toBe(true);
    for (const id of ['docx', 'epub', 'html', 'markdown'] as const) expect(formatAvailability(id, fixedPdf)).toEqual({ available: false, reason: 'fixedPdf' });
  });
});

describe('format-specific gating (same inputs and policy as before, narrower reach)', () => {
  const base = { violations: [violation()], checks: [check('kobo', 'kobo.metadata.language'), check('kdp', 'kdp.metadata.title'), check('kobo', 'kobo.metadata.title')] };

  test('layout violations block PDF and EPUB only', () => {
    const gate = (format: Parameters<typeof formatGate>[0]['format']) => formatGate({ format, exportGate: 'block', capabilities: editable, violations: [violation()], checks: [] });
    expect(gate('pdf').blocked).toBe(true);
    expect(gate('epub').blocked).toBe(true);
    expect(gate('docx').blocked).toBe(false);
    expect(gate('html').blocked).toBe(false);
    expect(gate('markdown').blocked).toBe(false);
  });

  test('preflight errors follow their channel', () => {
    const gate = (format: Parameters<typeof formatGate>[0]['format']) => formatGate({ format, exportGate: 'block', capabilities: editable, violations: [], checks: base.checks });
    expect(gate('epub').errors.map((item) => item.rule).sort()).toEqual(['kdp.metadata.title', 'kobo.metadata.language']);
    expect(gate('pdf').errors.map((item) => item.rule)).toEqual(['kdp.metadata.title']);
    expect(gate('docx').blocked).toBe(true);
    expect(gate('html').blocked).toBe(false);
    expect(gate('markdown').blocked).toBe(false);
  });

  test('only the policy "block" blocks; warn/off keep every format exportable but still count', () => {
    const warn = formatGate({ format: 'pdf', exportGate: 'warn', capabilities: editable, violations: [violation(), violation()], checks: [] });
    expect(warn.blocked).toBe(false);
    expect(warn.warningCount).toBe(2);
    expect(warn.errorCount).toBe(0);
    const off = formatGate({ format: 'pdf', exportGate: 'off', capabilities: editable, violations: [violation()], checks: [check('kdp', 'kdp.metadata.title')] });
    expect(off.blocked).toBe(false);
    expect(off.errorCount).toBe(1);
  });

  test('warnings and info never block; duplicates across channels count once', () => {
    const gate = formatGate({ format: 'epub', exportGate: 'block', capabilities: editable, violations: [], checks: [check('kdp', 'kdp.metadata.language', 'warning'), check('kobo', 'kobo.metadata.language', 'warning')] });
    expect(gate.blocked).toBe(false);
    expect(gate.warningCount).toBe(1);
  });

  test('fixed PDF is never gated by Talent composition', () => {
    expect(formatGate({ format: 'pdf', exportGate: 'block', capabilities: fixedPdf, violations: [violation()], checks: [check('kdp', 'kdp.metadata.title')] })).toMatchObject({ blocked: false, errorCount: 0, warningCount: 0 });
  });
});

describe('export request helpers', () => {
  test('page size is an export-only override of the route\'s own device parameter, only for page-based formats', () => {
    const query = 'device=laptop&marginTop=72&marginBottom=72&marginLeft=72&marginRight=72&fontSize=16';
    expect(buildExportUrl('pdf', 'p1', query, { pageSize: 'tablet' })).toContain('device=tablet');
    expect(buildExportUrl('docx', 'p1', query, { pageSize: 'ereader' })).toContain('device=ereader');
    expect(buildExportUrl('epub', 'p1', query, { pageSize: 'ereader' })).toContain('device=laptop');
    expect(buildExportUrl('markdown', 'p1', query)).toMatch(/^\/api\/projects\/export\/markdown\?projectId=p1/);
    expect(buildExportUrl('html', 'p1', query)).toMatch(/^\/api\/projects\/export\?projectId=p1/);
  });

  test('the original PDF is requested without composition parameters', () => {
    expect(buildExportUrl('pdf', 'p1', 'device=tablet&marginTop=1', { original: true })).toBe('/api/projects/export/pdf?projectId=p1');
  });

  test('geometry summary uses the same resolver as the route', () => {
    const summary = summarizeExportGeometry('marginTop=72&marginBottom=72&marginLeft=48&marginRight=48', 'laptop');
    expect(summary).toMatchObject({ widthIn: 6, heightIn: 9, marginsMm: { top: 19, bottom: 19, left: 13, right: 13 } });
    expect(effectivePageSize('device=tablet')).toBe('tablet');
    expect(effectivePageSize('device=weird')).toBe('laptop');
  });

  test('file names and sizes', () => {
    expect(exportFileName('mi-libro', 'markdown')).toBe('mi-libro.md');
    expect(exportFileName(undefined, 'pdf')).toBe('proyecto.pdf');
    expect(formatFileSize(512, 'es')).toBe('512 B');
    expect(formatFileSize(1_500_000, 'en')).toBe('1.4 MB');
  });
});
