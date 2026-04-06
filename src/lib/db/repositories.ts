import 'server-only';
import { and, asc, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { getDb, hasDatabase } from './index';
import { backCoverDesigns, coverDesigns, documentBlocks, projectAssets, projectDocuments, projects } from './schema';
import { createMockProjectStore } from '@/lib/projects/mock-data';
import {
  createProjectRecord,
  deleteProjectChapter,
  moveProjectChapter,
  updateProjectBackCover,
  updateProjectCover,
  updateProjectDocument,
} from '@/lib/projects/factories';
import type {
  CoverDesign,
  CreateProjectInput,
  DocumentBlock,
  DocumentChapter,
  EditorialMapEntry,
  ProjectRecord,
  ProjectSummary,
  UpdateBackCoverInput,
  UpdateCoverInput,
  UpdateDocumentInput,
} from '@/lib/projects/types';

type MemoryStore = Map<string, ProjectRecord>;

declare global {
  var __ancloraProjectStore: MemoryStore | undefined;
}

function getMemoryStore() {
  if (!globalThis.__ancloraProjectStore) {
    globalThis.__ancloraProjectStore = createMockProjectStore();
  }

  return globalThis.__ancloraProjectStore;
}

function toSummary(project: ProjectRecord): ProjectSummary {
  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    status: project.status,
    updatedAt: project.updatedAt,
    documentTitle: project.document.title,
    coverPalette: project.cover.palette,
  };
}

export function reconstructChaptersFromBlockRows(
  blockRows: Array<typeof documentBlocks.$inferSelect>,
): DocumentChapter[] {
  const chapterMap = new Map<string, DocumentChapter>();

  const sortedRows = [...blockRows].sort((left, right) => {
    if (left.chapterOrder !== right.chapterOrder) {
      return left.chapterOrder - right.chapterOrder;
    }

    return left.blockOrder - right.blockOrder;
  });

  for (const block of sortedRows) {
    const existing = chapterMap.get(block.chapterId);
    if (existing) {
      existing.blocks.push({
        id: block.id,
        type: block.blockType as ProjectRecord['document']['chapters'][number]['blocks'][number]['type'],
        order: block.blockOrder,
        content: block.content,
      });
      continue;
    }

    chapterMap.set(block.chapterId, {
      id: block.chapterId,
      order: block.chapterOrder,
      title: block.chapterTitle,
      blocks: [
        {
          id: block.id,
          type: block.blockType as ProjectRecord['document']['chapters'][number]['blocks'][number]['type'],
          order: block.blockOrder,
          content: block.content,
        },
      ],
    });
  }

  return Array.from(chapterMap.values()).sort((left, right) => left.order - right.order);
}

