'use client';

import { useMemo } from 'react';
import type { EditorialTemplate } from '@/lib/projects/cover-templates';
import { buildDesignSurfaceFromTemplate } from '@/lib/projects/design-surface-templates';
import type { DesignSurface } from '@/lib/projects/design-surface';
import { DesignSurfaceRenderer } from './DesignSurfaceRenderer';

/**
 * A real miniature of what applying the template produces (same geometry and
 * typography as the canvas), instead of an unrelated stock picture. The
 * renderer lays out in surface pixels, so it is rendered at natural size and
 * scaled down as a whole.
 */
export function TemplateThumbnail({
  template,
  surfaceKind,
  width = 64,
}: {
  template: EditorialTemplate;
  surfaceKind: DesignSurface['surface'];
  width?: number;
}) {
  const surface = useMemo(() => {
    const built = buildDesignSurfaceFromTemplate(template, { palette: 'obsidian' });
    // Templates carry no text of their own (it comes from the document's metadata),
    // so the miniature shows neutral sample copy to make the composition readable.
    const sample: Record<string, string> = { title: 'Título', subtitle: 'Subtítulo del libro', author: 'Autor', body: 'Texto', authorBio: 'Autor' };
    // Stable ids: the builder mints random ones, which would differ between server and client render.
    const layers = built.layers.map((layer, index) => {
      const stable = { ...layer, id: `${template.id}-thumb-${index}` };
      return stable.type === 'text'
        ? { ...stable, content: stable.content.trim() ? stable.content : (sample[stable.role] ?? 'Texto'), visible: true }
        : stable;
    });
    return { ...built, layers, surface: surfaceKind };
  }, [surfaceKind, template]);
  const scale = width / surface.width;

  return (
    <div
      className="cover-template-thumb"
      style={{ width, height: surface.height * scale }}
      aria-hidden="true"
      data-testid={`cover-template-thumb-${template.id}`}
    >
      <div style={{ width: surface.width, height: surface.height, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <DesignSurfaceRenderer surface={surface} />
      </div>
    </div>
  );
}
