/**
 * Brand profile CRUD actions (FASE 2): extraction → draft, explicit
 * activation (G4: at most one active version per brand name) and the
 * optional per-project brand selection (G1). Runs on the in-memory
 * repository path (no DATABASE_URL in tests).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/guards', () => ({ requireUserId: vi.fn(() => Promise.resolve('user_123')) }));

import {
  createBrandProfileAction,
  setBrandProfileStatusAction,
  setProjectBrandProfileAction,
} from './actions';
import { brandProfileRepository } from './repository';
import { resolveProjectBrandTemplateOverrides } from './resolve';
import { projectRepository } from '@/lib/db/repositories';

const FIXTURE_PATH = resolve(
  process.cwd(),
  'fixtures',
  'anclora_insights_manual_identidad.pdf',
);

function uploadFormData() {
  const file = new File([readFileSync(FIXTURE_PATH)], 'manual.pdf', { type: 'application/pdf' });
  const formData = new FormData();
  formData.set('manualPdf', file);
  return formData;
}

describe('brand profile actions (CRUD)', () => {
  test('creates a draft profile from the identity manual PDF', async () => {
    const result = await createBrandProfileAction(uploadFormData());

    expect(result.ok).toBe(true);
    expect(result.warnings).toEqual([]);

    const profile = await brandProfileRepository.getBrandProfileById('user_123', result.profileId);
    expect(profile?.status).toBe('draft');
    expect(profile?.version).toBe(1);
    expect(profile?.palette).toHaveLength(4);
    expect(profile?.typography.display?.family).toBe('Libre Baskerville');
  });

  test('activation is explicit and deprecates other versions of the same name', async () => {
    const first = await createBrandProfileAction(uploadFormData());
    const second = await createBrandProfileAction(uploadFormData());

    const activate = (profileId: string) => {
      const formData = new FormData();
      formData.set('profileId', profileId);
      formData.set('status', 'active');
      return setBrandProfileStatusAction(formData);
    };

    await activate(first.profileId);
    expect(
      (await brandProfileRepository.getBrandProfileById('user_123', first.profileId))?.status,
    ).toBe('active');

    await activate(second.profileId);
    expect(
      (await brandProfileRepository.getBrandProfileById('user_123', second.profileId))?.status,
    ).toBe('active');
    expect(
      (await brandProfileRepository.getBrandProfileById('user_123', first.profileId))?.status,
    ).toBe('deprecated');
  });

  test('applies and clears the project brand profile (G1: optional)', async () => {
    const project = await projectRepository.createProject('user_123', { title: 'Proyecto marca' });
    expect(project.brandProfileId).toBeNull();

    const created = await createBrandProfileAction(uploadFormData());
    const statusForm = new FormData();
    statusForm.set('profileId', created.profileId);
    statusForm.set('status', 'active');
    await setBrandProfileStatusAction(statusForm);

    const applyForm = new FormData();
    applyForm.set('projectId', project.id);
    applyForm.set('brandProfileId', created.profileId);
    await setProjectBrandProfileAction(applyForm);

    const updated = await projectRepository.getProjectById('user_123', project.id);
    expect(updated?.brandProfileId).toBe(created.profileId);

    // The linked profile resolves to composer template overrides (R3).
    const overrides = await resolveProjectBrandTemplateOverrides('user_123', updated!);
    expect(overrides?.displayFontFamily).toBe('Libre Baskerville');
    expect(overrides?.headingColor).toBe('#0F172A');
    expect(overrides?.accentColor).toBe('#F59E0B');

    const clearForm = new FormData();
    clearForm.set('projectId', project.id);
    clearForm.set('brandProfileId', '');
    await setProjectBrandProfileAction(clearForm);

    const cleared = await projectRepository.getProjectById('user_123', project.id);
    expect(cleared?.brandProfileId).toBeNull();
    expect(await resolveProjectBrandTemplateOverrides('user_123', cleared!)).toBeUndefined();
  });

  test('rejects applying a deprecated profile', async () => {
    const project = await projectRepository.createProject('user_123', { title: 'Proyecto marca 2' });
    const created = await createBrandProfileAction(uploadFormData());
    // Stays a draft: fine to apply. Deprecate it and expect rejection.
    const deprecateForm = new FormData();
    deprecateForm.set('profileId', created.profileId);
    deprecateForm.set('status', 'deprecated');
    await setBrandProfileStatusAction(deprecateForm);

    const applyForm = new FormData();
    applyForm.set('projectId', project.id);
    applyForm.set('brandProfileId', created.profileId);
    await expect(setProjectBrandProfileAction(applyForm)).rejects.toThrow('deprecated');
  });
});