function mapRowsToProject(
  projectRow: typeof projects.$inferSelect,
  documentRow: typeof projectDocuments.$inferSelect,
  blockRows: Array<typeof documentBlocks.$inferSelect>,
  coverRow: typeof coverDesigns.$inferSelect,
  backCoverRow: typeof backCoverDesigns.$inferSelect | null,
  assetRows: Array<typeof projectAssets.$inferSelect>,
): ProjectRecord {
  return {
    id: projectRow.id,
    userId: projectRow.userId,
    workspaceId: projectRow.workspaceId,
    slug: projectRow.slug,
    title: projectRow.title,
    status: projectRow.status as ProjectRecord['status'],
    createdAt: projectRow.createdAt.toISOString(),
    updatedAt: projectRow.updatedAt.toISOString(),
    document: {
      id: documentRow.id,
      title: documentRow.title,
      subtitle: documentRow.subtitle,
      author: documentRow.author,
      language: documentRow.language,
      chapters: reconstructChaptersFromBlockRows(blockRows),
      source:
        documentRow.sourceMetadata && typeof documentRow.sourceMetadata === 'object'
          ? {
              fileName: String((documentRow.sourceMetadata as Record<string, unknown>).fileName ?? ''),
              mimeType: String((documentRow.sourceMetadata as Record<string, unknown>).mimeType ?? 'application/octet-stream'),
              importedAt: String((documentRow.sourceMetadata as Record<string, unknown>).importedAt ?? projectRow.createdAt.toISOString()),
              outline: Array.isArray((documentRow.sourceMetadata as Record<string, unknown>).outline)
                ? ((documentRow.sourceMetadata as Record<string, unknown>).outline as EditorialMapEntry[])
                : undefined,
            }
          : null,
    },
    cover: {
      id: coverRow.id,
      title: coverRow.title,
      subtitle: coverRow.subtitle,
      palette: coverRow.palette as CoverDesign['palette'],
      backgroundImageUrl: coverRow.backgroundImageUrl,
      thumbnailUrl: coverRow.thumbnailUrl,
      layout: (coverRow.layout as CoverDesign['layout']) ?? 'centered',
      fontFamily: coverRow.fontFamily,
      accentColor: coverRow.accentColor,
      renderedImageUrl: coverRow.renderedImageUrl,
      showSubtitle: coverRow.showSubtitle ? Boolean(coverRow.showSubtitle) : true,
    },
    backCover: {
      id: backCoverRow?.id ?? randomUUID(),
      title: backCoverRow?.title ?? projectRow.title,
      body: backCoverRow?.body ?? documentRow.subtitle,
      authorBio: backCoverRow?.authorBio ?? '',
      accentColor: backCoverRow?.accentColor ?? null,
      backgroundImageUrl: backCoverRow?.backgroundImageUrl ?? null,
      renderedImageUrl: backCoverRow?.renderedImageUrl ?? null,
    },
    assets: assetRows.map((asset) => ({
      id: asset.id,
      kind: asset.kind as ProjectRecord['assets'][number]['kind'],
      usage: asset.usage as ProjectRecord['assets'][number]['usage'],
      blobUrl: asset.blobUrl || null,
      fileName: asset.alt || 'asset',
      mimeType: 'application/octet-stream',
      createdAt: asset.createdAt.toISOString(),
    })),
  };
}

type ProjectGraphWriter = Pick<ReturnType<typeof getDb>, 'insert' | 'update' | 'delete'>;
type ProjectGraphWriterWithQuery = ReturnType<typeof getDb>;

function toBlockRows(projectDocumentId: string, chapters: DocumentChapter[], timestamp: string) {
  return chapters.flatMap((chapter) =>
    chapter.blocks.map((block: DocumentBlock) => ({
      id: block.id,
      projectDocumentId,
      chapterId: chapter.id,
      chapterOrder: chapter.order,
      chapterTitle: chapter.title,
      blockOrder: block.order,
      blockType: block.type,
      content: block.content,
      createdAt: new Date(timestamp),
    })),
  );
}

export async function persistProjectGraph(db: ProjectGraphWriter, project: ProjectRecord) {
  await db.insert(projects).values({
    id: project.id,
    userId: project.userId,
    workspaceId: project.workspaceId,
    slug: project.slug,
    title: project.title,
    status: project.status,
    createdAt: new Date(project.createdAt),
    updatedAt: new Date(project.updatedAt),
  });

  await db.insert(projectDocuments).values({
    id: project.document.id,
    projectId: project.id,
    title: project.document.title,
    subtitle: project.document.subtitle,
    author: project.document.author,
    language: project.document.language,
    sourceMetadata: project.document.source,
    createdAt: new Date(project.createdAt),
    updatedAt: new Date(project.updatedAt),
  });

  await db.insert(documentBlocks).values(
    toBlockRows(project.document.id, project.document.chapters, project.createdAt),
  );

  await db.insert(coverDesigns).values({
    id: project.cover.id,
    projectId: project.id,
    title: project.cover.title,
    subtitle: project.cover.subtitle,
    palette: project.cover.palette,
    backgroundImageUrl: project.cover.backgroundImageUrl,
    thumbnailUrl: project.cover.thumbnailUrl,
    layout: project.cover.layout,
    fontFamily: project.cover.fontFamily,
    accentColor: project.cover.accentColor,
    renderedImageUrl: project.cover.renderedImageUrl,
    // TODO: Re-enable showSubtitle after database migration is applied
    // showSubtitle: project.cover.showSubtitle ? 1 : 0,
    updatedAt: new Date(project.updatedAt),
  });

  await db.insert(backCoverDesigns).values({
    id: project.backCover.id,
    projectId: project.id,
    title: project.backCover.title,
    body: project.backCover.body,
    authorBio: project.backCover.authorBio,
    accentColor: project.backCover.accentColor,
    backgroundImageUrl: project.backCover.backgroundImageUrl,
    renderedImageUrl: project.backCover.renderedImageUrl,
    updatedAt: new Date(project.updatedAt),
  });

  if (project.assets.length > 0) {
    await db.insert(projectAssets).values(
      project.assets.map((asset) => ({
        id: asset.id,
        projectId: project.id,
        workspaceId: project.workspaceId,
        kind: asset.kind,
        blobUrl: asset.blobUrl ?? '',
        alt: asset.fileName,
        usage: asset.usage,
        createdAt: new Date(asset.createdAt),
      })),
    );
  }
}

