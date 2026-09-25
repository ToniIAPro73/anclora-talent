'use server';

import { revalidatePath } from 'next/cache';
import { requireUserId } from '@/lib/auth/guards';
import { sha256Buffer } from '@/lib/projects/hash';
import { structureProfileRepository } from '@/lib/structure-profile/repository';
import { hasUsableEditorialEvidence, type ReferenceEditorialProfile } from './model';
import { extractEditorialProfileFromPdf, ReferenceAnalysisTimeoutError } from './pdf';
import { extractEditorialProfileFromDocx } from './docx';
import { projectRepository } from '@/lib/db/repositories';
import type { UserStyleOverride, EditorialRole } from '@/lib/style-engine/model';
import { isReferenceEditorialProfile } from './legacy';

const MAX_REFERENCE_BYTES = 50 * 1024 * 1024;

function parseProfile(value: string): ReferenceEditorialProfile {
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { throw new Error('Invalid editorial profile JSON'); }
  if (!isReferenceEditorialProfile(parsed)) throw new Error('Invalid editorial profile');
  return parsed;
}

export async function extractReferenceEditorialProfileAction(formData: FormData) {
  try {
    await requireUserId();
    const file = formData.get('referenceDocument');
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false as const, error: 'Documento de referencia no proporcionado o vacío.', warnings: ['Missing referenceDocument'] };
    }
    if (file.size > MAX_REFERENCE_BYTES) {
      return { ok: false as const, error: 'El archivo de referencia excede el tamaño máximo permitido (50 MB).', warnings: ['Reference document is too large'] };
    }
    const filename = file.name || 'reference.pdf';
    const buffer = Buffer.from(await file.arrayBuffer());
    const hash = sha256Buffer(buffer);
    const isDocx = file.type.includes('wordprocessingml') || filename.toLowerCase().endsWith('.docx');
    const result = isDocx
      ? await extractEditorialProfileFromDocx(buffer, { filename, hash })
      : await extractEditorialProfileFromPdf(buffer, { filename, format: 'pdf', hash });
    if (!hasUsableEditorialEvidence(result.profile)) {
      const warnings = 'analysis' in result ? result.analysis.warnings : [];
      return {
        ok: false as const,
        error: 'No se pudo extraer un estilo editorial confiable de este documento.',
        warnings: [...warnings, 'No reliable editorial style could be extracted from this document.'],
      };
    }
    return {
      ok: true as const,
      profile: result.profile,
      analysis: result.analysis,
      suggestedName: filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Reference editorial profile',
    };
  } catch (error) {
    const isTimeout =
      error instanceof ReferenceAnalysisTimeoutError ||
      (error instanceof Error && error.name === 'ReferenceAnalysisTimeoutError');
    return {
      ok: false as const,
      error: isTimeout
        ? 'El análisis del documento de referencia superó el tiempo límite de espera.'
        : 'No se pudo analizar el documento de referencia. El archivo puede estar dañado o no ser un PDF compatible.',
      warnings: [error instanceof Error ? error.message : 'Error desconocido'],
    };
  }
}

export async function saveReferenceEditorialProfileAction(formData: FormData) {
  const userId = await requireUserId();
  const name = String(formData.get('name') ?? '').trim();
  if (!name) throw new Error('Missing name');
  const profile = parseProfile(String(formData.get('profile') ?? ''));
  if (!hasUsableEditorialEvidence(profile)) throw new Error('Editorial profile has insufficient evidence');
  const siblings = (await structureProfileRepository.listStructureProfilesForUser(userId)).filter((item) => item.name === name);
  const version = siblings.reduce((max, item) => Math.max(max, item.version), 0) + 1;
  const saved = await structureProfileRepository.createStructureProfile(userId, { name, version, status: 'active', schema: profile, sourceFileName: profile.source.filename });
  revalidatePath('/projects/new');
  revalidatePath('/projects');
  return { ok: true as const, profileId: saved.id, version: saved.version };
}

export async function applyReferenceEditorialProfileAction(
  projectId: string,
  profile: ReferenceEditorialProfile,
  keepOverrides: boolean = true,
) {
  const userId = await requireUserId();
  const project = await projectRepository.getProjectById(userId, projectId);
  if (!project) throw new Error('Project not found');

  const currentMetadata = project.document.metadata ?? {};
  const nextMetadata = {
    ...currentMetadata,
    referenceEditorialProfile: profile,
    userOverrides: keepOverrides ? (currentMetadata.userOverrides ?? []) : [],
  };

  const updatedProject = await projectRepository.saveDocumentExtras(userId, projectId, {
    metadata: nextMetadata,
  });

  revalidatePath(`/projects/${projectId}`);
  return { ok: true as const, project: updatedProject };
}

export async function saveUserStyleOverrideAction(
  projectId: string,
  override: UserStyleOverride,
) {
  const userId = await requireUserId();
  const project = await projectRepository.getProjectById(userId, projectId);
  if (!project) throw new Error('Project not found');

  const currentMetadata = project.document.metadata ?? {};
  const currentOverrides: UserStyleOverride[] = currentMetadata.userOverrides ?? [];

  const nextOverrides = currentOverrides.filter((o) => {
    if (override.scope === 'role' && o.scope === 'role' && o.targetRole === override.targetRole) {
      return false;
    }
    if (override.scope === 'block' && o.scope === 'block' && o.targetBlockId === override.targetBlockId) {
      return false;
    }
    if (override.scope === 'global' && o.scope === 'global') {
      return false;
    }
    return true;
  });
  nextOverrides.push(override);

  const nextMetadata = {
    ...currentMetadata,
    userOverrides: nextOverrides,
  };

  const updatedProject = await projectRepository.saveDocumentExtras(userId, projectId, {
    metadata: nextMetadata,
  });

  revalidatePath(`/projects/${projectId}`);
  return { ok: true as const, project: updatedProject };
}

export async function resetUserStyleOverridesAction(
  projectId: string,
  role?: EditorialRole,
) {
  const userId = await requireUserId();
  const project = await projectRepository.getProjectById(userId, projectId);
  if (!project) throw new Error('Project not found');

  const currentMetadata = project.document.metadata ?? {};
  const currentOverrides: UserStyleOverride[] = currentMetadata.userOverrides ?? [];

  const nextOverrides = role
    ? currentOverrides.filter((o) => o.targetRole !== role)
    : [];

  const nextMetadata = {
    ...currentMetadata,
    userOverrides: nextOverrides,
  };

  const updatedProject = await projectRepository.saveDocumentExtras(userId, projectId, {
    metadata: nextMetadata,
  });

  revalidatePath(`/projects/${projectId}`);
  return { ok: true as const, project: updatedProject };
}

