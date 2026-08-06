import { describe, expect, it } from 'vitest';
import type { BrandProfile } from '@/lib/brand/brand-profile';
import {
  SYSTEM_COMPOSITION_DEFAULTS,
  mergeCompositionSettings,
  parseCompositionSettings,
  resolveBrandProfileId,
  resolveComposition,
  serializeCompositionSettings,
} from './composition';

function brandProfile(id: string, status: BrandProfile['status']): BrandProfile {
  return {
    id,
    userId: 'user-1',
    name: id,
    version: 1,
    status,
    palette: [],
    typography: { display: null, body: null },
    usageProportions: null,
    governanceRules: [],
    voicePairs: [],
    sourceFileName: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('resolveComposition hierarchy', () => {
  it('returns the system defaults when nothing is set', () => {
    expect(resolveComposition(null, null)).toEqual(SYSTEM_COMPOSITION_DEFAULTS);
  });

  it('lets user defaults override the system defaults', () => {
    const resolved = resolveComposition(null, { fontSizePt: 14, lineHeight: 1.8 });
    expect(resolved.fontSizePt).toBe(14);
    expect(resolved.lineHeight).toBe(1.8);
    expect(resolved.fontFamily).toBe(SYSTEM_COMPOSITION_DEFAULTS.fontFamily);
    expect(resolved.margins).toEqual(SYSTEM_COMPOSITION_DEFAULTS.margins);
  });

  it('lets the project composition override user defaults field by field', () => {
    const resolved = resolveComposition(
      { fontSizePt: 11, margins: { top: 10, bottom: 10, left: 10, right: 10 } },
      { fontSizePt: 14, fontFamily: 'Inter', lineHeight: 1.8 },
    );
    expect(resolved.fontSizePt).toBe(11);
    expect(resolved.margins).toEqual({ top: 10, bottom: 10, left: 10, right: 10 });
    expect(resolved.fontFamily).toBe('Inter');
    expect(resolved.lineHeight).toBe(1.8);
  });

  it('mergeCompositionSettings leaves unset fields unset', () => {
    expect(mergeCompositionSettings(null, null)).toEqual({});
    expect(mergeCompositionSettings({ fontSizePt: 11 }, { fontSizePt: 14 })).toEqual({
      fontSizePt: 11,
    });
  });
});

describe('resolveBrandProfileId', () => {
  const profiles = [brandProfile('draft-1', 'draft'), brandProfile('active-1', 'active')];

  it('returns the explicit per-project id when set', () => {
    expect(resolveBrandProfileId('explicit-1', false, profiles)).toBe('explicit-1');
  });

  it('lets the explicit "no brand" marker win over everything', () => {
    expect(resolveBrandProfileId('explicit-1', true, profiles)).toBeNull();
    expect(resolveBrandProfileId(null, true, profiles)).toBeNull();
  });

  it('falls back to the active default profile', () => {
    expect(resolveBrandProfileId(null, false, profiles)).toBe('active-1');
    expect(resolveBrandProfileId(undefined, false, profiles)).toBe('active-1');
  });

  it('returns null when there is no explicit choice and no active profile', () => {
    expect(resolveBrandProfileId(null, false, [brandProfile('draft-1', 'draft')])).toBeNull();
    expect(resolveBrandProfileId(null, false, [])).toBeNull();
  });
});

describe('parse/serialize round-trip', () => {
  it('parses a valid payload', () => {
    expect(
      parseCompositionSettings({
        fontFamily: ' Georgia ',
        fontSizePt: 12.5,
        lineHeight: 1.5,
        margins: { top: 1, bottom: 2, left: 3, right: 4 },
      }),
    ).toEqual({
      fontFamily: 'Georgia',
      fontSizePt: 12.5,
      lineHeight: 1.5,
      margins: { top: 1, bottom: 2, left: 3, right: 4 },
    });
  });

  it('drops invalid fields and returns null when nothing valid remains', () => {
    expect(parseCompositionSettings({ fontSizePt: 'big', margins: { top: 1 } })).toBeNull();
    expect(parseCompositionSettings(null)).toBeNull();
    expect(parseCompositionSettings('nope')).toBeNull();
    expect(parseCompositionSettings({})).toBeNull();
  });

  it('serialize → parse is a stable round-trip', () => {
    const settings = { fontFamily: 'Inter', fontSizePt: 13 };
    expect(parseCompositionSettings(JSON.parse(serializeCompositionSettings(settings)))).toEqual(
      settings,
    );
  });

  it('serializes null and garbage payloads as null', () => {
    expect(serializeCompositionSettings(null)).toBe('null');
    expect(
      serializeCompositionSettings({ fontSizePt: Number.NaN } as never),
    ).toBe('null');
  });
});