export async function persistDocumentUpdate(db: ProjectGraphWriterWithQuery, nextProject: ProjectRecord) {
  await db
    .update(projects)
    .set({
      title: nextProject.title,
      updatedAt: new Date(nextProject.updatedAt),
    })
    .where(eq(projects.id, nextProject.id));

  await db
    .update(projectDocuments)
    .set({
      title: nextProject.document.title,
      subtitle: nextProject.document.subtitle,
      author: nextProject.document.author,
      sourceMetadata: nextProject.document.source,
      updatedAt: new Date(nextProject.updatedAt),
    })
    .where(eq(projectDocuments.projectId, nextProject.id));

  await db.delete(documentBlocks).where(eq(documentBlocks.projectDocumentId, nextProject.document.id));

  await db
    .insert(documentBlocks)
    .values(toBlockRows(nextProject.document.id, nextProject.document.chapters, nextProject.updatedAt));

  await db
    .update(coverDesigns)
    .set({
      title: nextProject.cover.title,
      subtitle: nextProject.cover.subtitle,
      palette: nextProject.cover.palette,
      backgroundImageUrl: nextProject.cover.backgroundImageUrl,
      thumbnailUrl: nextProject.cover.thumbnailUrl,
      layout: nextProject.cover.layout,
      fontFamily: nextProject.cover.fontFamily,
      accentColor: nextProject.cover.accentColor,
      renderedImageUrl: nextProject.cover.renderedImageUrl,
      // TODO: Re-enable showSubtitle after database migration is applied
      // showSubtitle: nextProject.cover.showSubtitle ? 1 : 0,
      updatedAt: new Date(nextProject.updatedAt),
    })
    .where(eq(coverDesigns.projectId, nextProject.id));

  // Check if back cover exists, INSERT if missing (for projects created before back_cover_designs feature)
  const existingBackCover = await db.query.backCoverDesigns.findFirst({
    where: eq(backCoverDesigns.projectId, nextProject.id),
  });

  if (existingBackCover) {
    await db
      .update(backCoverDesigns)
      .set({
        title: nextProject.backCover.title,
        body: nextProject.backCover.body,
        authorBio: nextProject.backCover.authorBio,
        accentColor: nextProject.backCover.accentColor,
        backgroundImageUrl: nextProject.backCover.backgroundImageUrl,
        renderedImageUrl: nextProject.backCover.renderedImageUrl,
        updatedAt: new Date(nextProject.updatedAt),
      })
      .where(eq(backCoverDesigns.projectId, nextProject.id));
  } else {
    // Create new back cover with default values if it doesn't exist
    await db.insert(backCoverDesigns).values({
      id: randomUUID(),
      projectId: nextProject.id,
      title: nextProject.backCover.title,
      body: nextProject.backCover.body,
      authorBio: nextProject.backCover.authorBio,
      accentColor: nextProject.backCover.accentColor,
      backgroundImageUrl: nextProject.backCover.backgroundImageUrl,
      renderedImageUrl: nextProject.backCover.renderedImageUrl,
      updatedAt: new Date(nextProject.updatedAt),
    });
  }
}

