/**
 * @vitest-environment node
 */
import { describe, expect, test } from 'vitest';
import JSZip from 'jszip';
import { createProjectRecord } from './factories';
import {
  buildProjectDocxBuffer,
  renderProjectExportHtml,
  resolvePdfBrandTheme,
  buildCompiledDocumentCss,
} from './export-builder';
import { buildEpub } from '@/lib/epub/epub-writer';
import { composeProjectPreview } from '@/lib/compose/preview-adapter';
import { DEVICE_PAGINATION_CONFIGS } from '@/lib/preview/device-configs';
import { resolveDocumentStyles } from '@/lib/style-engine/cascade-resolver';
import {
  createDefaultReferenceEditorialProfile,
  type ReferenceEditorialProfile,
} from '@/lib/reference-editorial-profile/model';

function makeTestReferenceProfile(): ReferenceEditorialProfile {
  const base = createDefaultReferenceEditorialProfile();
  return createDefaultReferenceEditorialProfile({
    body: {
      ...base.body,
      fontFamily: 'Noto Serif',
      resolvedFontFamily: 'Noto Serif',
      fontSize: 11.5,
      color: '#222222',
      textAlign: 'justify',
    },
    headings: {
      h1: {
        ...base.body,
        fontFamily: 'Cinzel',
        resolvedFontFamily: 'Cinzel',
        fontSize: 24,
        lineHeight: 1.2,
        color: '#111827',
        textAlign: 'center',
        fontWeight: 'bold',
      },
      h2: {
        ...base.body,
        fontFamily: 'Cinzel',
        resolvedFontFamily: 'Cinzel',
        fontSize: 18,
        lineHeight: 1.25,
        color: '#1F2937',
        textAlign: 'left',
        fontWeight: 'bold',
      },
      h3: {
        ...base.body,
        fontFamily: 'Cinzel',
        resolvedFontFamily: 'Cinzel',
        fontSize: 14,
        lineHeight: 1.3,
        color: '#374151',
        textAlign: 'left',
        fontWeight: 'semibold',
      },
      h4: null,
    },
    header: { enabled: true, position: 'top', style: null, alignment: 'center' },
    footer: { enabled: true, position: 'bottom', style: null, alignment: 'center' },
  });
}

describe('Export Pipeline Style Unification (Phase 8)', () => {
  test('P8-T01: PDF theme resolves exact styles from DocumentStyleMap', () => {
    const profile = makeTestReferenceProfile();
    const styleMap = resolveDocumentStyles({
      referenceProfile: profile,
    });

    const theme = resolvePdfBrandTheme(undefined, profile, styleMap);
    expect(theme.heading1Size).toBe(24);
    expect(theme.heading2Size).toBe(18);
    expect(theme.bodySize).toBe(11.5);
    expect(theme.bodyColor).toBe('#222222');
    expect(theme.headingColor).toBe('#111827');
  });

  test('P8-T02: HTML export injects compiled CSS styles matching DocumentStyleMap', async () => {
    const project = createProjectRecord('user-export-test', { title: 'Pipeline Test Project' });
    project.document.metadata = {
      referenceEditorialProfile: makeTestReferenceProfile(),
    };

    const styleMap = resolveDocumentStyles({
      referenceProfile: project.document.metadata.referenceEditorialProfile,
    });

    const compiledCss = buildCompiledDocumentCss(styleMap);
    expect(compiledCss).toContain("font-family: 'Noto Serif', Georgia, serif");
    expect(compiledCss).toContain("font-family: 'Cinzel', Georgia, serif");
    expect(compiledCss).toContain('font-size: 24pt');

    const html = await renderProjectExportHtml(project);
    expect(html).toContain('Cinzel');
    expect(html).toContain('Noto Serif');
  });

  test('P8-T02: EPUB stylesheet incorporates compiled style map rules', async () => {
    const project = createProjectRecord('user-epub-test', { title: 'EPUB Styled Project' });
    const profile = makeTestReferenceProfile();
    project.document.metadata = {
      referenceEditorialProfile: profile,
    };

    const composed = composeProjectPreview(project, DEVICE_PAGINATION_CONFIGS.laptop);
    const epubBuffer = await buildEpub(project, composed, {
      referenceProfile: profile,
    });

    const zip = await JSZip.loadAsync(epubBuffer);
    const cssContent = await zip.file('OEBPS/styles/epub.css')?.async('text');
    expect(cssContent).toBeDefined();
    expect(cssContent).toContain("'Cinzel'");
    expect(cssContent).toContain("'Noto Serif'");
    expect(cssContent).toContain('24pt');
  });

  test('P8-T02: DOCX export generates valid buffer reflecting custom styles', async () => {
    const project = createProjectRecord('user-docx-test', { title: 'DOCX Styled Project' });
    project.document.metadata = {
      referenceEditorialProfile: makeTestReferenceProfile(),
    };

    const docxBuffer = await buildProjectDocxBuffer(project);
    expect(docxBuffer).toBeInstanceOf(Buffer);
    expect(docxBuffer.byteLength).toBeGreaterThan(1000);

    const zip = await JSZip.loadAsync(docxBuffer);
    const documentXml = await zip.file('word/document.xml')?.async('text');
    expect(documentXml).toBeDefined();
  });
});
