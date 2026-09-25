/**
 * @vitest-environment node
 */
import { describe, expect, test } from 'vitest';
import JSZip from 'jszip';
import { createProjectRecord } from './factories';
import {
  buildProjectDocxBuffer,
  buildProjectPdf,
  renderProjectExportHtml,
  resolvePdfBrandTheme,
  buildCompiledDocumentCss,
} from './export-builder';
import { buildEpub } from '@/lib/epub/epub-writer';
import { composeProjectPreview } from '@/lib/compose/preview-adapter';
import { DEVICE_PAGINATION_CONFIGS } from '@/lib/preview/device-configs';
import { resolveDocumentStyles } from '@/lib/style-engine/cascade-resolver';
import type { ReferenceEditorialProfile } from '@/lib/reference-editorial-profile/model';

function makeTestReferenceProfile(): ReferenceEditorialProfile {
  return {
    version: 1,
    extractedAt: '2026-09-25T00:00:00.000Z',
    page: {
      width: 432,
      height: 648,
      margins: { top: 36, bottom: 36, left: 36, right: 36, gutter: 0 },
      columns: 1,
      gutter: 0,
      runningHeaders: true,
      facingPages: false,
    },
    body: {
      fontFamily: 'Noto Serif',
      resolvedFontFamily: 'Noto Serif',
      fontSize: 11.5,
      lineHeight: 1.5,
      color: '#222222',
      textAlign: 'justify',
      fontWeight: 'normal',
      fontStyle: 'normal',
      paragraphSpacingAfter: 6,
    },
    headings: {
      h1: {
        fontFamily: 'Cinzel',
        resolvedFontFamily: 'Cinzel',
        fontSize: 24,
        lineHeight: 1.2,
        color: '#111827',
        textAlign: 'center',
        fontWeight: 'bold',
        fontStyle: 'normal',
      },
      h2: {
        fontFamily: 'Cinzel',
        resolvedFontFamily: 'Cinzel',
        fontSize: 18,
        lineHeight: 1.25,
        color: '#1F2937',
        textAlign: 'left',
        fontWeight: 'bold',
        fontStyle: 'normal',
      },
      h3: {
        fontFamily: 'Cinzel',
        resolvedFontFamily: 'Cinzel',
        fontSize: 14,
        lineHeight: 1.3,
        color: '#374151',
        textAlign: 'left',
        fontWeight: 'semibold',
        fontStyle: 'normal',
      },
    },
    chapterOpening: {
      detected: true,
      hasDropCap: false,
      titleStyle: {
        fontFamily: 'Cinzel',
        resolvedFontFamily: 'Cinzel',
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
      },
    },
    quote: {
      fontFamily: 'Noto Serif',
      resolvedFontFamily: 'Noto Serif',
      fontSize: 10.5,
      fontStyle: 'italic',
      color: '#4B5563',
    },
    lists: {
      unordered: { style: 'bullet', spacing: 4 },
      ordered: { style: 'decimal', spacing: 4 },
    },
    tables: {
      headerStyle: { fontWeight: 'bold' },
      cellPadding: 4,
      borders: 'horizontal',
    },
    footnotes: {
      numbering: 'arabic',
      placement: 'bottom-of-page',
    },
    header: {
      enabled: true,
      style: { fontSize: 8.5, textAlign: 'center' },
    },
    footer: {
      enabled: true,
      style: { fontSize: 8.5, textAlign: 'center' },
    },
    pageNumber: {
      enabled: true,
      alignment: 'center',
      format: 'arabic',
    },
    toc: {
      leaderStyle: 'dots',
      alignment: 'right',
    },
  };
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