async function listProjectsFromDb(userId: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      status: projects.status,
      updatedAt: projects.updatedAt,
      documentTitle: projectDocuments.title,
      coverPalette: coverDesigns.palette,
    })
    .from(projects)
    .innerJoin(projectDocuments, eq(projectDocuments.projectId, projects.id))
    .innerJoin(coverDesigns, eq(coverDesigns.projectId, projects.id))
    .where(eq(projects.userId, userId))
    .orderBy(asc(projects.updatedAt));

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status as ProjectSummary['status'],
    updatedAt: row.updatedAt.toISOString(),
    documentTitle: row.documentTitle,
    coverPalette: row.coverPalette as CoverDesign['palette'],
  }));
}

async function getProjectFromDb(userId: string, projectId: string) {
  const db = getDb();
  console.info('[projectRepository.getProjectById] querying project', { userId, projectId });
  const [projectRow] = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

  if (!projectRow) {
    console.warn('[projectRepository.getProjectById] project row not found', { userId, projectId });
    return null;
  }

  const [documentRow] = await db.select().from(projectDocuments).where(eq(projectDocuments.projectId, projectRow.id));

  if (!documentRow) {
    console.warn('[projectRepository.getProjectById] document row not found', { userId, projectId });
    return null;
  }

  const blockRows = await db
    .select()
    .from(documentBlocks)
    .where(eq(documentBlocks.projectDocumentId, documentRow.id))
    .orderBy(asc(documentBlocks.blockOrder));
  const [coverRow] = await db.select().from(coverDesigns).where(eq(coverDesigns.projectId, projectRow.id));

  // back_cover_designs and project_assets may not exist in older DB schemas.
  // Wrap each in try/catch so a missing table never blocks project reads/deletes.
  const backCoverRow = await db
    .select()
    .from(backCoverDesigns)
    .where(eq(backCoverDesigns.projectId, projectRow.id))
    .then(([row]) => row ?? null)
    .catch((err) => {
      console.warn('[projectRepository.getProjectById] back_cover_designs query failed (schema may need migration)', err?.message);
      return null;
    });

  const assetRows = await db
    .select()
    .from(projectAssets)
    .where(eq(projectAssets.projectId, projectRow.id))
    .orderBy(asc(projectAssets.createdAt))
    .catch((err) => {
      console.warn('[projectRepository.getProjectById] project_assets query failed', err?.message);
      return [] as typeof projectAssets.$inferSelect[];
    });

  if (!coverRow) {
    console.warn('[projectRepository.getProjectById] cover row not found', { userId, projectId });
    return null;
  }

  console.info('[projectRepository.getProjectById] project graph loaded', {
    userId,
    projectId,
    documentId: documentRow.id,
    blocks: blockRows.length,
    coverId: coverRow.id,
  });
  return mapRowsToProject(projectRow, documentRow, blockRows, coverRow, backCoverRow ?? null, assetRows);
}

async function createProjectInDb(userId: string, input: CreateProjectInput) {
  const db = getDb();
  const project = createProjectRecord(userId, input);

  console.info('[projectRepository.createProject] persisting project graph', {
    userId,
    projectId: project.id,
    slug: project.slug,
    hasImportedDocument: Boolean(input.importedDocument),
  });
  await persistProjectGraph(db, project);
  console.info('[projectRepository.createProject] persisted project graph', {
    userId,
    projectId: project.id,
  });

  return project;
}

async function saveDocumentInDb(userId: string, projectId: string, input: UpdateDocumentInput) {
  const db = getDb();
  const current = await getProjectFromDb(userId, projectId);

  if (!current) {
    throw new Error('Project not found');
  }

  const nextProject = updateProjectDocument(current, input);

  await persistDocumentUpdate(db, nextProject);

  return nextProject;
}

