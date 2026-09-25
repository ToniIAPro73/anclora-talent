/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));
import { projectRepository } from '@/lib/db/repositories';
import { createProjectRecord } from '@/lib/projects/factories';
import type { ReferenceEditorialProfile } from './model';
import {
  applyReferenceEditorialProfileAction,
  saveUserStyleOverrideAction,
  resetUserStyleOverridesAction,
} from './actions';

vi.mock('@/lib/auth/guards', () => ({
  requireUserId: vi.fn().mockResolvedValue('user-test-1'),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

function makeSampleProfile(fontFamily: string): ReferenceEditorialProfile {
  return {
    version: 1,
    extractedAt: '2026-09-25T00:00:00.000Z',
    page: {
      width: 432,
      height: 648,
      margins: { top: 36, bottom: 36, left: 36, right: 36, gutter: 0 },
      columns: 1,
      gutter: 0,
      runningHeaders: true,
      facingPages: false,
    },
    body: {
      fontFamily,
      resolvedFontFamily: fontFamily,
      fontSize: 11,
      lineHeight: 1.5,
      color: '#111827',
      textAlign: 'justify',
      fontWeight: 'normal',
      fontStyle: 'normal',
      paragraphSpacingAfter: 6,
    },
    headings: {
      h1: {
        fontFamily,
        resolvedFontFamily: fontFamily,
        fontSize: 22,
        lineHeight: 1.2,
        color: '#111827',
        textAlign: 'left',
        fontWeight: 'bold',
        fontStyle: 'normal',
      },
      h2: {
        fontFamily,
        resolvedFontFamily: fontFamily,
        fontSize: 16,
        lineHeight: 1.25,
        color: '#1F2937',
        textAlign: 'left',
        fontWeight: 'bold',
        fontStyle: 'normal',
      },
      h3: {
        fontFamily,
        resolvedFontFamily: fontFamily,
        fontSize: 13,
        lineHeight: 1.3,
        color: '#374151',
        textAlign: 'left',
        fontWeight: 'semibold',
        fontStyle: 'normal',
      },
    },
    chapterOpening: { detected: false, hasDropCap: false },
    quote: {
      fontFamily,
      resolvedFontFamily: fontFamily,
      fontSize: 10,
      fontStyle: 'italic',
      color: '#4B5563',
    },
    lists: {
      unordered: { style: 'bullet', spacing: 4 },
      ordered: { style: 'decimal', spacing: 4 },
    },
    tables: {
      headerStyle: { fontWeight: 'bold' },
      cellPadding: 4,
      borders: 'horizontal',
    },
    footnotes: {
      numbering: 'arabic',
      placement: 'bottom-of-page',
    },
    header: { enabled: false },
    footer: { enabled: false },
    pageNumber: { enabled: true, alignment: 'center', format: 'arabic' },
    toc: { leaderStyle: 'dots', alignment: 'right' },
  };
}

describe('Non-Destructive Reapplication & User Overrides (Phase 9)', () => {
  const userId = 'user-test-1';
  let project = createProjectRecord(userId, { title: 'Test Manuscript' });

  beforeEach(() => {
    project = createProjectRecord(userId, { title: 'Test Manuscript' });
    project.document.chapters = [
      {
        id: 'ch-1',
        title: 'Capítulo 1',
        blocks: [
          { id: 'b-1', type: 'heading', content: 'Capítulo 1' },
          { id: 'b-2', type: 'paragraph', content: 'Texto inmutable del manuscrito.' },
        ],
      },
    ];

    vi.spyOn(projectRepository, 'getProjectById').mockImplementation(async () => project);
    vi.spyOn(projectRepository, 'saveDocumentExtras').mockImplementation(async (_u, _p, input) => {
      if (input.metadata !== undefined) {
        project.document.metadata = input.metadata;
      }
      return project;
    });
  });

  test('P9-T01: Reapplying a new reference profile preserves manuscript blocks 100%', async () => {
    const originalBlocks = JSON.parse(JSON.stringify(project.document.chapters));
    const newProfile = makeSampleProfile('Cinzel');

    const result = await applyReferenceEditorialProfileAction(project.id, newProfile, true);
    expect(result.ok).toBe(true);

    // Metadata is updated
    expect(result.project.document.metadata?.referenceEditorialProfile?.body.fontFamily).toBe('Cinzel');

    // Manuscript chapters and blocks remain identical
    expect(result.project.document.chapters).toEqual(originalBlocks);
  });

  test('P9-T01: Applying reference with keepOverrides=false clears userOverrides', async () => {
    project.document.metadata = {
      userOverrides: [
        {
          scope: 'role',
          targetRole: 'h1',
          styles: { fontSizePt: 30 },
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    const newProfile = makeSampleProfile('Garamond');
    const result = await applyReferenceEditorialProfileAction(project.id, newProfile, false);

    expect(result.ok).toBe(true);
    expect(result.project.document.metadata?.userOverrides).toEqual([]);
  });

  test('P9-T02: Saving a user style override updates metadata without touching blocks', async () => {
    const originalBlocks = JSON.parse(JSON.stringify(project.document.chapters));

    const result = await saveUserStyleOverrideAction(project.id, {
      scope: 'role',
      targetRole: 'h2',
      styles: { fontSizePt: 20, color: '#FF0000' },
      updatedAt: new Date().toISOString(),
    });

    expect(result.ok).toBe(true);
    const overrides = result.project.document.metadata?.userOverrides;
    expect(overrides).toBeDefined();
    expect(overrides?.length).toBe(1);
    expect(overrides?.[0].targetRole).toBe('h2');
    expect(overrides?.[0].styles.fontSizePt).toBe(20);

    // Manuscript unchanged
    expect(result.project.document.chapters).toEqual(originalBlocks);
  });

  test('P9-T02: Resetting user overrides restores reference values', async () => {
    project.document.metadata = {
      userOverrides: [
        {
          scope: 'role',
          targetRole: 'h1',
          styles: { fontSizePt: 28 },
          updatedAt: new Date().toISOString(),
        },
        {
          scope: 'role',
          targetRole: 'h2',
          styles: { fontSizePt: 20 },
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    // Reset only h1
    const res1 = await resetUserStyleOverridesAction(project.id, 'h1');
    expect(res1.project.document.metadata?.userOverrides?.length).toBe(1);
    expect(res1.project.document.metadata?.userOverrides?.[0].targetRole).toBe('h2');

    // Reset all
    const res2 = await resetUserStyleOverridesAction(project.id);
    expect(res2.project.document.metadata?.userOverrides?.length).toBe(0);
  });
});
