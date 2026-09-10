import { createProjectRecord } from '@/lib/projects/factories';
import type { ProjectRecord } from '@/lib/projects/types';

export type ExportAcceptanceVariant = 'empty' | 'populated';

const TINY_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WnR6i4AAAAASUVORK5CYII=';

/** Synthetic, deterministic-in-content corpus. Never points at user data. */
export function createExportAcceptanceProject(
  variant: ExportAcceptanceVariant = 'populated',
): ProjectRecord {
  const project = createProjectRecord('export-acceptance-user', {
    title: 'Corpus editorial ES / EN',
    importedDocument: {
      title: 'Corpus editorial ES / EN',
      subtitle: 'Fixture de integridad documental',
      author: 'Autora de prueba',
      chapterTitle: 'Capítulo duplicado',
      blocks: [
        { type: 'heading', content: '<h1>Capítulo duplicado</h1>' },
        {
          type: 'paragraph',
          content:
            '<p>Texto español: acción, corazón y ñandú. English text: editable manuscript.</p>',
        },
        {
          type: 'paragraph',
          content:
            '<ul><li><strong>Énfasis</strong> y <a href="https://example.test">enlace</a></li><li>Segundo elemento</li></ul>',
        },
        {
          type: 'paragraph',
          content:
            `<p><img src="${TINY_PNG_DATA_URL}" alt="Imagen de prueba" /></p>`,
        },
      ],
      chapters: [
        {
          title: 'Capítulo duplicado',
          blocks: [
            { type: 'heading', content: '<h1>Capítulo duplicado</h1>' },
            {
              type: 'paragraph',
              content:
                '<p>Contenido del primer capítulo: acción, corazón y ñandú. English text.</p>',
            },
            {
              type: 'paragraph',
              content:
                '<ul><li><strong>Énfasis</strong> y <a href="https://example.test">enlace</a></li><li>Segundo elemento</li></ul>',
            },
            {
              type: 'paragraph',
              content: `<p><img src="${TINY_PNG_DATA_URL}" alt="Imagen de prueba" /></p>`,
            },
          ],
        },
        {
          title: 'Capítulo duplicado',
          blocks: [
            { type: 'heading', content: '<h1>Capítulo duplicado</h1>' },
            { type: 'paragraph', content: '<p>Contenido del segundo capítulo.</p>' },
          ],
        },
      ],
      sourceFileName: 'export-acceptance-corpus.docx',
      sourceMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    },
  });

  project.cover.renderedImageUrl = TINY_PNG_DATA_URL;
  project.backCover.renderedImageUrl = TINY_PNG_DATA_URL;
  project.backCover.body = '<p>Contraportada de prueba.</p>';
  project.backCover.authorBio = 'Biografía de prueba.';

  if (variant === 'empty') {
    project.document.chapters = [];
  }

  return project;
}