async function saveCoverInDb(userId: string, projectId: string, input: UpdateCoverInput) {
  const db = getDb();
  const current = await getProjectFromDb(userId, projectId);

  if (!current) {
    throw new Error('Project not found');
  }

  const nextProject = updateProjectCover(current, input);

  await db
    .update(coverDesigns)
    .set({
      title: nextProject.cover.title,
      subtitle: nextProject.cover.subtitle,
      palette: nextProject.cover.palette,
      backgroundImageUrl: nextProject.cover.backgroundImageUrl,
      thumbnailUrl: nextProject.cover.thumbnailUrl,
      layout: nextProject.cover.layout ?? null,
      fontFamily: nextProject.cover.fontFamily ?? null,
      accentColor: nextProject.cover.accentColor ?? null,
      // TODO: Re-enable showSubtitle after database migration is applied
      // showSubtitle: nextProject.cover.showSubtitle ? 1 : 0,
      updatedAt: new Date(nextProject.updatedAt),
    })
    .where(eq(coverDesigns.projectId, projectId));

  return nextProject;
}

async function saveRenderedCoverUrlInDb(userId: string, projectId: string, renderedImageUrl: string) {
  const db = getDb();
  const current = await getProjectFromDb(userId, projectId);

  if (!current) {
    throw new Error('Project not found');
  }

  await db
    .update(coverDesigns)
    .set({ renderedImageUrl, updatedAt: new Date() })
    .where(eq(coverDesigns.projectId, projectId));

  return { ...current, cover: { ...current.cover, renderedImageUrl } };
}

async function saveRenderedCoverUrlInMemory(userId: string, projectId: string, renderedImageUrl: string) {
  const current = await getProjectFromMemory(userId, projectId);

  if (!current) {
    throw new Error('Project not found');
  }

  const next = { ...current, cover: { ...current.cover, renderedImageUrl } };
  getMemoryStore().set(projectId, next);
  return next;
}

async function saveRenderedBackCoverUrlInDb(userId: string, projectId: string, renderedImageUrl: string) {
  const db = getDb();
  const current = await getProjectFromDb(userId, projectId);

  if (!current) {
    throw new Error('Project not found');
  }

  // Check if back cover exists
  const existing = await db.query.backCoverDesigns.findFirst({
    where: eq(backCoverDesigns.projectId, projectId),
  });

  if (existing) {
    await db
      .update(backCoverDesigns)
      .set({ renderedImageUrl, updatedAt: new Date() })
      .where(eq(backCoverDesigns.projectId, projectId));
  } else {
    // Create new back cover with default values if it doesn't exist
    await db.insert(backCoverDesigns).values({
      id: randomUUID(),
      projectId,
      title: current.backCover.title,
      body: current.backCover.body,
      authorBio: current.backCover.authorBio,
      accentColor: current.backCover.accentColor,
      backgroundImageUrl: current.backCover.backgroundImageUrl,
      renderedImageUrl,
      updatedAt: new Date(),
    });
  }

  return { ...current, backCover: { ...current.backCover, renderedImageUrl } };
}

async function saveRenderedBackCoverUrlInMemory(userId: string, projectId: string, renderedImageUrl: string) {
  const current = await getProjectFromMemory(userId, projectId);

  if (!current) {
    throw new Error('Project not found');
  }

  const next = { ...current, backCover: { ...current.backCover, renderedImageUrl } };
  getMemoryStore().set(projectId, next);
  return next;
}

async function deleteProjectInDb(userId: string, projectId: string) {
  const db = getDb();

  // Verify ownership with a minimal query — avoids SELECT * on cover_designs
  // which would fail if new columns haven't been added via ALTER TABLE yet.
  const [projectRow] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

  if (!projectRow) {
    throw new Error('Project not found');
  }

  // Resolve document id for block deletion
  const [documentRow] = await db
    .select({ id: projectDocuments.id })
    .from(projectDocuments)
    .where(eq(projectDocuments.projectId, projectId));

  await db.delete(coverDesigns).where(eq(coverDesigns.projectId, projectId)).catch((err) => {
    console.warn('[deleteProject] cover_designs delete skipped', err?.message);
  });
  await db.delete(backCoverDesigns).where(eq(backCoverDesigns.projectId, projectId)).catch((err) => {
    console.warn('[deleteProject] back_cover_designs delete skipped', err?.message);
  });
  await db.delete(projectAssets).where(eq(projectAssets.projectId, projectId)).catch((err) => {
    console.warn('[deleteProject] project_assets delete skipped', err?.message);
  });
  if (documentRow) {
    await db.delete(documentBlocks).where(eq(documentBlocks.projectDocumentId, documentRow.id)).catch((err) => {
      console.warn('[deleteProject] document_blocks delete skipped', err?.message);
    });
  }
  await db.delete(projectDocuments).where(eq(projectDocuments.projectId, projectId)).catch((err) => {
    console.warn('[deleteProject] project_documents delete skipped', err?.message);
  });
  await db.delete(projects).where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
}

