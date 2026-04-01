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
  const imported = input.importedDocument;
  const documentTitle = imported?.title || input.title;
  const documentSubtitle = imported?.subtitle || 'Documento editorial inicial listo para evolución.';
  const chapterTitle = imported?.chapterTitle || 'Capítulo 1';
  const documentBlocks =
    imported?.blocks ?? [
      {
        type: 'heading' as const,
        content: 'Capítulo 1',
      },
      {
        type: 'paragraph' as const,
        content:
          'Esta primera versión del proyecto valida el circuito completo entre autenticación, persistencia y edición semántica.',
      },
      {
        type: 'paragraph' as const,
        content:
          'El siguiente paso operativo es sustituir este contenido inicial por material importado por el usuario sin cambiar el modelo editorial.',
      },
      {
        type: 'quote' as const,
        content:
          'Una plataforma editorial real no separa el editor del preview; comparte la misma verdad de contenido.',
      },
    ];

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
      title: documentTitle,
      subtitle: documentSubtitle,
      language: 'es',
      chapters: [
        {
          id: randomUUID(),
          order: 1,
          title: chapterTitle,
          blocks: documentBlocks.map((block, index) => ({
            id: randomUUID(),
            type: block.type,
            order: index + 1,
            content: block.content,
          })),
        },
      ],
    },
    cover: {
      id: randomUUID(),
      title: documentTitle,
      subtitle: imported?.subtitle || 'Diseño editorial listo para evolucionar',
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
