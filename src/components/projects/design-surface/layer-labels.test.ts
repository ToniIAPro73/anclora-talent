import { describe, expect, it } from 'vitest';
import { createDesignLayer } from '@/lib/projects/design-surface';
import { resolveLayerLabel, type LayerLabelCopy } from './layer-labels';

const copy: LayerLabelCopy = {
  untitledText: 'Texto',
  untitledImage: 'Imagen',
  untitledShape: 'Forma',
  roleTitle: 'Título',
  roleSubtitle: 'Subtítulo',
  roleAuthor: 'Autor',
  roleBody: 'Cuerpo',
  roleAuthorBio: 'Biografía',
  backgroundImage: 'Imagen de fondo',
  lineLabel: 'Línea',
  iconLabel: 'Icono',
  overlayLabel: 'Superposición',
};
const surface = { width: 400, height: 600 };

describe('resolveLayerLabel', () => {
  it('names role-tagged text by role, never by its content', () => {
    const title = createDesignLayer({ type: 'text', role: 'title', content: 'La atención deliberada' }, 1);
    const subtitle = createDesignLayer({ type: 'text', role: 'subtitle', content: 'Sistemas para pensar, decidir y crear en un mundo' }, 2);
    const author = createDesignLayer({ type: 'text', role: 'author', content: '', name: 'Texto' }, 3);
    const layers = [title, subtitle, author];
    expect(layers.map((l) => resolveLayerLabel(l, layers, copy, surface))).toEqual(['Título', 'Subtítulo', 'Autor']);
  });

  it('replaces editor-assigned kind names ("Text", "Texto") with clean numbered labels', () => {
    const a = createDesignLayer({ type: 'text', content: 'uno', name: 'Text' }, 1);
    const b = createDesignLayer({ type: 'text', content: 'dos', name: 'Texto' }, 2);
    const layers = [a, b];
    expect(resolveLayerLabel(a, layers, copy, surface)).toBe('Texto 1');
    expect(resolveLayerLabel(b, layers, copy, surface)).toBe('Texto 2');
  });

  it('a single free text is just "Texto" (no needless number)', () => {
    const only = createDesignLayer({ type: 'text', content: 'hola', name: 'Text' }, 1);
    expect(resolveLayerLabel(only, [only], copy, surface)).toBe('Texto');
  });

  it('keeps a name typed by the user', () => {
    const layer = createDesignLayer({ type: 'text', content: 'x', name: 'Mi lema' }, 1);
    expect(resolveLayerLabel(layer, [layer], copy, surface)).toBe('Mi lema');
  });

  it('classifies images, background images, shapes, lines, icons and overlays', () => {
    const bg = createDesignLayer({ type: 'image', src: 'x', x: 0, y: 0, width: 400, height: 600, name: 'cover.jpg' }, 1);
    const logo = createDesignLayer({ type: 'image', src: 'x', x: 10, y: 10, width: 80, height: 80, name: 'Image' }, 2);
    const line = createDesignLayer({ type: 'shape', shape: 'line', name: 'Line' }, 3);
    const icon = createDesignLayer({ type: 'shape', shape: 'ellipse', name: 'Icon' }, 4);
    const overlay = createDesignLayer({ type: 'shape', shape: 'rect', name: 'Overlay', x: 0, y: 0, width: 400, height: 600, opacity: 0.4 }, 5);
    const rect = createDesignLayer({ type: 'shape', shape: 'rect', x: 20, y: 20, width: 100, height: 100 }, 6);
    const layers = [bg, logo, line, icon, overlay, rect];
    expect(resolveLayerLabel(bg, layers, copy, surface)).toBe('cover.jpg'); // user-supplied file name kept
    expect(resolveLayerLabel(logo, layers, copy, surface)).toBe('Imagen');
    expect(resolveLayerLabel(line, layers, copy, surface)).toBe('Línea');
    expect(resolveLayerLabel(icon, layers, copy, surface)).toBe('Icono');
    expect(resolveLayerLabel(overlay, layers, copy, surface)).toBe('Superposición');
    expect(resolveLayerLabel(rect, layers, copy, surface)).toBe('Forma');
  });

  it('unnamed full-bleed image is the background image', () => {
    const bg = createDesignLayer({ type: 'image', src: 'x', x: 0, y: 0, width: 400, height: 600 }, 1);
    expect(resolveLayerLabel(bg, [bg], copy, surface)).toBe('Imagen de fondo');
  });
});
