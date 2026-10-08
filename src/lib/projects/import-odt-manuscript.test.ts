// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { extractImportedDocumentSeed } from '@/lib/projects/import';

const PATH = 'docs/manuscritos/exito-sin-compania.odt';

describe.skipIf(!existsSync(PATH))('real ODT manuscript: exito-sin-compania', () => {
  test('front matter, index hierarchy, drawn rules and rejoined paragraphs', async () => {
    const file = new File([readFileSync(PATH)], 'exito-sin-compania.odt', { type: 'application/vnd.oasis.opendocument.text' });
    const seed = await extractImportedDocumentSeed(file, { ocr: undefined as never });
    const chapters = seed.chapters ?? [];
    const html = (title: string) => (chapters.find((chapter) => chapter.title === title)?.blocks ?? []).map((block) => block.content).join('');

    // The epigraph is its own page before the Índice and no longer sits inside it.
    expect(chapters[0].title).toBe('Prólogo');
    expect(html('Prólogo')).toContain('La soledad no es la ausencia');
    expect(html('Índice')).not.toContain('La soledad no es la ausencia');

    // Parts are level 1, chapters level 2.
    const index = html('Índice');
    expect(index).toMatch(/data-toc-level="1"[^>]*data-toc-page="8"/);
    expect(index).toMatch(/data-toc-level="2"[^>]*data-toc-page="9"/);

    // The brown rules the author drew (empty bordered paragraphs) survive.
    expect(html('Parte I. El diagnóstico')).toContain('data-source-border-bottom-color="#c2622f"');

    // No doubled spaces at run boundaries, sentences split by a page break are one paragraph, and the heading the
    // author started on a new page keeps its page break.
    const one = html('Capítulo Uno. La paradoja del éxito solitario');
    expect(one.replace(/<[^>]+>/g, '')).not.toMatch(/\S {2,}\S/);
    expect(one.replace(/<[^>]+>/g, '')).toContain('lo que mejor sabes hacer');
    const oneBlocks = chapters.find((chapter) => chapter.title.startsWith('Capítulo Uno'))?.blocks ?? [];
    const breakIndex = oneBlocks.findIndex((block) => block.type === 'pageBreak');
    expect(oneBlocks[breakIndex + 1]?.content).toContain('Por qué a nadie le preocupa tu soledad');

    // The closing lines split by a hard return are one paragraph again.
    const last = html(chapters[chapters.length - 1].title);
    expect(last.replace(/<[^>]+>/g, '')).toContain('también lo tiene todo y, sin embargo');
  });
});
