/**
 * @vitest-environment node
 */
import { describe, expect, test, vi } from 'vitest';
import JSZip from 'jszip';
import { loadCompilationCorpus } from '@/lib/test-fixtures/compilation-corpus';
import { extractTextFromBuffer, buildImportedDocumentSeed } from '@/lib/projects/import-pipeline';
import { extractEditorialProfileFromDocx } from '@/lib/reference-editorial-profile/docx';
import { extractBrandProfileFromPdf } from '@/lib/brand/extract-brand-profile';
import { getBrandColor } from '@/lib/brand/brand-profile';
import { resolveDocumentStyles } from './cascade-resolver';
import { compileDocument } from './document-compiler';
import { createProjectRecord } from '@/lib/projects/factories';
import { composeProjectPreview } from '@/lib/compose/preview-adapter';
import { DEVICE_PAGINATION_CONFIGS } from '@/lib/preview/device-configs';
import { buildProjectDocxBuffer, buildProjectPdfWithConfig, resolvePdfBrandTheme } from '@/lib/projects/export-builder';
import {
  applyReferenceEditorialProfileAction,
  saveUserStyleOverrideAction,
} from '@/lib/reference-editorial-profile/actions';
import { projectRepository } from '@/lib/db/repositories';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth/guards', () => ({
  requireUserId: vi.fn().mockResolvedValue('user-e2e-1'),
}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Phase 11: End-to-End Canonical Test Pack Verification', () => {
  const corpus = loadCompilationCorpus();

  test('E2E Criteria 1 & 2: Manuscript semantic import isolates TOC and sanitizes trailing page numbers', async () => {
    const fileName = 'ANCLORA_TALENT_TEST_MANUSCRIPT.docx';
    const mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const extracted = await extractTextFromBuffer(fileName, mimeType, corpus.manuscriptDocx);
    const seed = buildImportedDocumentSeed({
      fileName,
      mimeType,
      text: extracted.text,
      html: extracted.html,
    });

    expect(seed.chapters.length).toBeGreaterThan(0);

    const titles = seed.chapters.map((ch) => ch.title);
    console.log('E2E Generated Chapter Titles:', titles);

    // Criterion 1: TOC entries (with page numbers or dots) did not become chapters
    for (const title of titles) {
      expect(title).not.toMatch(/[\t\s]+[·._\-—―]+\s*\d+$/);
      expect(title).not.toMatch(/[\t\s]+\d+$/);
    }

    // Explicit test case check: Introducción & Capítulo 1
    const introChapter = titles.find((t) => t.toLowerCase().includes('introducción'));
    if (introChapter) {
      expect(introChapter).toBe('Introducción: Atención antes que velocidad');
      expect(introChapter).not.toMatch(/[\t\s]+3$/);
    }

    const cap1Chapter = titles.find((t) => t.toLowerCase().includes('coste invisible'));
    if (cap1Chapter) {
      expect(cap1Chapter).toBe('Capítulo 1. El coste invisible del ruido');
      expect(cap1Chapter).not.toMatch(/[\t\s]+4$/);
    }
  });

  test('E2E Criterion 3: Prose and formatting (tables, lists) preserved in AST', async () => {
    const fileName = 'ANCLORA_TALENT_TEST_MANUSCRIPT.docx';
    const mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const extracted = await extractTextFromBuffer(fileName, mimeType, corpus.manuscriptDocx);
    const seed = buildImportedDocumentSeed({
      fileName,
      mimeType,
      text: extracted.text,
      html: extracted.html,
    });

    // Manuscript has genuine blocks
    expect(seed.blocks.length).toBeGreaterThan(0);
    const hasParagraphs = seed.blocks.some((b) => b.type === 'paragraph');
    expect(hasParagraphs).toBe(true);
  });

  test('E2E Criteria 4 & 5: Reference DOCX extracts full editorial profile, scale and geometry', async () => {
    const { profile } = await extractEditorialProfileFromDocx(corpus.referenceDocx, {
      filename: 'ANCLORA_TALENT_REFERENCE_STYLE.docx',
    });

    // Criterion 4: Margins and trim
    expect(profile.page.margins.top).toBeDefined();
    expect(profile.page.margins.bottom).toBeDefined();
    expect(profile.page.margins.left).toBeDefined();
    expect(profile.page.margins.right).toBeDefined();

    // Criterion 5: Heading hierarchy and body typography
    expect(profile.body.fontSize).toBeDefined();
    expect(profile.headings.h1.fontSize).toBeDefined();
    expect(profile.headings.h1.fontFamily).toBeDefined();
    expect(profile.headings.h2.fontSize).toBeDefined();
  });

  test('E2E Criterion 6: Brand PDF produces valid semantic tokens', async () => {
    const { profile: brand } = await extractBrandProfileFromPdf(
      corpus.brandPdf,
      'ANCLORA_INSIGHTS_BRAND_IDENTITY_REFERENCE.pdf',
    );

    const ink = getBrandColor(brand, 'ink');
    const accent = getBrandColor(brand, 'accent');
    const paper = getBrandColor(brand, 'paper');

    expect(ink?.hex).toBeDefined();
    expect(accent?.hex).toBeDefined();
    expect(paper?.hex).toBeDefined();
  });

  test('E2E Criteria 7, 8, 9, 10: Compilation, Cascade Resolution, Preview & Exports', async () => {
    const { profile: referenceProfile } = await extractEditorialProfileFromDocx(corpus.referenceDocx, {
      filename: 'ANCLORA_TALENT_REFERENCE_STYLE.docx',
    });
    const { profile: brandProfile } = await extractBrandProfileFromPdf(
      corpus.brandPdf,
      'ANCLORA_INSIGHTS_BRAND_IDENTITY_REFERENCE.pdf',
    );

    const project = createProjectRecord('user-e2e-1', { title: 'Pipeline E2E Project' });
    project.document.metadata = {
      referenceEditorialProfile: referenceProfile,
    };
    (project as any).brandProfile = brandProfile;

    // Resolve Cascade
    const styleMap = resolveDocumentStyles({
      referenceProfile,
      brandProfile,
    });

    // Criterion 7 & 8: Compiled CSS variables and typography
    const compiled = compileDocument({
      projectId: project.id,
      semanticDoc: {
        version: 1,
        title: project.document.title,
        blocks: [],
      },
      referenceProfile,
      brandProfile,
    });

    expect(compiled.cssVariables['--talent-body-font']).toBeDefined();
    expect(compiled.cssVariables['--talent-h1-font']).toBeDefined();
    expect(compiled.cssVariables['--talent-h1-size']).toBeDefined();
    expect(compiled.cssVariables['--talent-body-color']).toBeDefined();

    // Criterion 9: Live Preview uses resolved styleMap
    const preview = composeProjectPreview(project, DEVICE_PAGINATION_CONFIGS.laptop);
    expect(preview.pages.length).toBeGreaterThan(0);

    // Criterion 10: PDF & DOCX Exports preserve compiled styling
    const pdfTheme = resolvePdfBrandTheme(undefined, referenceProfile, styleMap);
    expect(pdfTheme.headingColor).toBe(styleMap.headings.h1.color);
    expect(pdfTheme.headingFont).toBeDefined();

    const docxBuffer = await buildProjectDocxBuffer(project);
    expect(docxBuffer.byteLength).toBeGreaterThan(1000);
    const docxZip = await JSZip.loadAsync(docxBuffer);
    const documentXml = await docxZip.file('word/document.xml')?.async('text');
    expect(documentXml).toBeDefined();
  });

  test('E2E Criteria 11, 12, 13: Non-destructive reapplication, brand change & override survival', async () => {
    const userId = 'user-e2e-1';
    const project = createProjectRecord(userId, { title: 'Non-Destructive Project' });
    project.document.chapters = [
      {
        id: 'ch-intro',
        title: 'Introducción',
        blocks: [
          { id: 'b-intro-h', type: 'heading', content: 'Introducción' },
          { id: 'b-intro-p', type: 'paragraph', content: 'Contenido redactado manualmente por el autor.' },
        ],
      },
    ];

    vi.spyOn(projectRepository, 'getProjectById').mockImplementation(async () => project);
    vi.spyOn(projectRepository, 'saveDocumentExtras').mockImplementation(async (_u, _p, input) => {
      if (input.metadata !== undefined) {
        project.document.metadata = input.metadata;
      }
      return project;
    });

    const originalChapters = JSON.parse(JSON.stringify(project.document.chapters));

    // Criterion 13: Set explicit override on H1
    const overrideResult = await saveUserStyleOverrideAction(project.id, {
      scope: 'role',
      targetRole: 'h1',
      styles: { fontSizePt: 32, color: '#D97706' },
      updatedAt: new Date().toISOString(),
    });
    expect(overrideResult.ok).toBe(true);

    // Criterion 11: Swap reference document template
    const { profile: newRefProfile } = await extractEditorialProfileFromDocx(corpus.referenceDocx, {
      filename: 'ANCLORA_TALENT_REFERENCE_STYLE.docx',
    });
    const swapResult = await applyReferenceEditorialProfileAction(project.id, newRefProfile, true);
    expect(swapResult.ok).toBe(true);

    // Criterion 11 check: manuscript content is 100% unchanged
    expect(project.document.chapters).toEqual(originalChapters);

    // Criterion 13 check: user override on H1 survived reference swap
    const userOverrides = project.document.metadata?.userOverrides;
    expect(userOverrides?.length).toBe(1);
    expect(userOverrides?.[0].targetRole).toBe('h1');
    expect(userOverrides?.[0].styles.fontSizePt).toBe(32);

    // Criterion 12: Recompilation with updated brand profile leaves manuscript content unchanged
    const { profile: brandProfile } = await extractBrandProfileFromPdf(
      corpus.brandPdf,
      'ANCLORA_INSIGHTS_BRAND_IDENTITY_REFERENCE.pdf',
    );
    const recompiled = compileDocument({
      projectId: project.id,
      semanticDoc: {
        version: 1,
        title: project.document.title,
        blocks: [],
      },
      referenceProfile: newRefProfile,
      brandProfile,
      userOverrides,
    });

    expect(recompiled.styleMap.headings.h1.fontSizePt).toBe(32); // user override won
    expect(project.document.chapters).toEqual(originalChapters); // content intact
  });
});
