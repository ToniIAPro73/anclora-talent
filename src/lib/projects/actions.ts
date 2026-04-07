'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUserId } from '@/lib/auth/guards';
import { projectRepository } from '@/lib/db/repositories';
import { uploadProjectBlob } from '@/lib/blob/client';
import type { CoverDesign, UpdateBackCoverInput, UpdateCoverInput, UpdateDocumentInput } from './types';

function parsePalette(value: FormDataEntryValue | null): CoverDesign['palette'] {
  if (value === 'teal' || value === 'sand') {
    return value;
  }

  return 'obsidian';
}

export async function createProjectAction(formData: FormData) {
  const userId = await requireUserId();
  const title = String(formData.get('title') ?? '').trim();
  const sourceDocument = formData.get('sourceDocument');

  console.info('[createProjectAction] submit received', {
    userId,
    titleLength: title.length,
    hasSourceDocument: sourceDocument instanceof File,
    sourceDocumentName: sourceDocument instanceof File ? sourceDocument.name : null,
    sourceDocumentType: sourceDocument instanceof File ? sourceDocument.type : null,
    sourceDocumentSize: sourceDocument instanceof File ? sourceDocument.size : null,
  });

  if (!title) {
    throw new Error('Project title is required');
  }

  try {
    const importedDocument =
      sourceDocument instanceof File && sourceDocument.size > 0
        ? await (async () => {
            const { extractImportedDocumentSeed } = await import('./import');
            const result = await extractImportedDocumentSeed(sourceDocument);
            console.info('[createProjectAction] imported document extracted', {
              userId,
              sourceFileName: result.sourceFileName,
              sourceMimeType: result.sourceMimeType,
              title: result.title,
              blocks: result.blocks.length,
            });
            return result;
          })()
        : null;

    const project = await projectRepository.createProject(userId, { title, importedDocument });

    console.info('[createProjectAction] project created', {
      userId,
      projectId: project.id,
      projectSlug: project.slug,
      hasImportedDocument: Boolean(importedDocument),
    });

    redirect(`/projects/${project.id}/editor`);
  } catch (error) {
    console.error('[createProjectAction] failed', {
      userId,
      title,
      sourceDocumentName: sourceDocument instanceof File ? sourceDocument.name : null,
      sourceDocumentType: sourceDocument instanceof File ? sourceDocument.type : null,
      sourceDocumentSize: sourceDocument instanceof File ? sourceDocument.size : null,
      error,
    });
    throw error;
  }
}

export async function saveProjectDocumentAction(formData: FormData) {
  const userId = await requireUserId();
  const projectId = String(formData.get('projectId') ?? '');
  const chapterId = String(formData.get('chapterId') ?? '').trim() || undefined;
  const input: UpdateDocumentInput = {
    title: String(formData.get('title') ?? '').trim(),
    subtitle: String(formData.get('subtitle') ?? '').trim(),
    author: String(formData.get('author') ?? '').trim(),
    chapterTitle: String(formData.get('chapterTitle') ?? '').trim(),
    chapterId,
    blocks: formData.getAll('blockId').map((id, index) => ({
      id: String(id),
      content: String(formData.getAll('blockContent')[index] ?? ''),
    })),
  };

  await projectRepository.saveDocument(userId, projectId, input);
  revalidatePath(`/projects/${projectId}/editor`);
  revalidatePath(`/projects/${projectId}/preview`);
}

