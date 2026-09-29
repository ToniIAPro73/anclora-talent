import { describe, expect, it, vi } from 'vitest';
import fs from 'fs';

vi.mock('server-only', () => ({}));
import { findLibreOfficeBinary, normalizeDocToDocx } from './doc-normalizer';
import { extractOriginalDocumentStyleProfile } from './docx-styles';
import { extractImportedDocumentSeed } from './import';

describe('doc-normalizer and legacy .doc fidelity pipeline', () => {
  const sampleDocPath = '/Users/toni/Downloads/ANCLORA_TALENT_MANUSCRIPT_EXTENDED.doc';
  const hasSampleDoc = fs.existsSync(sampleDocPath);

  it('detects LibreOffice binary if installed without throwing', () => {
    const binary = findLibreOfficeBinary();
    // In our test environment LibreOffice is installed
    if (process.platform === 'darwin' && fs.existsSync('/Applications/LibreOffice.app')) {
      expect(binary).toBe('/Applications/LibreOffice.app/Contents/MacOS/soffice');
    }
  });

  it('normalizes legacy .doc to docx preserving styles, tables, and images', async () => {
    if (!hasSampleDoc) {
      console.warn('Sample .doc not found at', sampleDocPath);
      return;
    }

    const docBuffer = fs.readFileSync(sampleDocPath);
    const normalized = await normalizeDocToDocx(docBuffer);

    expect(normalized).not.toBeNull();
    expect(normalized!.source).toBe('libreoffice');
    expect(normalized!.docxBuffer.length).toBeGreaterThan(10000);

    // Verify style extraction
    const styles = await extractOriginalDocumentStyleProfile(normalized!.docxBuffer);
    expect(styles.body.fontFamily).toContain('Liberation Serif');
    expect(styles.body.textAlign).toBe('justify');
    expect(styles.body.fontSizePt).toBeCloseTo(11.5, 0.5);
    expect(styles.headings?.h1?.fontFamily).toContain('Calibri');
    expect(styles.headings?.h1?.color).toBe('#1F3945');

    // Verify seed and chapter extraction
    const file = new File([new Uint8Array(normalized!.docxBuffer)], 'ANCLORA_TALENT_MANUSCRIPT_EXTENDED.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const seed = await extractImportedDocumentSeed(file);

    expect(seed.chapters).toBeDefined();
    expect(seed.chapters!.length).toBeGreaterThanOrEqual(11);

    // Verify Table 1 presence in chapters
    const allHtml = seed.chapters!.flatMap((c) => c.blocks.map((b) => b.content)).join('\n');
    expect(allHtml).toContain('<table>');
    expect(allHtml).toContain('Tipo');
    expect(allHtml).toContain('Respuesta útil');

    // Verify Table 2 presence
    expect(allHtml).toContain('Alternativa');
    expect(allHtml).toContain('Reversibilidad');

    // Verify Image presence
    expect(allHtml).toContain('<img');
    expect(allHtml).toContain('data:image/png;base64');

    // Verify section headings
    const titles = seed.chapters!.map((c) => c.title);
    expect(titles.some((t) => /conceptos operativos/i.test(t))).toBe(true);
    expect(titles.some((t) => /bibliograf[ií]a/i.test(t))).toBe(true);
    expect(titles.some((t) => /protocolo de treinta d[íi]as/i.test(t))).toBe(true);
  }, 25000);

  it('pure JS parseDocDirectly extracts tables, images, and styleProfile without LibreOffice', async () => {
    if (!hasSampleDoc) return;

    const { parseDocDirectly } = await import('./doc-normalizer');
    const docBuffer = fs.readFileSync(sampleDocPath);
    const direct = await parseDocDirectly(docBuffer);

    expect(direct).toBeDefined();
    expect(direct.text.length).toBeGreaterThan(1000);
    expect(direct.html).toContain('<table>');
    expect(direct.html).toContain('Tipo');
    expect(direct.html).toContain('Alternativa');
    expect(direct.html).toContain('<img');
    expect(direct.html).toContain('data:image/png;base64');
    expect(direct.styleProfile.body.fontFamily).toContain('Liberation Serif');
    expect(direct.styleProfile.body.textAlign).toBe('justify');
    expect(direct.styleProfile.headings?.h1?.fontFamily).toBe('Calibri');
  });

  it('reconciles canonical 15-section structure and effective typography for extended .doc', async () => {
    if (!hasSampleDoc) return;

    const { parseDocDirectly } = await import('./doc-normalizer');
    const { buildImportedDocumentSeed } = await import('./import-pipeline');
    const { buildFontFamilyStack } = await import('@/lib/style-engine/font-stack');
    const { createProjectRecord } = await import('./factories');

    const docBuffer = fs.readFileSync(sampleDocPath);
    const direct = await parseDocDirectly(docBuffer);

    // Font stack check
    expect(direct.styleProfile.body.fontFamily).toBe('Liberation Serif');
    expect(direct.styleProfile.body.fontFamily).not.toContain(';');
    const fontStack = buildFontFamilyStack(direct.styleProfile.body.fontFamily);
    expect(fontStack).toBe('"Liberation Serif", "Times New Roman", Times, serif');

    const seed = buildImportedDocumentSeed({
      fileName: 'ANCLORA_TALENT_MANUSCRIPT_EXTENDED.doc',
      mimeType: 'application/msword',
      text: direct.text,
      html: direct.html,
      sourcePageCount: direct.pageCount,
    });

    expect(seed.chapters).toBeDefined();
    // Exactly 15 top-level sections
    expect(seed.chapters!.length).toBe(15);

    // Exactly 7 numbered chapters (1 to 7)
    const numberedChapters = seed.chapters!.filter((c) => c.chapterNumber != null);
    expect(numberedChapters.length).toBe(7);
    expect(numberedChapters.map((c) => c.chapterNumber)).toEqual([1, 2, 3, 4, 5, 6, 7]);

    // Exactly 8 unnumbered structural sections
    const unnumberedSections = seed.chapters!.filter((c) => c.chapterNumber == null);
    expect(unnumberedSections.length).toBe(8);
    expect(unnumberedSections.map((c) => c.semanticType)).toEqual([
      'front-matter',
      'toc',
      'prologue',
      'introduction',
      'epilogue',
      'appendix',
      'glossary',
      'bibliography',
    ]);

    // Structure model contains 15 entries
    expect(seed.structureModel).toBeDefined();
    expect(seed.structureModel!.length).toBe(15);

    // Project factory check
    const project = createProjectRecord('test-user', {
      title: 'QA DOC Import — Canonical Structure',
      importedDocument: seed,
      originalDocumentStyleProfile: direct.styleProfile,
    });

    expect(project.document.chapters.length).toBe(15);
    expect(project.document.metadata?.structureModel?.length).toBe(15);
    expect(project.document.chapters[4].chapterNumber).toBe(1);
    expect(project.document.chapters[5].chapterNumber).toBe(2);
    expect(project.document.chapters[10].chapterNumber).toBe(7);
    expect(project.document.chapters[3].chapterNumber).toBeNull();
    expect(project.document.chapters[3].semanticType).toBe('introduction');
  });
});
