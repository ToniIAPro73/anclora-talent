import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { resolveLocaleMessages } from '@/lib/i18n/messages';

// ─── i18n completeness ───────────────────────────────────────────────────────

describe('i18n completeness contract', () => {
  test('spanish and english project messages have identical keys', () => {
    const es = resolveLocaleMessages('es').project;
    const en = resolveLocaleMessages('en').project;

    const esKeys = Object.keys(es).sort();
    const enKeys = Object.keys(en).sort();

    expect(enKeys).toEqual(esKeys);
  });

  test('spanish and english shell messages have identical keys', () => {
    const es = resolveLocaleMessages('es').shell;
    const en = resolveLocaleMessages('en').shell;

    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
  });

  test('all project string values are non-empty in both locales', () => {
    for (const locale of ['es', 'en'] as const) {
      const project = resolveLocaleMessages(locale).project;
      for (const [key, value] of Object.entries(project)) {
        expect(value, `project.${key} must not be empty in locale "${locale}"`).toBeTruthy();
      }
    }
  });

  test('export keys are present and non-empty in both locales', () => {
    for (const locale of ['es', 'en'] as const) {
      const copy = resolveLocaleMessages(locale).project;
      expect(copy.previewExportButton).toBeTruthy();
      expect(copy.previewExportFilename).toBeTruthy();
      expect(copy.previewExportPdfButton).toBeTruthy();
      expect(copy.previewExportDocxButton).toBeTruthy();
    }
  });

  test('back cover keys are present and non-empty in both locales', () => {
    for (const locale of ['es', 'en'] as const) {
      const copy = resolveLocaleMessages(locale).project;
      expect(copy.backCoverEyebrow).toBeTruthy();
      expect(copy.backCoverTitle).toBeTruthy();
      expect(copy.backCoverAdvancedSyncNotice).toBeTruthy();
      expect(copy.backCoverSave).toBeTruthy();
      expect(copy.backCoverBackToCover).toBeTruthy();
    }
  });

  test('advanced cover keys are present in both locales', () => {
    for (const locale of ['es', 'en'] as const) {
      const copy = resolveLocaleMessages(locale).project;
      expect(copy.advancedCoverEyebrow).toBeTruthy();
      expect(copy.advancedCoverLayoutLabel).toBeTruthy();
      expect(copy.advancedCoverFontLabel).toBeTruthy();
      expect(copy.advancedCoverAccentLabel).toBeTruthy();
    }
  });
});

// ─── Premium button usage on migrated screens ─────────────────────────────────

describe('premium button classes contract', () => {
  const premiumButtonPattern = /premiumPrimaryDarkButton|premiumPrimaryMintButton|premiumSecondaryLightButton/;

  function readSrc(relativePath: string) {
    return readFileSync(resolve(process.cwd(), 'src', relativePath), 'utf8');
  }

  test('AdvancedCoverEditor uses premiumPrimaryDarkButton for save', () => {
    const src = readSrc('components/projects/advanced-cover/AdvancedCoverEditor.tsx');
    expect(premiumButtonPattern.test(src)).toBe(true);
  });

  test('BackCoverForm uses premiumPrimaryDarkButton for save', () => {
    const src = readSrc('components/projects/BackCoverForm.tsx');
    expect(premiumButtonPattern.test(src)).toBe(true);
  });

  test('preview page uses premium button classes for nav actions', () => {
    const src = readSrc('app/(app)/projects/[projectId]/preview/page.tsx');
    expect(premiumButtonPattern.test(src)).toBe(true);
  });

  test('ProjectWorkspace uses premium button class for save action', () => {
    const src = readSrc('components/projects/ProjectWorkspace.tsx');
    expect(premiumButtonPattern.test(src)).toBe(true);
  });
});

// ─── Export route structure ───────────────────────────────────────────────────

describe('export route contract', () => {
  test('export route file exists and exports a GET handler', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'src/app/api/projects/export/route.ts'),
      'utf8',
    );
    expect(src).toContain('export async function GET');
    expect(src).toContain('requireUserId');
    expect(src).toContain('Content-Disposition');
  });

  test('export route generates valid HTML structure', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'src/app/api/projects/export/route.ts'),
      'utf8',
    );
    expect(src).toContain('<!DOCTYPE html>');
    expect(src).toContain('<html');
    expect(src).toContain('</html>');
  });

  test('docx export route file exists and exports a GET handler', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'src/app/api/projects/export/docx/route.ts'),
      'utf8',
    );
    expect(src).toContain('export async function GET');
    expect(src).toContain('Content-Disposition');
    expect(src).toContain('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  });
});
