import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { DesignSurfaceRenderer } from './DesignSurfaceRenderer';
import { createDesignLayer, createEmptyDesignSurface, type DesignSurface } from '@/lib/projects/design-surface';

function makeSurface(overrides: Partial<DesignSurface> = {}): DesignSurface {
  return {
    ...createEmptyDesignSurface('cover'),
    background: { kind: 'solid', color: '#0b133f' },
    layers: [
      createDesignLayer({ type: 'text', content: 'El Plan de Escape', role: 'title', source: 'manual' }, 1),
    ],
    ...overrides,
  };
}

describe('DesignSurfaceRenderer', () => {
  test('renders every visible layer in zIndex order', () => {
    const surface = makeSurface({
      layers: [
        createDesignLayer({ type: 'text', content: 'Autor', role: 'author', source: 'manual' }, 2),
        createDesignLayer({ type: 'text', content: 'El Plan de Escape', role: 'title', source: 'manual' }, 1),
      ],
    });
    render(<DesignSurfaceRenderer surface={surface} />);
    const root = screen.getByTestId('design-surface-renderer');
    const texts = Array.from(root.querySelectorAll('[data-testid^="design-surface-renderer-text-"]'));
    expect(texts).toHaveLength(2);
    expect(texts[0]).toHaveTextContent('El Plan de Escape');
    expect(texts[1]).toHaveTextContent('Autor');
  });

  test('excludes a layer with visible:false', () => {
    const surface = makeSurface();
    surface.layers = [{ ...surface.layers[0], visible: false } as DesignSurface['layers'][number]];
    render(<DesignSurfaceRenderer surface={surface} />);
    expect(screen.queryByTestId(`design-surface-renderer-text-${surface.layers[0].id}`)).not.toBeInTheDocument();
  });

  test('never renders guides, safe area, or the ISBN helper area', () => {
    const surface = makeSurface({
      guides: [{ id: 'g1', axis: 'x', position: 50 }],
      safeArea: { top: 10, right: 10, bottom: 10, left: 10 },
      isbnArea: { x: 0, y: 0, width: 50, height: 30 },
    });
    render(<DesignSurfaceRenderer surface={surface} />);
    const root = screen.getByTestId('design-surface-renderer');
    expect(root.innerHTML).not.toMatch(/guide|safe-area|isbn/i);
  });

  test('applies text-transform to the rendered string without mutating the persisted content', () => {
    const surface = makeSurface({
      layers: [createDesignLayer({ type: 'text', content: 'autor demo', role: 'author', source: 'manual', textTransform: 'uppercase' }, 1)],
    });
    render(<DesignSurfaceRenderer surface={surface} />);
    expect(screen.getByTestId(`design-surface-renderer-text-${surface.layers[0].id}`)).toHaveTextContent('AUTOR DEMO');
    expect(surface.layers[0]).toMatchObject({ content: 'autor demo' });
  });

  test('renders an image background', () => {
    const surface = makeSurface({ background: { kind: 'image', src: 'https://blob.example/bg.png', fit: 'cover', opacity: 1 } });
    render(<DesignSurfaceRenderer surface={surface} />);
    expect(screen.getByTestId('design-surface-renderer-background-image')).toHaveAttribute('src', 'https://blob.example/bg.png');
  });
});
