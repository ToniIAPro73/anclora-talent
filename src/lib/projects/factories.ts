import { randomUUID } from 'node:crypto';
import type {
  CreateProjectInput,
  ProjectRecord,
  UpdateCoverInput,
  UpdateDocumentInput,
} from './types';

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function createProjectRecord(userId: string, input: CreateProjectInput): ProjectRecord {
  const now = new Date().toISOString();

  return {
    id: randomUUID(),
    userId,
    workspaceId: null,
    slug: slugify(input.title),
    title: input.title,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    document: {
      id: randomUUID(),
      title: input.title,
      subtitle: 'Documento editorial inicial listo para evolución.',
      language: 'es',
      chapters: [
        {
          id: randomUUID(),
          order: 1,
          title: 'Capítulo 1',
          blocks: [
            {
              id: randomUUID(),
              type: 'heading',
              order: 1,
              content: 'Capítulo 1',
            },
            {
              id: randomUUID(),
              type: 'paragraph',
              order: 2,
              content:
                'Esta primera versión del proyecto valida el circuito completo entre autenticación, persistencia y edición semántica.',
            },
            {
              id: randomUUID(),
              type: 'paragraph',
              order: 3,
              content:
                'El siguiente paso operativo es sustituir este contenido inicial por material importado por el usuario sin cambiar el modelo editorial.',
            },
            {
              id: randomUUID(),
              type: 'quote',
              order: 4,
              content:
                'Una plataforma editorial real no separa el editor del preview; comparte la misma verdad de contenido.',
            },
          ],
        },
      ],
    },
    cover: {
      id: randomUUID(),
      title: input.title,
      subtitle: 'Diseño editorial listo para evolucionar',
      palette: 'obsidian',
      backgroundImageUrl: null,
      thumbnailUrl: null,
    },
  };
}

export function updateProjectDocument(project: ProjectRecord, input: UpdateDocumentInput): ProjectRecord {
  const [chapter] = project.document.chapters;

  return {
    ...project,
    title: input.title,
    updatedAt: new Date().toISOString(),
    document: {
      ...project.document,
      title: input.title,
      subtitle: input.subtitle,
      chapters: [
        {
          ...chapter,
          title: input.chapterTitle,
          blocks: chapter.blocks.map((block) => {
            const incoming = input.blocks.find((item) => item.id === block.id);
            return incoming ? { ...block, content: incoming.content } : block;
          }),
        },
      ],
    },
    cover: {
      ...project.cover,
      title: input.title,
    },
  };
}

export function updateProjectCover(project: ProjectRecord, input: UpdateCoverInput): ProjectRecord {
  return {
    ...project,
    updatedAt: new Date().toISOString(),
    cover: {
      ...project.cover,
      ...input,
    },
  };
}
