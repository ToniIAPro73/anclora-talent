import type { EditorialProject } from './types';

export const mockEditorialProject: EditorialProject = {
  id: 'project-anclora-studio',
  title: 'Anclora Studio MVP Sample',
  slug: 'anclora-studio-mvp-sample',
  status: 'active',
  themeId: 'editorial-sand',
  coverTemplate: 'essay-premium',
  document: {
    id: 'document-anclora-studio',
    title: 'Capítulo 1: Anatomía de un manuscrito listo para edición',
    subtitle: 'Muestra editorial para validar el circuito editor-preview',
    language: 'es',
    authors: ['Anclora Labs'],
    assets: [
      {
        id: 'asset-cover-reference',
        kind: 'image',
        source:
          'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=80',
        alt: 'Pila de libros sobre una mesa de trabajo editorial',
        width: 1200,
        height: 800,
      },
    ],
    chapters: [
      {
        id: 'chapter-01',
        title: 'Capítulo 1',
        order: 1,
        blocks: [
          {
            id: 'block-heading-01',
            type: 'heading',
            level: 1,
            content: 'Capítulo 1',
          },
          {
            id: 'block-paragraph-01',
            type: 'paragraph',
            content:
              'Capítulo 1 abre la primera muestra del MVP con un texto editable que debe reflejarse en preview sin ninguna capa intermedia duplicada.',
          },
          {
            id: 'block-paragraph-02',
            type: 'paragraph',
            content:
              'La prioridad no es añadir herramientas de formato infinitas, sino demostrar que el núcleo editorial ya puede sostener ingestión, edición y salida sobre un mismo contrato.',
          },
          {
            id: 'block-image-01',
            type: 'image',
            assetId: 'asset-cover-reference',
            caption: 'Referencia visual inicial para portada y materiales promocionales.',
          },
          {
            id: 'block-quote-01',
            type: 'quote',
            content:
              'Un editor sólido no nace de una pantalla bonita, sino de una estructura de contenido que sobreviva a importación, preview y export.',
            attribution: 'Principio editorial del MVP',
          },
        ],
      },
    ],
  },
};
