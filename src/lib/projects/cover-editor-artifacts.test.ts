import { describe, expect, it } from 'vitest';
import { createEmptyDesignSurface, createDesignLayer } from './design-surface';
import { appendCoverProofCheckpoint, applyCollectionLayoutProfile, createCollectionLayoutProfile, createCoverProofCheckpoint, findDesignSurfaceOverflows, resizeDesignSurface } from './cover-editor-artifacts';

describe('cover editor local artifacts', () => {
  it('creates immutable named checkpoints and bounds local history', () => {
    const surface = createEmptyDesignSurface('cover');
    const checkpoint = createCoverProofCheckpoint(' First proof ', surface, new Date('2026-01-01T00:00:00.000Z'));
    expect(checkpoint.name).toBe('First proof');
    expect(checkpoint.surface).not.toBe(surface);
    const history = Array.from({ length: 11 }, (_, index) => ({ ...checkpoint, id: String(index) }));
    expect(appendCoverProofCheckpoint(history, checkpoint)).toHaveLength(10);
    expect(() => createCoverProofCheckpoint('  ', surface)).toThrow(/name/i);
  });

  it('shares normalized margins, guides, ISBN area and semantic anchors without copying artwork or text', () => {
    const cover = createEmptyDesignSurface('cover', { width: 400, height: 600 });
    cover.guides = [{ id: 'g1', axis: 'x', position: 200 }];
    cover.safeArea = { top: 30, right: 20, bottom: 40, left: 20 };
    cover.layers = [createDesignLayer({ type: 'text', role: 'title', content: 'Book A', x: 80, y: 100, width: 240, height: 60 }, 1)];
    const back = createEmptyDesignSurface('back-cover', { width: 400, height: 600 });
    back.isbnArea = { x: 280, y: 500, width: 90, height: 70 };
    const profile = createCollectionLayoutProfile('Series', cover, back);
    const target = createEmptyDesignSurface('cover', { width: 800, height: 1200 });
    target.layers = [createDesignLayer({ type: 'text', role: 'title', content: 'Book B', x: 0, y: 0, width: 30, height: 20 }, 1)];
    const applied = applyCollectionLayoutProfile(profile, target);
    expect(applied.guides?.[0].position).toBe(400);
    expect(applied.safeArea).toEqual({ top: 60, right: 40, bottom: 80, left: 40 });
    expect(applied.layers[0]).toMatchObject({ content: 'Book B', x: 160, y: 200, width: 480, height: 120 });
    expect(applyCollectionLayoutProfile(profile, back).isbnArea).toEqual(back.isbnArea);
  });

  it('previews proportionally constrained resize and rejects unsafe dimensions', () => {
    const surface = createEmptyDesignSurface('cover', { width: 400, height: 600 });
    surface.layers = [createDesignLayer({ type: 'text', role: 'title', content: 'Title', x: 100, y: 100, width: 200, height: 50 }, 1)];
    const resized = resizeDesignSurface(surface, 800, 900, 'scale');
    expect(resized.layers[0]).toMatchObject({ x: 250, y: 150, width: 300, height: 75 });
    expect(() => resizeDesignSurface(surface, 20, 900, 'stretch')).toThrow(/dimensions/i);
    const anchored = resizeDesignSurface(surface, 600, 900, 'anchor', 'right', 'bottom');
    expect(anchored.layers[0]).toMatchObject({ x: 300, y: 400, width: 200, height: 50 });
    expect(findDesignSurfaceOverflows(anchored)).toEqual([]);
  });
});
