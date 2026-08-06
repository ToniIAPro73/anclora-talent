'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUserId } from '@/lib/auth/guards';
import { getDb, hasDatabase } from '@/lib/db';
import { projectRepository, userPreferencesRepository } from '@/lib/db/repositories';
import { uploadProjectBlob } from '@/lib/blob/client';
import { captureAutoSaveSnapshot, captureProjectSnapshot } from '@/lib/snapshots/capture';
import { deriveProvenanceUpdate } from '@/lib/ai/provenance';
import { normalizeSurfaceState, type SurfaceState } from './cover-surface';
import { buildPaginationConfig } from '@/lib/preview/device-configs';
import {
  buildSyncedTocChapterContent,
} from '@/lib/preview/preview-builder';
import { chapterBlocksToHtml } from './chapter-html';
import { mergeReimportedSeed } from './reimport';
import { parseCompositionSettings } from './composition';
import type { CoverDesign, UpdateBackCoverInput, UpdateCoverInput, UpdateDocumentInput } from './types';
import { defaultEditorPreferences, type EditorPreferences } from '@/lib/ui-preferences/preferences';

function parsePalette(value: FormDataEntryValue | null): CoverDesign['palette'] {
  if (value === 'teal' || value === 'sand') {
    return value;
  }

  return 'obsidian';
}

function parseSurfaceState(
  value: FormDataEntryValue | null,
): SurfaceState | null {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<SurfaceState> & { surface: SurfaceState['surface'] };
    return normalizeSurfaceState(parsed);
  } catch {
    return null;
  }
}

