import { describe, expect, it, vi } from 'vitest';
import { createEmptyDesignSurface, createDesignLayer } from './design-surface';
import { createCoverDesignPackage, parseCoverDesignPackage } from './cover-design-package';

function makePair() {
  const cover = createEmptyDesignSurface('cover');
  cover.layers = [createDesignLayer({ type: 'text', content: 'Cover title', x: 10, y: 20 }, 1)];
  const backCover = createEmptyDesignSurface('back-cover');
  backCover.layers = [createDesignLayer({ type: 'text', content: 'Back copy', x: 15, y: 25 }, 1)];
  return { cover, 'back-cover': backCover };
}

describe('cover design package', () => {
  it('round-trips two independent editable surfaces', async () => {
    const pair = makePair();
    const serialized = await createCoverDesignPackage(pair);
    const parsed = parseCoverDesignPackage(serialized);

    expect(parsed.surfaces.cover.layers[0]).toMatchObject({ content: 'Cover title', x: 10 });
    expect(parsed.surfaces['back-cover'].layers[0]).toMatchObject({ content: 'Back copy', x: 15 });
    expect(parsed.surfaces.cover.surface).toBe('cover');
    expect(parsed.surfaces['back-cover'].surface).toBe('back-cover');
  });

  it('embeds remote image assets into portable data URLs', async () => {
    const pair = makePair();
    pair.cover.layers.push(createDesignLayer({ type: 'image', src: 'https://assets.example.test/cover.png' }, 2));
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array([137, 80, 78, 71]), {
      status: 200,
      headers: { 'content-type': 'image/png' },
    })));

    const serialized = await createCoverDesignPackage(pair);
    const parsed = parseCoverDesignPackage(serialized);
    const image = parsed.surfaces.cover.layers.find((layer) => layer.type === 'image');

    expect(image?.type === 'image' && image.src).toMatch(/^data:image\/png;base64,/);
    vi.unstubAllGlobals();
  });

  it('rejects unknown properties instead of silently removing them', () => {
    const pair = makePair();
    const payload = JSON.parse(JSON.stringify({
      format: 'anclora-talent-cover-design',
      schemaVersion: 1,
      surfaces: pair,
    }));
    payload.surfaces.cover.layers[0].unrecognizedFutureStyle = true;

    expect(() => parseCoverDesignPackage(JSON.stringify(payload))).toThrow(/unrecognizedFutureStyle/);
  });

  it('rejects temporary blob URLs and malformed packages', async () => {
    const pair = makePair();
    pair.cover.background = { kind: 'image', src: 'blob:https://localhost/temporary', fit: 'cover', opacity: 1 };

    await expect(createCoverDesignPackage(pair)).rejects.toThrow(/temporary blob URL/);
    expect(() => parseCoverDesignPackage('{"schemaVersion":99}')).toThrow(/format/);
  });
});