export async function saveChapterContentAction(formData: FormData) {
  const userId = await requireUserId();
  const projectId = String(formData.get('projectId') ?? '').trim();
  const chapterId = String(formData.get('chapterId') ?? '').trim();
  const chapterTitle = String(formData.get('chapterTitle') ?? '').trim();
  const htmlContent = String(formData.get('htmlContent') ?? '').trim();

  if (!projectId || !chapterId) return;

  const project = await projectRepository.getProjectById(userId, projectId);
  if (!project) return;

  const chapter = project.document.chapters.find((ch) => ch.id === chapterId);
  if (!chapter) return;

  // Replace all blocks with a single block containing the complete HTML content
  // This prevents duplication when concatenating multiple blocks
  const blockId = chapter.blocks[0]?.id ?? randomUUID();
  const input: UpdateDocumentInput = {
    title: project.document.title,
    subtitle: project.document.subtitle,
    author: project.document.author,
    chapterTitle: chapterTitle || chapter.title,
    chapterId,
    blocks: [
      { id: blockId, content: htmlContent },
      // Include other blocks with empty content to preserve their IDs but effectively remove them
      ...chapter.blocks.slice(1).map((block) => ({ id: block.id, content: '' })),
    ],
  };

  await projectRepository.saveDocument(userId, projectId, input);
  revalidatePath(`/projects/${projectId}/editor`);
  revalidatePath(`/projects/${projectId}/preview`);
}

export async function moveChapterAction(formData: FormData) {
  const userId = await requireUserId();
  const projectId = String(formData.get('projectId') ?? '').trim();
  const chapterId = String(formData.get('chapterId') ?? '').trim();
  const direction = String(formData.get('direction') ?? '').trim();

  if (!projectId || !chapterId || (direction !== 'up' && direction !== 'down')) return;

  await projectRepository.moveChapter(userId, projectId, chapterId, direction);
  revalidatePath(`/projects/${projectId}/editor`);
  revalidatePath(`/projects/${projectId}/preview`);
}

export async function deleteChapterAction(formData: FormData) {
  const userId = await requireUserId();
  const projectId = String(formData.get('projectId') ?? '').trim();
  const chapterId = String(formData.get('chapterId') ?? '').trim();

  if (!projectId || !chapterId) return;

  await projectRepository.deleteChapter(userId, projectId, chapterId);
  revalidatePath(`/projects/${projectId}/editor`);
  revalidatePath(`/projects/${projectId}/preview`);
}

export async function createChapterAction(formData: FormData) {
  const userId = await requireUserId();
  const projectId = String(formData.get('projectId') ?? '').trim();
  const chapterTitle = String(formData.get('chapterTitle') ?? '').trim() || 'Nuevo Capítulo';
  const position = String(formData.get('position') ?? '').trim(); // 'end', 'before:chapterId', 'after:chapterId'
  const targetChapterId = String(formData.get('targetChapterId') ?? '').trim() || undefined;

  if (!projectId) return;

  let positionType: 'before' | 'after' | undefined;
  if (position === 'before') {
    positionType = 'before';
  } else if (position === 'after') {
    positionType = 'after';
  }

  await projectRepository.addChapter(userId, projectId, chapterTitle, positionType, targetChapterId);
  revalidatePath(`/projects/${projectId}/editor`);
  revalidatePath(`/projects/${projectId}/preview`);
}

export async function saveProjectCoverAction(formData: FormData) {
  const userId = await requireUserId();
  const projectId = String(formData.get('projectId') ?? '');
  const file = formData.get('backgroundImage');
  let backgroundImageUrl = String(formData.get('currentBackgroundImageUrl') ?? '') || null;
  let thumbnailUrl = String(formData.get('currentThumbnailUrl') ?? '') || null;

  if (file instanceof File && file.size > 0) {
    const blob = await uploadProjectBlob(projectId, file);

    if (blob) {
      backgroundImageUrl = blob.url;
      thumbnailUrl = blob.url;
    }
  }

  const rawLayout = String(formData.get('layout') ?? '').trim();
  const layout: CoverDesign['layout'] =
    ['top', 'bottom', 'overlay-centered', 'overlay-bottom', 'image-only', 'minimalist'].includes(rawLayout)
      ? (rawLayout as CoverDesign['layout'])
      : 'centered';

  const showSubtitle = String(formData.get('showSubtitle') ?? 'true') === 'true';

  const input: UpdateCoverInput = {
    title: String(formData.get('title') ?? '').trim(),
    subtitle: String(formData.get('subtitle') ?? '').trim(),
    palette: parsePalette(formData.get('palette')),
    backgroundImageUrl,
    thumbnailUrl,
    layout,
    fontFamily: String(formData.get('fontFamily') ?? '').trim() || null,
    accentColor: String(formData.get('accentColor') ?? '').trim() || null,
    showSubtitle,
  };

  await projectRepository.saveCover(userId, projectId, input);
  revalidatePath(`/projects/${projectId}/cover`);
  revalidatePath(`/projects/${projectId}/editor`);
  revalidatePath(`/projects/${projectId}/preview`);
}

