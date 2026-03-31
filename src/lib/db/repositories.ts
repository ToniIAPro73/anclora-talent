import 'server-only';
import { and, asc, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { getDb, hasDatabase } from './index';
import { coverDesigns, documentBlocks, projectDocuments, projects } from './schema';
import { createMockProjectStore } from '@/lib/projects/mock-data';
import {
  createProjectRecord,
  updateProjectCover,
  updateProjectDocument,
} from '@/lib/projects/factories';
import type {
  CoverDesign,
  CreateProjectInput,
  ProjectBlock,
  ProjectChapter,
  ProjectRecord,
  ProjectSummary,
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

function mapRowsToProject(
  projectRow: typeof projects.$inferSelect,
  documentRow: typeof projectDocuments.$inferSelect,
  blockRows: Array<typeof documentBlocks.$inferSelect>,
  coverRow: typeof coverDesigns.$inferSelect,
): ProjectRecord {
  const chapterId = blockRows[0]?.chapterId ?? randomUUID();

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
      language: documentRow.language,
      chapters: [
        {
          id: chapterId,
          order: blockRows[0]?.chapterOrder ?? 1,
          title: blockRows[0]?.chapterTitle ?? 'Capítulo 1',
          blocks: blockRows
            .sort((left, right) => left.blockOrder - right.blockOrder)
            .map((block) => ({
              id: block.id,
              type: block.blockType as ProjectRecord['document']['chapters'][number]['blocks'][number]['type'],
              order: block.blockOrder,
              content: block.content,
            })),
        },
      ],
    },
    cover: {
      id: coverRow.id,
      title: coverRow.title,
      subtitle: coverRow.subtitle,
      palette: coverRow.palette as CoverDesign['palette'],
      backgroundImageUrl: coverRow.backgroundImageUrl,
      thumbnailUrl: coverRow.thumbnailUrl,
    },
  };
}

type ProjectGraphWriter = Pick<ReturnType<typeof getDb>, 'insert' | 'update' | 'delete'>;

function toBlockRows(projectDocumentId: string, chapters: ProjectChapter[], timestamp: string) {
  return chapters.flatMap((chapter) =>
    chapter.blocks.map((block: ProjectBlock) => ({
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
    language: project.document.language,
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
    updatedAt: new Date(project.updatedAt),
  });
}

export async function persistDocumentUpdate(db: ProjectGraphWriter, nextProject: ProjectRecord) {
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
      updatedAt: new Date(nextProject.updatedAt),
    })
    .where(eq(coverDesigns.projectId, nextProject.id));
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
  const [projectRow] = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

  if (!projectRow) {
    return null;
  }

  const [documentRow] = await db.select().from(projectDocuments).where(eq(projectDocuments.projectId, projectRow.id));

  if (!documentRow) {
    return null;
  }

  const blockRows = await db
    .select()
    .from(documentBlocks)
    .where(eq(documentBlocks.projectDocumentId, documentRow.id))
    .orderBy(asc(documentBlocks.blockOrder));
  const [coverRow] = await db.select().from(coverDesigns).where(eq(coverDesigns.projectId, projectRow.id));

  if (!coverRow) {
    return null;
  }

  return mapRowsToProject(projectRow, documentRow, blockRows, coverRow);
}

async function createProjectInDb(userId: string, input: CreateProjectInput) {
  const db = getDb();
  const project = createProjectRecord(userId, input);

  await persistProjectGraph(db, project);

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
      updatedAt: new Date(nextProject.updatedAt),
    })
    .where(eq(coverDesigns.projectId, projectId));

  return nextProject;
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
};
