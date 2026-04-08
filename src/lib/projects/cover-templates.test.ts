import { describe, expect, it } from 'vitest';
import { BACK_COVER_TEMPLATES, COVER_TEMPLATES } from './cover-templates';

describe('cover-templates', () => {
  it('exposes independent template catalogs for cover and back cover', () => {
    expect(COVER_TEMPLATES.length).toBeGreaterThanOrEqual(6);
    expect(BACK_COVER_TEMPLATES.length).toBeGreaterThanOrEqual(6);
    expect(COVER_TEMPLATES.every((template) => template.surface === 'cover')).toBe(true);
    expect(BACK_COVER_TEMPLATES.every((template) => template.surface === 'back-cover')).toBe(true);
  });

  it('includes multiple editorial categories', () => {
    const categories = new Set(COVER_TEMPLATES.map((template) => template.category));

    expect(categories.has('fiction')).toBe(true);
    expect(categories.has('business')).toBe(true);
    expect(categories.has('memoir')).toBe(true);
  });
});
