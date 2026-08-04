/**
 * Resolves the composer template overrides for a project's optional brand
 * profile (FASE 2, G1). Returns undefined when the project has no brand
 * profile linked or the linked profile is deprecated/foreign — exports then
 * run with the base template, unchanged.
 */

import 'server-only';
import type { ComposeTemplate } from '@/lib/compose/compose';
import type { ProjectRecord } from '@/lib/projects/types';
import { brandProfileRepository } from './repository';
import { brandProfileToTemplateOverrides } from './brand-template-overrides';

export async function resolveProjectBrandTemplateOverrides(
  userId: string,
  project: ProjectRecord,
): Promise<Partial<ComposeTemplate> | undefined> {
  if (!project.brandProfileId) return undefined;
  const profile = await brandProfileRepository.getBrandProfileById(userId, project.brandProfileId);
  if (!profile || profile.status === 'deprecated') return undefined;
  return brandProfileToTemplateOverrides(profile);
}
