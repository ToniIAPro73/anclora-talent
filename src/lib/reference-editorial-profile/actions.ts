'use server';

import { revalidatePath } from 'next/cache';
import { requireUserId } from '@/lib/auth/guards';
import { sha256Buffer } from '@/lib/projects/hash';
import { structureProfileRepository } from '@/lib/structure-profile/repository';
import { hasUsableEditorialEvidence, type ReferenceEditorialProfile } from './model';
import { extractEditorialProfileFromPdf } from './pdf';
import { extractEditorialProfileFromDocx } from './docx';
import { isReferenceEditorialProfile } from './legacy';

const MAX_REFERENCE_BYTES = 50 * 1024 * 1024;

function parseProfile(value: string): ReferenceEditorialProfile {
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { throw new Error('Invalid editorial profile JSON'); }
  if (!isReferenceEditorialProfile(parsed)) throw new Error('Invalid editorial profile');
  return parsed;
}

export async function extractReferenceEditorialProfileAction(formData: FormData) {
  await requireUserId();
  const file = formData.get('referenceDocument');
  if (!(file instanceof File) || file.size === 0) throw new Error('Missing referenceDocument');
  if (file.size > MAX_REFERENCE_BYTES) throw new Error('Reference document is too large');
  const filename = file.name || 'reference.pdf';
  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = sha256Buffer(buffer);
  const isDocx = file.type.includes('wordprocessingml') || filename.toLowerCase().endsWith('.docx');
  const result = isDocx
    ? await extractEditorialProfileFromDocx(buffer, { filename, hash })
    : await extractEditorialProfileFromPdf(buffer, { filename, format: 'pdf', hash });
  if (!hasUsableEditorialEvidence(result.profile)) {
    const warnings = 'analysis' in result ? result.analysis.warnings : [];
    return { ok: false as const, warnings: [...warnings, 'No reliable editorial style could be extracted from this document.'] };
  }
  return { ok: true as const, profile: result.profile, analysis: result.analysis, suggestedName: filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Reference editorial profile' };
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
