import { beforeEach, describe, expect, test, vi } from 'vitest';

describe('document import parser isolation', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test('docx import does not load the pdf parser', async () => {
    vi.doMock('server-only', () => ({}));
    vi.doMock('pdf-parse', () => {
      throw new Error('pdf parser should not load for docx imports');
    });

    const getBody = vi.fn(() => 'Titulo\n\nSubtitulo\n\nParrafo 1');
    const extract = vi.fn(async () => ({ getBody }));
    class WordExtractorMock {
      extract = extract;
    }

    vi.doMock('word-extractor', () => ({
      default: WordExtractorMock,
    }));

    const { extractImportedDocumentSeed } = await import('./import');
    const file = new File(
      [new Uint8Array([0x50, 0x4b, 0x03, 0x04])],
      'demo.docx',
      {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
    );

    const result = await extractImportedDocumentSeed(file);

    expect(extract).toHaveBeenCalledTimes(1);
    expect(result.title).toBe('Titulo');
    expect(result.blocks.length).toBeGreaterThan(0);
  });
});