async function listProjectsFromMemory(userId: string) {
  return Array.from(getMemoryStore().values())
    .filter((project) => project.userId === userId || project.userId === 'demo-user')
    .map((project) => toSummary(project));
}

async function getProjectFromMemory(userId: string, projectId: string) {
  const project = getMemoryStore().get(projectId);

  if (!project) {
    return null;
  }

  if (project.userId !== userId && project.userId !== 'demo-user') {
    return null;
  }

  return project;
}

async function createProjectInMemory(userId: string, input: CreateProjectInput) {
  const project = createProjectRecord(userId, input);
  getMemoryStore().set(project.id, project);
  return project;
}

async function saveDocumentInMemory(userId: string, projectId: string, input: UpdateDocumentInput) {
  const current = await getProjectFromMemory(userId, projectId);

  if (!current) {
    throw new Error('Project not found');
  }

  const nextProject = updateProjectDocument(current, input);
  getMemoryStore().set(nextProject.id, nextProject);
  return nextProject;
}

async function saveCoverInMemory(userId: string, projectId: string, input: UpdateCoverInput) {
  const current = await getProjectFromMemory(userId, projectId);

  if (!current) {
    throw new Error('Project not found');
  }

  const nextProject = updateProjectCover(current, input);
  getMemoryStore().set(nextProject.id, nextProject);
  return nextProject;
}

async function moveChapterInDb(userId: string, projectId: string, chapterId: string, direction: 'up' | 'down') {
  const db = getDb();
  const current = await getProjectFromDb(userId, projectId);

  if (!current) {
    throw new Error('Project not found');
  }

  const nextProject = moveProjectChapter(current, chapterId, direction);
  await persistDocumentUpdate(db, nextProject);
  return nextProject;
}

async function moveChapterInMemory(userId: string, projectId: string, chapterId: string, direction: 'up' | 'down') {
  const current = await getProjectFromMemory(userId, projectId);

  if (!current) {
    throw new Error('Project not found');
  }

  const nextProject = moveProjectChapter(current, chapterId, direction);
  getMemoryStore().set(nextProject.id, nextProject);
  return nextProject;
}

async function deleteChapterInDb(userId: string, projectId: string, chapterId: string) {
  const db = getDb();
  const current = await getProjectFromDb(userId, projectId);

  if (!current) {
    throw new Error('Project not found');
  }

  const nextProject = deleteProjectChapter(current, chapterId);
  await persistDocumentUpdate(db, nextProject);
  return nextProject;
}

async function deleteChapterInMemory(userId: string, projectId: string, chapterId: string) {
  const current = await getProjectFromMemory(userId, projectId);

  if (!current) {
    throw new Error('Project not found');
  }

  const nextProject = deleteProjectChapter(current, chapterId);
  getMemoryStore().set(nextProject.id, nextProject);
  return nextProject;
}

async function deleteProjectInMemory(userId: string, projectId: string) {
  const current = await getProjectFromMemory(userId, projectId);

  if (!current) {
    throw new Error('Project not found');
  }

  getMemoryStore().delete(projectId);
}

