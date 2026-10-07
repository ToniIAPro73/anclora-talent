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
  width = 84,
}: {
  template: EditorialTemplate;
  surfaceKind: DesignSurface['surface'];
  width?: number;
}) {
  const surface = useMemo(() => {
    // Templates carry no text of their own (it comes from the manuscript), so the miniature is
    // built with neutral sample content to make the composition readable. Fields the template
    // hides stay hidden, exactly as when it is applied.
    const built = buildDesignSurfaceFromTemplate(template, {
      palette: template.surface === 'back-cover' ? (template.previewTone as 'obsidian' | 'teal' | 'sand') : 'obsidian',
      binding: { title: 'Título', subtitle: 'Subtítulo del libro', author: 'Autor', body: 'Texto de la contraportada: una sinopsis breve que invita a leer el libro.', authorBio: 'Sobre el autor' },
    });
    // Stable ids: the builder mints random ones, which would differ between server and client render.
    const layers = built.layers.map((layer, index) => ({ ...layer, id: `${template.id}-thumb-${index}` }));
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
