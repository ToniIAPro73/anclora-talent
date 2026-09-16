import { describe, expect, test, vi } from 'vitest';
import { createProjectRecord } from './factories';
import { createDesignLayer, createEmptyDesignSurface } from './design-surface';
import { buildBackCoverExportImageDataUrl, buildCoverExportImageDataUrl } from './export-surface-image';

const renderMock = vi.fn(async (surface: unknown) => {
  void surface;
  return 'data:image/png;base64,FAKE_V2_RENDER';
});

vi.mock('./design-surface-render', () => ({
  renderDesignSurfaceToPngDataUrl: (surface: unknown) => renderMock(surface),
}));

function makeProject() {
  return createProjectRecord('user-1', { title: 'El Plan de Escape' });
}

describe('buildCoverExportImageDataUrl (Fase G v2/legacy branch)', () => {
  test('a v2 DesignSurface renders through the canonical structured renderer', async () => {
    const project = makeProject();
    const surface = createEmptyDesignSurface('cover');
    surface.layers = [createDesignLayer({ type: 'text', content: 'El Plan de Escape', role: 'title', source: 'manual' }, 1)];
    project.cover.surfaceState = surface;

    const result = await buildCoverExportImageDataUrl(project);

    expect(renderMock).toHaveBeenCalledWith(expect.objectContaining({ version: 2, surface: 'cover' }));
    expect(result).toBe('data:image/png;base64,FAKE_V2_RENDER');
  });

  test('a legacy or absent surfaceState never calls the v2 renderer', async () => {
    renderMock.mockClear();
    const project = makeProject();
    project.cover.renderedImageUrl = 'data:image/png;base64,LEGACY';
    project.cover.surfaceState = null;

    const result = await buildCoverExportImageDataUrl(project);

    expect(renderMock).not.toHaveBeenCalled();
    expect(result).toBe('data:image/png;base64,LEGACY');
  });
});

describe('buildBackCoverExportImageDataUrl (Fase G v2/legacy branch)', () => {
  test('a v2 DesignSurface renders through the canonical structured renderer', async () => {
    renderMock.mockClear();
    const project = makeProject();
    const surface = createEmptyDesignSurface('back-cover');
    project.backCover.surfaceState = surface;

    const result = await buildBackCoverExportImageDataUrl(project);

    expect(renderMock).toHaveBeenCalledWith(expect.objectContaining({ version: 2, surface: 'back-cover' }));
    expect(result).toBe('data:image/png;base64,FAKE_V2_RENDER');
  });
});
