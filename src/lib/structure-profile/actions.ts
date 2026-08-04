'use server';

/**
 * Structure profile server actions (FASE 3): governed extraction, confirmed
 * persistence and status transitions over the versioned structural profiles.
 *
 * Governance wiring:
 * - G2: `extractStructureProfileAction` only *infers* a schema and returns it
 *   for the confirmation screen; nothing is persisted or applied there. A
 *   profile is stored (as `active`) exclusively via `saveStructureProfileAction`,
 *   which the UI calls only after the human confirms the inferred schema.
 * - G4: profiles are versioned per (user, name) and always record their
 *   source document (`sourceFileName`).
 * - G1: nothing here touches brand state; both profiles stay decoupled.
 */

import { revalidatePath } from 'next/cache';
import { requireUserId } from '@/lib/auth/guards';
import { projectToSemanticDocument } from '@/lib/compose/preview-adapter';
import { createProjectRecord } from '@/lib/projects/factories';
import {
  buildImportedDocumentSeed,
  extractTextFromBuffer,
  normalizeText,
} from '@/lib/projects/import-pipeline';
import { extractStructureFromDocument } from './extract-structure-profile';
import { structureProfileRepository } from './repository';
import type { InferredStructureSchema, StructureProfileStatus } from './model';

function isInferredStructureSchema(value: unknown): value is InferredStructureSchema {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<InferredStructureSchema>;
  return (
    candidate.profileType === 'structure' &&
    typeof candidate.hierarchy === 'object' &&
    typeof candidate.macroPattern === 'object' &&
    typeof candidate.metrics === 'object'
  );
}

/**
 * Infers the structural schema of an uploaded reference document (DOCX/PDF…).
 * Pure preview for the confirmation screen: no persistence, no application
 * (G2 — jamás aplicación silenciosa).
 */
export async function extractStructureProfileAction(formData: FormData) {
  await requireUserId();
  const file = formData.get('referenceDocument');
  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Missing referenceDocument');
  }

  const fileName = file.name || 'documento-referencia';
  const mimeType = file.type || 'application/octet-stream';
  const buffer = Buffer.from(await file.arrayBuffer());
  const extracted = await extractTextFromBuffer(fileName, mimeType, buffer);
  const seed = buildImportedDocumentSeed({
    fileName,
    mimeType,
    text: normalizeText(extracted.text),
    html: extracted.html,
    sourcePageCount: extracted.pageCount,
  });

  // In-memory projection through the same adapter the composer uses: the
  // schema is inferred from the canonical AST, never from raw text.
  const previewProject = createProjectRecord('structure-extract', {
    title: seed.title,
    importedDocument: seed,
  });
  const { document } = projectToSemanticDocument(previewProject);
  const schema = extractStructureFromDocument(document, {
    sourceDocumentName: fileName,
    sourceHtml: extracted.html,
  });

  return {
    ok: true as const,
    schema,
    sourceFileName: fileName,
    suggestedName: fileName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Estructura de referencia',
  };
}

/**
 * Persists a human-confirmed structural schema as a versioned profile (G2/G4).
 * The confirmation is the governance act, so the profile is stored `active`;
 * saving a new version of the same name deprecates the previous one (at most
 * one active version per name).
 */
export async function saveStructureProfileAction(formData: FormData) {
  const userId = await requireUserId();
  const name = String(formData.get('name') ?? '').trim();
  const rawSchema = String(formData.get('schema') ?? '');
  const sourceFileName = String(formData.get('sourceFileName') ?? '').trim() || null;
  if (!name) throw new Error('Missing name');

  let schema: unknown;
  try {
    schema = JSON.parse(rawSchema);
  } catch {
    throw new Error('Invalid schema JSON');
  }
  if (!isInferredStructureSchema(schema)) {
    throw new Error('Invalid structure schema');
  }

  const siblings = (await structureProfileRepository.listStructureProfilesForUser(userId)).filter(
    (profile) => profile.name === name,
  );
  const nextVersion = siblings.reduce((max, profile) => Math.max(max, profile.version), 0) + 1;

  const profile = await structureProfileRepository.createStructureProfile(userId, {
    name,
    version: nextVersion,
    status: 'active',
    schema,
    sourceFileName,
  });
  if (nextVersion > 1) {
    // Enforce the single-active-version invariant also on the create path.
    await structureProfileRepository.setStructureProfileStatus(userId, profile.id, 'active');
  }

  revalidatePath('/projects/new');
  revalidatePath('/projects');
  return { ok: true as const, profileId: profile.id, version: profile.version };
}

/** Status transition (draft → active, active → deprecated…). */
export async function setStructureProfileStatusAction(formData: FormData) {
  const userId = await requireUserId();
  const profileId = String(formData.get('profileId') ?? '').trim();
  const status = String(formData.get('status') ?? '').trim() as StructureProfileStatus;
  if (!profileId || !['draft', 'active', 'deprecated'].includes(status)) {
    throw new Error('Invalid profileId or status');
  }

  const profile = await structureProfileRepository.setStructureProfileStatus(userId, profileId, status);
  if (!profile) throw new Error('Structure profile not found');

  revalidatePath('/projects/new');
  revalidatePath('/projects');
  return { ok: true as const, status: profile.status };
}