async function saveBackCoverInDb(
  userId: string,
  projectId: string,
  input: UpdateBackCoverInput,
) {
  const db = getDb();
  const current = await getProjectFromDb(userId, projectId);

  if (!current) {
    throw new Error('Project not found');
  }

  const nextProject = updateProjectBackCover(current, input);

  // Check if back cover exists
  const existing = await db.query.backCoverDesigns.findFirst({
    where: eq(backCoverDesigns.projectId, projectId),
  });

  if (existing) {
    await db
      .update(backCoverDesigns)
      .set({
        title: nextProject.backCover.title,
        body: nextProject.backCover.body,
        authorBio: nextProject.backCover.authorBio,
        accentColor: nextProject.backCover.accentColor,
        backgroundImageUrl: nextProject.backCover.backgroundImageUrl,
        updatedAt: new Date(nextProject.updatedAt),
      })
      .where(eq(backCoverDesigns.projectId, projectId));
  } else {
    // Create new back cover if it doesn't exist
    await db.insert(backCoverDesigns).values({
      id: randomUUID(),
      projectId,
      title: nextProject.backCover.title,
      body: nextProject.backCover.body,
      authorBio: nextProject.backCover.authorBio,
      accentColor: nextProject.backCover.accentColor,
      backgroundImageUrl: nextProject.backCover.backgroundImageUrl,
      renderedImageUrl: nextProject.backCover.renderedImageUrl,
      updatedAt: new Date(nextProject.updatedAt),
    });
  }

  return nextProject;
}

async function saveBackCoverInMemory(
  userId: string,
  projectId: string,
  input: UpdateBackCoverInput,
) {
  const current = await getProjectFromMemory(userId, projectId);

  if (!current) {
    throw new Error('Project not found');
  }

  const nextProject = updateProjectBackCover(current, input);
  getMemoryStore().set(nextProject.id, nextProject);
  return nextProject;
}

export const projectRepository = {
  listProjectsForUser(userId: string) {
    return hasDatabase() ? listProjectsFromDb(userId) : listProjectsFromMemory(userId);
  },
  getProjectById(userId: string, projectId: string) {
    return hasDatabase() ? getProjectFromDb(userId, projectId) : getProjectFromMemory(userId, projectId);
  },
  createProject(userId: string, input: CreateProjectInput) {
    return hasDatabase() ? createProjectInDb(userId, input) : createProjectInMemory(userId, input);
  },
  saveDocument(userId: string, projectId: string, input: UpdateDocumentInput) {
    return hasDatabase()
      ? saveDocumentInDb(userId, projectId, input)
      : saveDocumentInMemory(userId, projectId, input);
  },
  saveCover(userId: string, projectId: string, input: UpdateCoverInput) {
    return hasDatabase() ? saveCoverInDb(userId, projectId, input) : saveCoverInMemory(userId, projectId, input);
  },
  deleteProject(userId: string, projectId: string) {
    return hasDatabase() ? deleteProjectInDb(userId, projectId) : deleteProjectInMemory(userId, projectId);
  },
  saveBackCover(userId: string, projectId: string, input: UpdateBackCoverInput) {
    return hasDatabase()
      ? saveBackCoverInDb(userId, projectId, input)
      : saveBackCoverInMemory(userId, projectId, input);
  },
  saveRenderedCoverUrl(userId: string, projectId: string, renderedImageUrl: string) {
    return hasDatabase()
      ? saveRenderedCoverUrlInDb(userId, projectId, renderedImageUrl)
      : saveRenderedCoverUrlInMemory(userId, projectId, renderedImageUrl);
  },
  saveRenderedBackCoverUrl(userId: string, projectId: string, renderedImageUrl: string) {
    return hasDatabase()
      ? saveRenderedBackCoverUrlInDb(userId, projectId, renderedImageUrl)
      : saveRenderedBackCoverUrlInMemory(userId, projectId, renderedImageUrl);
  },
  moveChapter(userId: string, projectId: string, chapterId: string, direction: 'up' | 'down') {
    return hasDatabase()
      ? moveChapterInDb(userId, projectId, chapterId, direction)
      : moveChapterInMemory(userId, projectId, chapterId, direction);
  },
  deleteChapter(userId: string, projectId: string, chapterId: string) {
    return hasDatabase()
      ? deleteChapterInDb(userId, projectId, chapterId)
      : deleteChapterInMemory(userId, projectId, chapterId);
  },
};
