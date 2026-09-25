import { describe, expect, it } from 'vitest';
import { loadTestPackBuffers } from '@/lib/test-fixtures/compilation-corpus';
import { extractTextFromBuffer, buildImportedDocumentSeed } from './import-pipeline';

describe('Phase 1 — Manuscript Importer & TOC Sanitization', () => {
  it('imports ANCLORA_TALENT_TEST_MANUSCRIPT.docx with clean chapter titles and without TOC contamination', async () => {
    const { manuscriptDocx } = loadTestPackBuffers();
    const extracted = await extractTextFromBuffer(
      'ANCLORA_TALENT_TEST_MANUSCRIPT.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      manuscriptDocx,
    );

    const seed = buildImportedDocumentSeed({
      fileName: 'ANCLORA_TALENT_TEST_MANUSCRIPT.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      text: extracted.text,
      html: extracted.html,
      sourcePageCount: extracted.pageCount,
    });

    const chapterTitles = seed.chapters.map((ch) => ch.title);

    // 1. None of the titles should have trailing page numbers like "Introducción 3" or "ruido 4"
    for (const title of chapterTitles) {
      expect(title).not.toMatch(/\s+\d+$/);
      expect(title).not.toMatch(/[\t\s]+[·._\-—―]+\s*\d+$/);
    }

    // 2. Exact clean expected titles check
    expect(chapterTitles).toContain('Introducción: Atención antes que velocidad');
    expect(chapterTitles).toContain('Capítulo 1. El coste invisible del ruido');
    expect(chapterTitles).toContain('Capítulo 2. Elegir antes de optimizar');
    expect(chapterTitles).toContain('Capítulo 3. Diseñar un sistema de atención');
    expect(chapterTitles).toContain('Capítulo 4. Decisiones con criterio');
    expect(chapterTitles).toContain('Capítulo 5. Ritmos sostenibles');
    expect(chapterTitles).toContain('Conclusión: Volver a elegir');

    // 3. No TOC lines with trailing page numbers (e.g. "Introducción 3") are present
    expect(chapterTitles.some((t) => /Introducción\s+\d+/.test(t))).toBe(false);
    expect(chapterTitles.some((t) => /ruido\s+4/.test(t))).toBe(false);

    // 4. No duplicate chapters
    const titlesNormalized = chapterTitles.map((t) => t.trim().toLowerCase());
    const uniqueTitles = new Set(titlesNormalized);
    expect(titlesNormalized.length).toBe(uniqueTitles.size);
  });
});
