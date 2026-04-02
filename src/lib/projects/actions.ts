'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUserId } from '@/lib/auth/guards';
import { projectRepository } from '@/lib/db/repositories';
import { uploadProjectBlob } from '@/lib/blob/client';
import type { CoverDesign, UpdateCoverInput, UpdateDocumentInput } from './types';

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
  const input: UpdateDocumentInput = {
    title: String(formData.get('title') ?? '').trim(),
    subtitle: String(formData.get('subtitle') ?? '').trim(),
    chapterTitle: String(formData.get('chapterTitle') ?? '').trim(),
    blocks: formData.getAll('blockId').map((id, index) => ({
      id: String(id),
      content: String(formData.getAll('blockContent')[index] ?? ''),
    })),
  };

  await projectRepository.saveDocument(userId, projectId, input);
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

  const input: UpdateCoverInput = {
    title: String(formData.get('title') ?? '').trim(),
    subtitle: String(formData.get('subtitle') ?? '').trim(),
    palette: parsePalette(formData.get('palette')),
    backgroundImageUrl,
    thumbnailUrl,
  };

  await projectRepository.saveCover(userId, projectId, input);
  revalidatePath(`/projects/${projectId}/cover`);
  revalidatePath(`/projects/${projectId}/preview`);
}
