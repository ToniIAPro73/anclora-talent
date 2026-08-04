'use server';

/**
 * Brand profile server actions (FASE 2): CRUD over the versioned theme packs
 * (list happens in server components via the repository) and the optional
 * per-project brand selection (G1: brand and structure stay decoupled —
 * one, the other, both or neither).
 */

import { revalidatePath } from 'next/cache';
import { requireUserId } from '@/lib/auth/guards';
import { projectRepository } from '@/lib/db/repositories';
import { extractBrandProfileFromPdf } from './extract-brand-profile';
import { brandProfileRepository } from './repository';
import type { BrandProfileStatus } from './brand-profile';

/**
 * Creates a BrandProfile draft from an uploaded identity-manual PDF.
 * The extractor is heuristic; per-field confidence travels in the profile.
 */
export async function createBrandProfileAction(formData: FormData) {
  const userId = await requireUserId();
  const file = formData.get('manualPdf');
  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Missing manualPdf');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const extraction = await extractBrandProfileFromPdf(buffer, file.name);
  const profile = await brandProfileRepository.createBrandProfile(userId, extraction.profile);

  const projectId = String(formData.get('projectId') ?? '').trim();
  if (projectId) revalidatePath(`/projects/${projectId}/editor`);
  revalidatePath('/projects');
  return {
    ok: true as const,
    profileId: profile.id,
    name: profile.name,
    warnings: extraction.warnings,
  };
}

/** Status transition (draft → active, active → deprecated…). */
export async function setBrandProfileStatusAction(formData: FormData) {
  const userId = await requireUserId();
  const profileId = String(formData.get('profileId') ?? '').trim();
  const status = String(formData.get('status') ?? '').trim() as BrandProfileStatus;
  if (!profileId || !['draft', 'active', 'deprecated'].includes(status)) {
    throw new Error('Invalid profileId or status');
  }

  const profile = await brandProfileRepository.setBrandProfileStatus(userId, profileId, status);
  if (!profile) throw new Error('Brand profile not found');

  const projectId = String(formData.get('projectId') ?? '').trim();
  if (projectId) revalidatePath(`/projects/${projectId}/editor`);
  revalidatePath('/projects');
  return { ok: true as const, status: profile.status };
}

/**
 * Applies (or clears, empty value) the brand profile of a project (G1).
 * Only non-deprecated profiles can be applied.
 */
export async function setProjectBrandProfileAction(formData: FormData) {
  const userId = await requireUserId();
  const projectId = String(formData.get('projectId') ?? '').trim();
  const brandProfileId = String(formData.get('brandProfileId') ?? '').trim() || null;
  if (!projectId) throw new Error('Missing projectId');

  if (brandProfileId) {
    const profile = await brandProfileRepository.getBrandProfileById(userId, brandProfileId);
    if (!profile) throw new Error('Brand profile not found');
    if (profile.status === 'deprecated') throw new Error('Cannot apply a deprecated brand profile');
  }

  await projectRepository.saveProjectBrandProfile(userId, projectId, brandProfileId);
  revalidatePath(`/projects/${projectId}/editor`);
  revalidatePath(`/projects/${projectId}/preview`);
  return { ok: true as const };
}
