import { describe, expect, test } from 'vitest';

import type { ProjectRecord } from './types';
import { buildSlidesHtml } from './slides-builder';

function projectWithChapters(): ProjectRecord {
  return {
    title: 'Curso',
    slug: 'curso',
    document: {
      id: 'doc-1',
      title: 'Curso de prueba',
      subtitle: 'Aprende en módulos',
      author: 'Autora',
      language: 'es',
      chapters: [
        {
          id: 'ch-1',
          order: 1,
          title: 'Módulo 1 · Fundamentos',
          blocks: [
            { id: 'b1', type: 'heading', order: 1, content: 'Lección 1.1' },
            { id: 'b2', type: 'paragraph', order: 2, content: 'Contenido de la lección.' },
          ],
        },
        {
          id: 'ch-2',
          order: 2,
          title: 'Módulo 2 <script>',
          blocks: [{ id: 'b3', type: 'paragraph', order: 1, content: '<p>HTML existente</p>' }],
        },
      ],
    },
  } as unknown as ProjectRecord;
}

describe('buildSlidesHtml', () => {
  test('builds a standalone HTML document with a title slide', () => {
    const html = buildSlidesHtml(projectWithChapters());
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('slide slide--title');
    expect(html).toContain('<h1>Curso de prueba</h1>');
    expect(html).toContain('slides-subtitle');
    expect(html).toContain('slides-author');
  });

  test('one slide per chapter with its blocks rendered', () => {
    const html = buildSlidesHtml(projectWithChapters());
    const slideCount = html.match(/<section class="slide">/g)?.length ?? 0;
    expect(slideCount).toBe(2);
    expect(html).toContain('<h1>Módulo 1 · Fundamentos</h1>');
    expect(html).toContain('<h2>Lección 1.1</h2>');
    expect(html).toContain('<p>Contenido de la lección.</p>');
    expect(html).toContain('<p>HTML existente</p>');
  });

  test('escapes the chapter title and document title', () => {
    const html = buildSlidesHtml(projectWithChapters());
    expect(html).toContain('Módulo 2 &lt;script&gt;');
    expect(html).not.toContain('<h1>Módulo 2 <script></h1>');
  });
});