export async function saveBackCoverAction(formData: FormData) {
  const userId = await requireUserId();
  const projectId = String(formData.get('projectId') ?? '');
  const file = formData.get('backgroundImage');
  let backgroundImageUrl = String(formData.get('currentBackgroundImageUrl') ?? '') || null;

  if (file instanceof File && file.size > 0) {
    const blob = await uploadProjectBlob(projectId, file);
    if (blob) backgroundImageUrl = blob.url;
  }

  const input: UpdateBackCoverInput = {
    title: String(formData.get('title') ?? '').trim(),
    body: String(formData.get('body') ?? '').trim(),
    authorBio: String(formData.get('authorBio') ?? '').trim(),
    accentColor: String(formData.get('accentColor') ?? '').trim() || null,
    backgroundImageUrl,
  };

  await projectRepository.saveBackCover(userId, projectId, input);
  revalidatePath(`/projects/${projectId}/back-cover`);
  revalidatePath(`/projects/${projectId}/editor`);
  revalidatePath(`/projects/${projectId}/preview`);
}

export async function renderCoverImageAction(formData: FormData) {
  const userId = await requireUserId();
  const projectId = String(formData.get('projectId') ?? '').trim();
  const dataUrl = String(formData.get('dataUrl') ?? '').trim();

  if (!projectId || !dataUrl.startsWith('data:image/')) return;

  // Convert data URL to Buffer then to File for uploadProjectBlob
  const base64 = dataUrl.split(',')[1];
  if (!base64) return;

  const buffer = Buffer.from(base64, 'base64');
  const file = new File([buffer], `cover-render-${Date.now()}.png`, { type: 'image/png' });

  const blob = await uploadProjectBlob(projectId, file);
  if (!blob) return;

  await projectRepository.saveRenderedCoverUrl(userId, projectId, blob.url);
  revalidatePath(`/projects/${projectId}/cover`);
  revalidatePath(`/projects/${projectId}/editor`);
  revalidatePath(`/projects/${projectId}/preview`);
}

export async function renderBackCoverImageAction(formData: FormData) {
  const userId = await requireUserId();
  const projectId = String(formData.get('projectId') ?? '').trim();
  const dataUrl = String(formData.get('dataUrl') ?? '').trim();

  if (!projectId || !dataUrl.startsWith('data:image/')) return;

  // Convert data URL to Buffer then to File for uploadProjectBlob
  const base64 = dataUrl.split(',')[1];
  if (!base64) return;

  const buffer = Buffer.from(base64, 'base64');
  const file = new File([buffer], `back-cover-render-${Date.now()}.png`, { type: 'image/png' });

  const blob = await uploadProjectBlob(projectId, file);
  if (!blob) return;

  await projectRepository.saveRenderedBackCoverUrl(userId, projectId, blob.url);
  revalidatePath(`/projects/${projectId}/back-cover`);
  revalidatePath(`/projects/${projectId}/editor`);
  revalidatePath(`/projects/${projectId}/preview`);
}

export async function deleteProjectAction(formData: FormData) {
  const userId = await requireUserId();
  const projectId = String(formData.get('projectId') ?? '').trim();

  if (!projectId) {
    throw new Error('Project id is required');
  }

  await projectRepository.deleteProject(userId, projectId);
  revalidatePath('/dashboard');
  redirect('/dashboard');
}
