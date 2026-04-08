import { randomUUID } from 'node:crypto';
import type {
  CreateProjectInput,
  ProjectRecord,
  UpdateBackCoverInput,
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

function buildChapterBlocks(
  blocks: Array<{
    type: 'heading' | 'paragraph' | 'quote';
    content: string;
  }>,
) {
  return blocks.map((block, index) => ({
    id: randomUUID(),
    type: block.type,
    order: index + 1,
    content: block.content,
  }));
}

export function createProjectRecord(userId: string, input: CreateProjectInput): ProjectRecord {
  const now = new Date().toISOString();
  const imported = input.importedDocument;
  const documentTitle = imported?.title || input.title;
  const documentSubtitle = imported?.subtitle || 'Documento editorial inicial listo para evolución.';
  const documentAuthor = imported?.author || '';
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
  const chapters =
    imported?.chapters?.length
      ? imported.chapters.map((chapter, chapterIndex) => ({
          id: randomUUID(),
          order: chapterIndex + 1,
          title: chapter.title || `Capítulo ${chapterIndex + 1}`,
          blocks: buildChapterBlocks(chapter.blocks),
        }))
      : [
          {
            id: randomUUID(),
            order: 1,
            title: chapterTitle,
            blocks: buildChapterBlocks(documentBlocks),
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
      author: documentAuthor,
      language: 'es',
      chapters,
      source: imported
        ? {
            fileName: imported.sourceFileName,
            mimeType: imported.sourceMimeType,
            importedAt: now,
            outline: imported.detectedOutline,
          }
        : null,
    },
    cover: {
      id: randomUUID(),
      title: documentTitle,
      subtitle: imported?.subtitle || 'Diseño editorial listo para evolucionar',
      palette: 'obsidian',
      backgroundImageUrl: null,
      thumbnailUrl: null,
      layout: 'centered',
      fontFamily: null,
      accentColor: null,
      renderedImageUrl: null,
      showSubtitle: true,
    },
    backCover: {
      id: randomUUID(),
      title: documentTitle,
      body: documentSubtitle,
      authorBio: '',
      accentColor: null,
      backgroundImageUrl: null,
      renderedImageUrl: null,
    },
    assets: imported
      ? [
          {
            id: randomUUID(),
            kind: 'document',
            usage: 'source-document',
            blobUrl: null,
            fileName: imported.sourceFileName,
            mimeType: imported.sourceMimeType,
            createdAt: now,
          },
        ]
      : [],
  };
}

export function updateProjectDocument(project: ProjectRecord, input: UpdateDocumentInput): ProjectRecord {
  const targetIdx = input.chapterId
    ? project.document.chapters.findIndex((ch) => ch.id === input.chapterId)
    : 0;
  const idx = targetIdx >= 0 ? targetIdx : 0;
  const chapter = project.document.chapters[idx];

  const updatedChapter = {
    ...chapter,
    title: input.chapterTitle,
    blocks: input.blocks.map((block, bIdx) => {
      const existing = chapter.blocks.find((b) => b.id === block.id);
      return {
        id: block.id || randomUUID(),
        content: block.content,
        type: existing?.type || (bIdx === 0 && block.content.trimStart().startsWith('<h') ? 'heading' : 'text'),
        order: bIdx,
      };
    }),
  };

  const updatedChapters = project.document.chapters.map((ch, i) =>
    i === idx ? updatedChapter : ch,
  );

  return {
    ...project,
    title: input.title,
    updatedAt: new Date().toISOString(),
    document: {
      ...project.document,
      title: input.title,
      subtitle: input.subtitle,
      author: input.author,
      chapters: updatedChapters,
    },
    cover: {
      ...project.cover,
      title: input.title,
      subtitle: input.subtitle,
    },
    backCover: {
      ...project.backCover,
      title: input.title,
      body: input.subtitle,
    },
  };
}

export function moveProjectChapter(
  project: ProjectRecord,
  chapterId: string,
  direction: 'up' | 'down',
): ProjectRecord {
  const currentIndex = project.document.chapters.findIndex((chapter) => chapter.id === chapterId);
  if (currentIndex < 0) return project;

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= project.document.chapters.length) return project;

  const chapters = [...project.document.chapters];
  const [chapter] = chapters.splice(currentIndex, 1);
  chapters.splice(targetIndex, 0, chapter);

  return {
    ...project,
    updatedAt: new Date().toISOString(),
    document: {
      ...project.document,
      chapters: chapters.map((item, index) => ({
        ...item,
        order: index + 1,
      })),
    },
  };
}

export function addProjectChapter(
  project: ProjectRecord,
  title: string,
  position?: 'before' | 'after',
  targetChapterId?: string,
): ProjectRecord {
  const newChapterId = randomUUID();
  const newBlockId = randomUUID();
  const chapters = [...project.document.chapters];

  let insertIndex = chapters.length;

  // Determine insertion position
  if (position && targetChapterId) {
    const targetIndex = chapters.findIndex((ch) => ch.id === targetChapterId);
    if (targetIndex >= 0) {
      insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
    }
  }

  const newChapter = {
    id: newChapterId,
    order: insertIndex + 1,
    title: title || `Capítulo ${chapters.length + 1}`,
    blocks: [
      {
        id: randomUUID(),
        type: 'heading' as const,
        order: 1,
        content: title || `Capítulo ${chapters.length + 1}`,
      },
      {
        id: newBlockId,
        type: 'paragraph' as const,
        order: 2,
        content: '',
      },
    ],
  };

  chapters.splice(insertIndex, 0, newChapter);

  return {
    ...project,
    updatedAt: new Date().toISOString(),
    document: {
      ...project.document,
      chapters: chapters.map((chapter, index) => ({
        ...chapter,
        order: index + 1,
      })),
    },
  };
}

export function deleteProjectChapter(project: ProjectRecord, chapterId: string): ProjectRecord {
  if (project.document.chapters.length <= 1) {
    return project;
  }

  const chapters = project.document.chapters.filter((chapter) => chapter.id !== chapterId);
  if (chapters.length === project.document.chapters.length) {
    return project;
  }

  return {
    ...project,
    updatedAt: new Date().toISOString(),
    document: {
      ...project.document,
      chapters: chapters.map((chapter, index) => ({
        ...chapter,
        order: index + 1,
      })),
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

export function updateProjectBackCover(
  project: ProjectRecord,
  input: UpdateBackCoverInput,
): ProjectRecord {
  return {
    ...project,
    updatedAt: new Date().toISOString(),
    backCover: {
      ...project.backCover,
      title: input.title,
      body: input.body,
      authorBio: input.authorBio,
      accentColor: input.accentColor,
      backgroundImageUrl: input.backgroundImageUrl,
    },
  };
}
