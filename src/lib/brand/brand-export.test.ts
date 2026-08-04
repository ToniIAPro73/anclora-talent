/**
 * Brand theme applied to the exports (FASE 2): the same template overrides
 * that reach the composer style the PDF (base-14 mapping), the EPUB
 * stylesheet and the HTML export CSS — one canonical model (R3).
 */
import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { createProjectRecord } from '@/lib/projects/factories';
import { composeProjectPreview } from '@/lib/compose/preview-adapter';
import { DEVICE_PAGINATION_CONFIGS } from '@/lib/preview/device-configs';
import { buildEpub } from '@/lib/epub';
import {
  buildBrandExportCss,
  renderProjectExportHtml,
  resolvePdfBrandTheme,
} from '@/lib/projects/export-builder';
import { brandProfileToTemplateOverrides } from './brand-template-overrides';
import { createBrandProfileRecord } from './brand-profile';

const ANCLORA_PROFILE = createBrandProfileRecord('user_1', {
  name: 'Anclora Insights',
  status: 'active',
  palette: [
    { role: 'ink', hex: '#0F172A', name: 'Negro Tinta', usagePercent: 55, confidence: 'high' },
    { role: 'paper', hex: '#F8FAFC', name: 'Crema Papel', usagePercent: 30, confidence: 'high' },
    { role: 'accent', hex: '#F59E0B', name: 'Oro Metálico', usagePercent: 10, confidence: 'high' },
    { role: 'accentMuted', hex: '#D97706', name: 'Oro Mitigado', usagePercent: 5, confidence: 'high' },
  ],
  typography: {
    display: { family: 'Libre Baskerville', confidence: 'high' },
    body: { family: 'Inter', confidence: 'high' },
  },
  usageProportions: { ink: 55, paper: 30, accent: 10, accentMuted: 5 },
});

const OVERRIDES = brandProfileToTemplateOverrides(ANCLORA_PROFILE);

function buildProject() {
  return createProjectRecord('brand-user', {
    title: 'Libro con marca',
    importedDocument: {
      title: 'Libro con marca',
      subtitle: 'Subtítulo',
      author: 'Autora de Prueba',
      chapterTitle: 'Capítulo 1',
      blocks: [
        { type: 'heading' as const, content: '<h1>Capítulo 1</h1>' },
        { type: 'paragraph' as const, content: 'Texto del primer capítulo.' },
        { type: 'quote' as const, content: '<blockquote><p>Una cita memorable.</p></blockquote>' },
      ],
      sourceFileName: 'libro.docx',
      sourceMimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    },
  });
}

describe('brand theme in exports', () => {
  // HTML export renders cover/page images; under full-suite parallel load it
  // can exceed the 5s default timeout.
  const EXPORT_TIMEOUT = 30_000;

  it('HTML export carries the four palette hexes in their roles and both families', { timeout: EXPORT_TIMEOUT }, async () => {
    const html = await renderProjectExportHtml(
      buildProject(),
      DEVICE_PAGINATION_CONFIGS.laptop,
      OVERRIDES,
    );

    // Ink: headings + body text.
    expect(html).toContain('.export-content-inner h1');
    expect(html).toMatch(/h6 \{ color: #0F172A; \}/);
    expect(html).toContain('.export-content-page .export-content-inner p, .export-content-page .export-content-inner li { color: #0F172A; }');
    // Paper: content page background.
    expect(html).toContain('.export-content-page { background-color: #F8FAFC; }');
    // Accent + muted accent: quote border and text.
    expect(html).toContain('.export-content-inner blockquote { border-left-color: #F59E0B; }');
    expect(html).toContain('.export-content-inner blockquote { color: #D97706; }');
    // Typographic pair.
    expect(html).toContain("font-family: 'Libre Baskerville', Georgia, serif");
    expect(html).toContain("font-family: 'Inter', system-ui");
  });

  it('HTML export without overrides keeps the base stylesheet (no brand rules)', { timeout: EXPORT_TIMEOUT }, async () => {
    const html = await renderProjectExportHtml(buildProject(), DEVICE_PAGINATION_CONFIGS.laptop);

    expect(html).not.toContain('#0F172A');
    expect(buildBrandExportCss(undefined)).toBe('');
  });

  it('EPUB stylesheet carries the four hexes, the display family on headings and the body family', async () => {
    const project = buildProject();
    const composed = composeProjectPreview(project, DEVICE_PAGINATION_CONFIGS.laptop, undefined, {
      tocDepth: 3,
      ...OVERRIDES,
    });
    const buffer = await buildEpub(project, composed, { template: OVERRIDES });
    const zip = await JSZip.loadAsync(buffer);
    const css = await zip.file('OEBPS/styles/epub.css')!.async('string');

    expect(css).toContain("h1, h2, h3 { font-family: 'Libre Baskerville', Georgia, serif; }");
    expect(css).toContain('h1, h2, h3 { color: #0F172A; }');
    expect(css).toContain("body { font-family: 'Inter', 'Liberation Sans', Georgia, serif;");
    expect(css).toContain('body { color: #0F172A; }');
    expect(css).toContain('body { background-color: #F8FAFC; }');
    expect(css).toContain('blockquote { border-left-color: #F59E0B; }');
    expect(css).toContain('caption, figcaption { color: #D97706; }');

    // OCF structure stays valid with the brand theme active.
    expect(await zip.file('mimetype')!.async('string')).toBe('application/epub+zip');
    expect(zip.file('META-INF/container.xml')).toBeTruthy();
    expect(zip.file('OEBPS/content.opf')).toBeTruthy();
    expect(zip.file('OEBPS/nav.xhtml')).toBeTruthy();
  });

  it('EPUB without overrides keeps the base stylesheet', async () => {
    const project = buildProject();
    const composed = composeProjectPreview(project, DEVICE_PAGINATION_CONFIGS.laptop, undefined, {
      tocDepth: 3,
    });
    const buffer = await buildEpub(project, composed);
    const zip = await JSZip.loadAsync(buffer);
    const css = await zip.file('OEBPS/styles/epub.css')!.async('string');

    expect(css).not.toContain('Libre Baskerville');
    expect(css).not.toContain('#0F172A');
  });

  it('PDF theme maps brand families to base-14 fonts and applies palette roles', () => {
    const theme = resolvePdfBrandTheme(OVERRIDES);

    // Libre Baskerville (serif display) → Times; Inter (sans body) → Helvetica.
    expect(theme.headingFont).toBe('Times-Bold');
    expect(theme.quoteFont).toBe('Times-Roman');
    expect(theme.bodyFont).toBe('Helvetica');
    expect(theme.headingColor).toBe('#0F172A');
    expect(theme.bodyColor).toBe('#0F172A');
    expect(theme.accentColor).toBe('#F59E0B');
    expect(theme.mutedColor).toBe('#D97706');
  });

  it('PDF theme without overrides keeps the previous defaults', () => {
    const theme = resolvePdfBrandTheme();

    expect(theme.headingFont).toBe('Helvetica-Bold');
    expect(theme.bodyFont).toBe('Helvetica');
    expect(theme.headingColor).toBe('#111827');
    expect(theme.bodyColor).toBe('#2b3442');
    expect(theme.accentColor).toBe('#d4af37');
    expect(theme.mutedColor).toBe('#5f6b7a');
  });
});