export async function createProjectAction(formData: FormData) {
  const userId = await requireUserId();
  const title = String(formData.get('title') ?? '').trim();
  const templateId = String(formData.get('templateId') ?? '').trim() || undefined;
  const sourceDocument = formData.get('sourceDocument');
  // F3: confirmed structure schema from the governed wizard (G2: the field
  // only exists after explicit human confirmation in the UI).
  const structureSchemaRaw = String(formData.get('structureSchema') ?? '').trim();
  // U5: optional identity-manual PDF → best-effort BrandProfile, created
  // active and linked to the new project. Any failure here is logged but
  // NEVER blocks project creation.
  const brandManual = formData.get('brandManual');
  // U6: composition reviewed in the pre-create document-data modal (JSON).
  const compositionRaw = String(formData.get('composition') ?? '').trim();

  console.info('[createProjectAction] submit received', {
    userId,
    titleLength: title.length,
    hasSourceDocument: sourceDocument instanceof File,
    sourceDocumentName: sourceDocument instanceof File ? sourceDocument.name : null,
    sourceDocumentType: sourceDocument instanceof File ? sourceDocument.type : null,
    sourceDocumentSize: sourceDocument instanceof File ? sourceDocument.size : null,
    hasStructureSchema: Boolean(structureSchemaRaw),
  });

  if (!title) {
    throw new Error('Project title is required');
  }

  try {
    // A confirmed structure scaffold takes precedence over an imported
    // source document: the scaffold is an EMPTY book shaped by the profile
    // (G3: form, never voice); importing content at the same time would
    // defeat its purpose.
    const structureSeed = structureSchemaRaw
      ? await (async () => {
          const { buildStructureScaffolding } = await import('@/lib/structure-profile/scaffolding');
          let parsed: unknown;
          try {
            parsed = JSON.parse(structureSchemaRaw);
          } catch {
            throw new Error('Invalid structureSchema payload');
          }
          const schema = parsed as Parameters<typeof buildStructureScaffolding>[0];
          if (schema?.profileType !== 'structure') {
            throw new Error('Invalid structureSchema payload');
          }
          const seed = buildStructureScaffolding(schema, { title });
          console.info('[createProjectAction] structure scaffolding built', {
            userId,
            chapters: seed.chapters?.length ?? 0,
          });
          return seed;
        })()
      : null;

    const importedDocument =
      structureSeed ??
      (sourceDocument instanceof File && sourceDocument.size > 0
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
        : null);

    const project = await projectRepository.createProject(userId, { title, importedDocument, templateId });

    console.info('[createProjectAction] project created', {
      userId,
      projectId: project.id,
      projectSlug: project.slug,
      hasImportedDocument: Boolean(importedDocument),
    });

    // U6: a composition confirmed in the pre-create modal is persisted into
    // the new project's metadata (merged, never blocking creation).
    if (compositionRaw) {
      try {
        const composition = parseCompositionSettings(JSON.parse(compositionRaw));
        if (composition) {
          const current = await projectRepository.getProjectById(userId, project.id);
          const metadata = {
            ...(current?.document.metadata ?? { title: project.title }),
            composition,
          };
          await projectRepository.saveDocumentExtras(userId, project.id, { metadata });
          console.info('[createProjectAction] composition persisted', {
            userId,
            projectId: project.id,
          });
        }
      } catch (compositionError) {
        console.error('[createProjectAction] composition persistence failed; project kept', {
          userId,
          projectId: project.id,
          compositionError,
        });
      }
    }

    if (brandManual instanceof File && brandManual.size > 0) {
      try {
        const { extractBrandProfileFromPdf } = await import('@/lib/brand/extract-brand-profile');
        const { brandProfileRepository } = await import('@/lib/brand/repository');
        const buffer = Buffer.from(await brandManual.arrayBuffer());
        const extraction = await extractBrandProfileFromPdf(buffer, brandManual.name);
        const profile = await brandProfileRepository.createBrandProfile(userId, extraction.profile);
        if (profile.status !== 'active') {
          await brandProfileRepository.setBrandProfileStatus(userId, profile.id, 'active');
        }
        await projectRepository.saveProjectBrandProfile(userId, project.id, profile.id);
        console.info('[createProjectAction] brand profile linked', {
          userId,
          projectId: project.id,
          brandProfileId: profile.id,
          warnings: extraction.warnings,
        });
      } catch (brandError) {
        console.error('[createProjectAction] brand manual extraction failed; project kept', {
          userId,
          projectId: project.id,
          brandManualName: brandManual.name,
          brandError,
        });
      }
    }

    // U6: when a manuscript was imported but the user did NOT review the
    // composition pre-create (no `composition` field submitted), open the
    // document-data modal right after landing in the editor.
    const manuscriptImported =
      !structureSeed && sourceDocument instanceof File && sourceDocument.size > 0;
    const editorSuffix = manuscriptImported && !compositionRaw ? '?documentData=open' : '';
    redirect(`/projects/${project.id}/editor${editorSuffix}`);
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

export async function saveProjectWorkflowStepAction(formData: FormData) {
  const userId = await requireUserId();
  const projectId = String(formData.get('projectId') ?? '').trim();
  const workflowStep = Number(formData.get('workflowStep') ?? 1);

  if (!projectId || !Number.isFinite(workflowStep)) {
    return;
  }

  await projectRepository.saveWorkflowStep(userId, projectId, workflowStep);
  revalidatePath(`/projects/${projectId}/editor`);
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

  // F2: versioned AST snapshot — throttled auto capture on chapter save
  // (one per editing session, never per keystroke; see snapshots/model.ts).
  // Best-effort: a capture failure must never break the save itself.
  if (hasDatabase()) {
    try {
      const updated = await projectRepository.getProjectById(userId, projectId);
      if (updated) {
        await captureAutoSaveSnapshot(getDb(), { project: updated, createdBy: userId });
      }
    } catch (error) {
      console.error('[saveChapterContentAction] snapshot capture failed', { projectId, error });
    }
  }

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

export async function importChapterAction(formData: FormData) {
  const userId = await requireUserId();
  const projectId = String(formData.get('projectId') ?? '').trim();
  const sourceDocument = formData.get('sourceDocument');
  const chapterTitle = String(formData.get('chapterTitle') ?? '').trim() || 'Capítulo importado';
  const position = String(formData.get('position') ?? '').trim();
  const targetChapterId = String(formData.get('targetChapterId') ?? '').trim() || undefined;

  if (!projectId || !(sourceDocument instanceof File) || sourceDocument.size === 0) {
    throw new Error('Project ID and valid file are required');
  }

  // Extract document content from file
  const { extractImportedDocumentSeed } = await import('./import');
  const importedDocument = await extractImportedDocumentSeed(sourceDocument);

  // Get the first chapter's content or combine all blocks
  const blocks = importedDocument.chapters?.[0]?.blocks || importedDocument.blocks || [];

  // Convert blocks to a single HTML content block
  const htmlContent = blocks
    .map((block) => {
      const content = block.content || '';
      if (content.trimStart().startsWith('<')) {
        return content;
      }
      if (block.type === 'heading') return `<h2>${content}</h2>`;
      if (block.type === 'quote') return `<blockquote><p>${content}</p></blockquote>`;
      return `<p>${content}</p>`;
    })
    .join('');

  // Parse position
  let positionType: 'before' | 'after' | undefined;
  if (position === 'before') {
    positionType = 'before';
  } else if (position === 'after') {
    positionType = 'after';
  }

  // Add chapter with imported content
  const newProject = await projectRepository.addChapter(
    userId,
    projectId,
    chapterTitle,
    positionType,
    targetChapterId,
  );

  // Get the newly created chapter ID
  const newChapterId = newProject.document.chapters[
    positionType === 'before'
      ? newProject.document.chapters.findIndex((ch) => ch.id === targetChapterId)
      : positionType === 'after'
        ? newProject.document.chapters.findIndex((ch) => ch.id === targetChapterId) + 1
        : newProject.document.chapters.length - 1
  ]?.id;

  if (newChapterId) {
    // Save the imported content to the new chapter
    await projectRepository.saveDocument(userId, projectId, {
      title: newProject.document.title,
      subtitle: newProject.document.subtitle,
      author: newProject.document.author,
      chapterId: newChapterId,
      chapterTitle,
      blocks: [{ id: newProject.document.chapters.find((ch) => ch.id === newChapterId)?.blocks[0]?.id ?? randomUUID(), content: htmlContent }],
    });
  }

  revalidatePath(`/projects/${projectId}/editor`);
  revalidatePath(`/projects/${projectId}/preview`);
}

export async function syncProjectPaginationAction(formData: FormData) {
  const userId = await requireUserId();
  const projectId = String(formData.get('projectId') ?? '').trim();

  if (!projectId) {
    return { status: 'missing-project' as const };
  }

  const device = String(formData.get('device') ?? defaultEditorPreferences.device);
  const fontSize = String(formData.get('fontSize') ?? defaultEditorPreferences.fontSize);
  const marginTop = Number(formData.get('marginTop') ?? defaultEditorPreferences.margins?.top ?? 24);
  const marginBottom = Number(formData.get('marginBottom') ?? defaultEditorPreferences.margins?.bottom ?? 24);
  const marginLeft = Number(formData.get('marginLeft') ?? defaultEditorPreferences.margins?.left ?? 24);
  const marginRight = Number(formData.get('marginRight') ?? defaultEditorPreferences.margins?.right ?? 24);

  const previewFormat =
    device === 'mobile' || device === 'tablet' ? device : 'laptop';

  const project = await projectRepository.getProjectById(userId, projectId);
  if (!project) {
    return { status: 'missing-project' as const };
  }

  const paginationConfig = buildPaginationConfig(previewFormat, {
    fontSize,
    margins: {
      top: marginTop,
      bottom: marginBottom,
      left: marginLeft,
      right: marginRight,
    },
  });

  const syncedToc = buildSyncedTocChapterContent(project, paginationConfig);
  if (!syncedToc) {
    revalidatePath(`/projects/${projectId}/editor`);
    revalidatePath(`/projects/${projectId}/preview`);
    return { status: 'missing-index' as const };
  }

  const tocChapter = project.document.chapters.find((chapter) => chapter.id === syncedToc.chapterId);
  const persistedTocHtml = tocChapter ? chapterBlocksToHtml(tocChapter.blocks) : '';
  const syncedHtml = syncedToc.html;

  if (tocChapter && syncedHtml !== persistedTocHtml) {
    await projectRepository.saveDocument(userId, projectId, {
      title: project.document.title,
      subtitle: project.document.subtitle,
      author: project.document.author,
      chapterTitle: tocChapter.title,
      chapterId: tocChapter.id,
      blocks: [
        {
          id: tocChapter.blocks[0]?.id ?? randomUUID(),
          content: syncedHtml,
        },
      ],
    });
  }

  revalidatePath(`/projects/${projectId}/editor`);
  revalidatePath(`/projects/${projectId}/preview`);
  return { status: 'updated' as const };
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
    surfaceState: parseSurfaceState(formData.get('surfaceState')),
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
    surfaceState: parseSurfaceState(formData.get('surfaceState')),
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

export async function uploadChapterImagesAction(formData: FormData) {
  await requireUserId();
  const projectId = String(formData.get('projectId') ?? '').trim();
  const chapterId = String(formData.get('chapterId') ?? '').trim();
  const imageDataJson = String(formData.get('imageData') ?? '[]').trim();

  if (!projectId || !chapterId) return null;

  try {
    type UploadedImageDraft = {
      id: string;
      url: string;
      [key: string]: unknown;
    };

    let images: UploadedImageDraft[] = [];
    try {
      const parsed = JSON.parse(imageDataJson) as unknown;
      images = Array.isArray(parsed)
        ? parsed.filter(
            (image): image is UploadedImageDraft =>
              Boolean(
                image &&
                  typeof image === 'object' &&
                  'id' in image &&
                  'url' in image &&
                  typeof (image as { id: unknown }).id === 'string' &&
                  typeof (image as { url: unknown }).url === 'string',
              ),
          )
        : [];
    } catch (error) {
      console.error('Error parsing image data:', error);
      return null;
    }

    const uploadedImages = await Promise.all(
      images.map(async (image) => {
        // If image URL is a data URL, convert and upload to blob storage
        if (image.url && image.url.startsWith('data:image/')) {
          try {
            const base64 = image.url.split(',')[1];
            if (!base64) return image;

            const buffer = Buffer.from(base64, 'base64');
            const file = new File([buffer], `chapter-image-${image.id}.png`, { type: 'image/png' });

            const blob = await uploadProjectBlob(projectId, file);
            if (blob) {
              return {
                ...image,
                url: blob.url,
              };
            }
          } catch (error) {
            console.error('Error uploading image:', error);
          }
        }
        // Return image as-is if already has blob URL or other URL
        return image;
      })
    );

    return uploadedImages;
  } catch (error) {
    console.error('Error in uploadChapterImagesAction:', error);
    return null;
  }
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

/**
 * FASE C: saves the declarative composition rules of a project.
 * Expects `rules` as a JSON string (DocumentRules); invalid JSON is rejected.
 */
export async function saveProjectRulesAction(formData: FormData) {
  const userId = await requireUserId();
  const projectId = String(formData.get('projectId') ?? '');
  if (!projectId) throw new Error('Missing projectId');

  const raw = String(formData.get('rules') ?? '');
  let rules = null;
  if (raw.trim()) {
    try {
      rules = JSON.parse(raw);
    } catch {
      throw new Error('Invalid rules payload');
    }
  }

  await projectRepository.saveDocumentExtras(userId, projectId, { rules });
  revalidatePath(`/projects/${projectId}/editor`);
  revalidatePath(`/projects/${projectId}/preview`);
  return { ok: true as const };
}

/**
 * U6: saves the per-project composition (CompositionSettings JSON, or
 * clears it with 'null') into `metadata.composition`, and optionally the
 * explicit "no brand" marker (`brandChoice` field: 'none' | 'clear').
 * The metadata jsonb is merged with the current value — never overwritten.
 */
export async function saveProjectCompositionAction(formData: FormData) {
  const userId = await requireUserId();
  const projectId = String(formData.get('projectId') ?? '');
  if (!projectId) throw new Error('Missing projectId');

  const hasCompositionField = formData.get('composition') !== null;
  const brandChoiceField = formData.get('brandChoice');
  if (!hasCompositionField && brandChoiceField === null) {
    throw new Error('Missing composition payload');
  }

  let composition: ReturnType<typeof parseCompositionSettings> = null;
  if (hasCompositionField) {
    const raw = String(formData.get('composition') ?? '').trim();
    if (raw) {
      try {
        composition = parseCompositionSettings(JSON.parse(raw));
      } catch {
        throw new Error('Invalid composition payload');
      }
    }
  }

  const project = await projectRepository.getProjectById(userId, projectId);
  if (!project) throw new Error('Project not found');

  const metadata = { ...(project.document.metadata ?? { title: project.title }) };
  if (hasCompositionField) {
    metadata.composition = composition;
  }
  if (brandChoiceField === 'none') {
    metadata.brandChoice = 'none';
  } else if (brandChoiceField === 'clear') {
    delete metadata.brandChoice;
  }

  await projectRepository.saveDocumentExtras(userId, projectId, { metadata });
  revalidatePath(`/projects/${projectId}/editor`);
  revalidatePath(`/projects/${projectId}/preview`);
  return { ok: true as const };
}

/**
 * U6: saves the user-level composition defaults
 * (`editor_preferences.compositionDefaults`). When `overwriteCustom` is true,
 * every project that has its own composition is overwritten with the new
 * defaults.
 */
export async function saveUserCompositionDefaultsAction(formData: FormData) {
  const userId = await requireUserId();
  const raw = String(formData.get('defaults') ?? '').trim();
  const overwriteCustom = String(formData.get('overwriteCustom') ?? '') === 'true';

  let defaults: ReturnType<typeof parseCompositionSettings> = null;
  if (raw) {
    try {
      defaults = parseCompositionSettings(JSON.parse(raw));
    } catch {
      throw new Error('Invalid composition payload');
    }
  }

  const stored = await userPreferencesRepository.getEditorPreferences(userId);
  const preferences: EditorPreferences = {
    ...(stored ?? defaultEditorPreferences),
    compositionDefaults: defaults ?? undefined,
  };
  await userPreferencesRepository.saveEditorPreferences(userId, preferences);

  if (overwriteCustom && defaults) {
    const summaries = await projectRepository.listProjectsForUser(userId);
    for (const summary of summaries) {
      const project = await projectRepository.getProjectById(userId, summary.id);
      if (!project) continue;
      if (!parseCompositionSettings(project.document.metadata?.composition)) continue;
      const metadata = {
        ...(project.document.metadata ?? { title: project.title }),
        composition: defaults,
      };
      await projectRepository.saveDocumentExtras(userId, project.id, { metadata });
    }
  }

  revalidatePath('/dashboard');
  revalidatePath('/projects');
  return { ok: true as const };
}

/**
 * U6: global brand scope sets (or clears) the DEFAULT brand profile of the
 * user — it never touches `projects.brandProfileId`. Per-project explicit
 * choices (an explicit `brandProfileId`, incl. the `metadata.brandChoice:
 * 'none'` marker) keep winning at resolve time (resolveBrandProfileId:
 * explicit > default > none).
 */
export async function setBrandForAllProjectsAction(formData: FormData) {
  const userId = await requireUserId();
  const brandProfileId = String(formData.get('brandProfileId') ?? '').trim() || null;

  const { brandProfileRepository } = await import('@/lib/brand/repository');
  if (brandProfileId) {
    // Selecting a profile globally makes it the active default.
    await brandProfileRepository.setBrandProfileStatus(userId, brandProfileId, 'active');
  } else {
    // "No brand" globally clears the default: active profiles become drafts.
    const profiles = await brandProfileRepository.listBrandProfilesForUser(userId);
    for (const profile of profiles) {
      if (profile.status === 'active') {
        await brandProfileRepository.setBrandProfileStatus(userId, profile.id, 'draft');
      }
    }
  }

  revalidatePath('/dashboard');
  revalidatePath('/projects');
  return { ok: true as const };
}

/**
 * FASE C: saves the digital product metadata (DocumentMetadata JSON):
 * title, subtitle, author, ISBN, description, keywords, language.
 */
export async function saveProjectMetadataAction(formData: FormData) {
  const userId = await requireUserId();
  const projectId = String(formData.get('projectId') ?? '');
  if (!projectId) throw new Error('Missing projectId');

  const raw = String(formData.get('metadata') ?? '');
  let metadata = null;
  if (raw.trim()) {
    try {
      metadata = JSON.parse(raw);
    } catch {
      throw new Error('Invalid metadata payload');
    }
  }

  await projectRepository.saveDocumentExtras(userId, projectId, { metadata });
  revalidatePath(`/projects/${projectId}/editor`);
  revalidatePath(`/projects/${projectId}/preview`);
  return { ok: true as const };
}

/**
 * FASE C: persists the canonical semantic document model (lazy migration
 * from HTML happens on first save through this action).
 *
 * F3 governance: this is a *human* save of the model — the provenance map is
 * updated marking every block the diff touches as `human` (blocks untouched
 * keep their recorded origin, so AI-authored blocks stay attributed).
 */
export async function saveProjectDocumentModelAction(formData: FormData) {
  const userId = await requireUserId();
  const projectId = String(formData.get('projectId') ?? '');
  if (!projectId) throw new Error('Missing projectId');

  const raw = String(formData.get('documentModel') ?? '');
  if (!raw.trim()) throw new Error('Missing documentModel');
  let documentModel;
  try {
    documentModel = JSON.parse(raw);
  } catch {
    throw new Error('Invalid documentModel payload');
  }

  const project = await projectRepository.getProjectById(userId, projectId);
  if (!project) throw new Error('Project not found');
  const provenance = deriveProvenanceUpdate(
    project.document.documentModel ?? null,
    documentModel,
    project.document.provenance,
    'human',
  );

  await projectRepository.saveDocumentExtras(userId, projectId, { documentModel, provenance });
  revalidatePath(`/projects/${projectId}/editor`);
  return { ok: true as const };
}

/**
 * FASE C (C6): idempotent reimport. Re-parses the revised DOCX and merges it
 * by structure into the existing project (stable chapter-title anchors),
 * preserving cover, back cover, rules, metadata and manual tweaks. Returns
 * the merge summary so the UI can show the before/after diff and trigger
 * incremental recomposition only for changed chapters.
 */
export async function reimportProjectAction(formData: FormData) {
  const userId = await requireUserId();
  const projectId = String(formData.get('projectId') ?? '');
  const file = formData.get('sourceDocument');
  if (!projectId) throw new Error('Missing projectId');
  if (!(file instanceof File) || file.size === 0) throw new Error('Missing sourceDocument');

  const { extractImportedDocumentSeed } = await import('./import');
  const seed = await extractImportedDocumentSeed(file);
  const current = await projectRepository.getProjectById(userId, projectId);
  if (!current) throw new Error('Project not found');

  const merge = mergeReimportedSeed(current, seed);
  await projectRepository.replaceDocument(userId, projectId, merge.project);

  // F2: every reimport leaves a snapshot trace (structural event).
  // Best-effort: a capture failure must never break the reimport itself.
  if (hasDatabase()) {
    try {
      await captureProjectSnapshot(getDb(), {
        project: merge.project,
        source: 'reimport',
        createdBy: userId,
      });
    } catch (error) {
      console.error('[reimportProjectAction] snapshot capture failed', { projectId, error });
    }
  }

  revalidatePath(`/projects/${projectId}/editor`);
  revalidatePath(`/projects/${projectId}/preview`);
  return {
    ok: true as const,
    changedChapterIds: merge.changedChapterIds,
    addedChapterTitles: merge.addedChapterTitles,
    keptStaleChapterTitles: merge.keptStaleChapterTitles,
  };
}
