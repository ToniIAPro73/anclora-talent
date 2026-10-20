import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { BasicCoverEditor } from './BasicCoverEditor';
import { createDesignLayer, createEmptyDesignSurface, type DesignSurface } from '@/lib/projects/design-surface';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { BACK_COVER_TEMPLATES, COVER_TEMPLATES } from '@/lib/projects/cover-templates';

const copy = resolveLocaleMessages('es').coverDesignSurface;

function makeSurface(kind: 'cover' | 'back-cover' = 'cover'): DesignSurface {
  const surface = createEmptyDesignSurface(kind);
  surface.layers = [
    createDesignLayer({ type: 'text', role: 'title', source: 'manual', content: 'El Plan de Escape', x: 10, y: 20, width: 300, height: 60 }, 1),
  ];
  return surface;
}

describe('BasicCoverEditor', () => {
  test('renders the compact template selector and existing field editors', () => {
    render(<BasicCoverEditor surface={makeSurface()} onChange={vi.fn()} copy={copy} palette="obsidian" onPaletteChange={vi.fn()} />);
    expect(screen.getByTestId('basic-template-select')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: COVER_TEMPLATES[0].name })).toBeInTheDocument();
    expect(screen.getByTestId('basic-field-title')).toBeInTheDocument();
    expect(screen.getByTestId('basic-field-title-content-input')).toHaveValue('El Plan de Escape');
  });

  test('back-cover Basic mode exposes synopsis and author biography fields and uses back-cover templates', () => {
    const surface = makeSurface('back-cover');
    surface.layers = [
      createDesignLayer({ type: 'text', role: 'body', source: 'manual', content: 'Sinopsis de prueba' }, 1),
      createDesignLayer({ type: 'text', role: 'authorBio', source: 'manual', content: 'Biografía de prueba' }, 2),
    ];
    render(<BasicCoverEditor surface={surface} onChange={vi.fn()} copy={copy} palette="obsidian" onPaletteChange={vi.fn()} />);
    expect(screen.getByTestId('basic-field-body-content-input')).toHaveValue('Sinopsis de prueba');
    expect(screen.getByTestId('basic-field-authorBio-content-input')).toHaveValue('Biografía de prueba');
    expect(screen.getByRole('option', { name: BACK_COVER_TEMPLATES[0].name })).toBeInTheDocument();
  });

  test('a field with no layer yet offers an add button instead of controls', () => {
    render(<BasicCoverEditor surface={makeSurface()} onChange={vi.fn()} copy={copy} palette="obsidian" onPaletteChange={vi.fn()} />);
    expect(screen.getByTestId('basic-field-subtitle-add-button')).toBeInTheDocument();
    expect(screen.queryByTestId('basic-field-subtitle-content-input')).not.toBeInTheDocument();
  });

  test('clicking the add button on a missing field creates a real text layer via onChange', () => {
    const onChange = vi.fn();
    render(<BasicCoverEditor surface={makeSurface()} onChange={onChange} copy={copy} palette="obsidian" onPaletteChange={vi.fn()} />);
    fireEvent.click(screen.getByTestId('basic-field-subtitle-add-button'));
    const next: DesignSurface = onChange.mock.calls[0][0];
    const subtitle = next.layers.find((l) => l.type === 'text' && l.role === 'subtitle');
    expect(subtitle).toBeDefined();
  });

  test('editing content updates only that field layer', () => {
    const onChange = vi.fn();
    render(<BasicCoverEditor surface={makeSurface()} onChange={onChange} copy={copy} palette="obsidian" onPaletteChange={vi.fn()} />);
    fireEvent.change(screen.getByTestId('basic-field-title-content-input'), { target: { value: 'Nuevo título' } });
    const next: DesignSurface = onChange.mock.calls[0][0];
    expect(next.layers).toHaveLength(1);
    expect((next.layers[0] as { content: string }).content).toBe('Nuevo título');
  });

  test('toggling visibility flips the flag without touching content', () => {
    const onChange = vi.fn();
    render(<BasicCoverEditor surface={makeSurface()} onChange={onChange} copy={copy} palette="obsidian" onPaletteChange={vi.fn()} />);
    fireEvent.click(screen.getByTestId('basic-field-title-visibility-toggle'));
    const next: DesignSurface = onChange.mock.calls[0][0];
    const title = next.layers.find((l) => l.type === 'text' && l.role === 'title') as { visible: boolean; content: string };
    expect(title.visible).toBe(false);
    expect(title.content).toBe('El Plan de Escape');
  });

  test('selecting a template on a non-empty design asks for confirmation before instantiating real positioned layers', () => {
    const onChange = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<BasicCoverEditor surface={makeSurface()} onChange={onChange} copy={copy} palette="obsidian" onPaletteChange={vi.fn()} />);
    fireEvent.change(screen.getByTestId('basic-template-select'), { target: { value: COVER_TEMPLATES[0].id } });
    expect(confirmSpy).toHaveBeenCalled();
    const next: DesignSurface = onChange.mock.calls[0][0];
    expect(next.layers.length).toBeGreaterThan(0);
    expect(next.layers.every((l) => l.type !== 'text' || typeof l.x === 'number')).toBe(true);
    confirmSpy.mockRestore();
  });

  test('canceling the confirmation leaves the design untouched', () => {
    const onChange = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<BasicCoverEditor surface={makeSurface()} onChange={onChange} copy={copy} palette="obsidian" onPaletteChange={vi.fn()} />);
    fireEvent.change(screen.getByTestId('basic-template-select'), { target: { value: COVER_TEMPLATES[0].id } });
    expect(onChange).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  test('selecting a template on an already-empty design applies it without asking for confirmation', () => {
    const onChange = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm');
    const surface = createEmptyDesignSurface('cover');
    render(<BasicCoverEditor surface={surface} onChange={onChange} copy={copy} palette="obsidian" onPaletteChange={vi.fn()} />);
    fireEvent.change(screen.getByTestId('basic-template-select'), { target: { value: COVER_TEMPLATES[0].id } });
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  test('selecting a palette preset recolors the surface and reports the new palette', () => {
    const onChange = vi.fn();
    const onPaletteChange = vi.fn();
    render(<BasicCoverEditor surface={makeSurface()} onChange={onChange} copy={copy} palette="obsidian" onPaletteChange={onPaletteChange} />);
    fireEvent.click(screen.getByTestId('basic-palette-teal-button'));
    expect(onPaletteChange).toHaveBeenCalledWith('teal');
    const next: DesignSurface = onChange.mock.calls[0][0];
    expect(next.background).toEqual({ kind: 'solid', color: '#124a50' });
  });

  test('renders live preview renderer next to controls', () => {
    render(<BasicCoverEditor surface={makeSurface()} onChange={vi.fn()} copy={copy} palette="obsidian" onPaletteChange={vi.fn()} />);
    expect(screen.getByTestId('design-surface-renderer')).toBeInTheDocument();
    expect(screen.getByText('Vista previa en tiempo real')).toBeInTheDocument();
  });

  test('selecting a template preserves existing text content for matching roles', () => {
    const onChange = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<BasicCoverEditor surface={makeSurface()} onChange={onChange} copy={copy} palette="obsidian" onPaletteChange={vi.fn()} />);
    fireEvent.change(screen.getByTestId('basic-template-select'), { target: { value: COVER_TEMPLATES[1].id } });
    expect(onChange).toHaveBeenCalled();
    const next: DesignSurface = onChange.mock.calls[0][0];
    const titleLayer = next.layers.find((l) => l.type === 'text' && l.role === 'title');
    expect(titleLayer).toBeDefined();
    expect((titleLayer as { content: string }).content).toBe('El Plan de Escape');
    confirmSpy.mockRestore();
  });

  test('adding an image creates an image layer above the rest', async () => {
    const onChange = vi.fn();
    render(<BasicCoverEditor surface={makeSurface()} onChange={onChange} copy={copy} palette="obsidian" onPaletteChange={vi.fn()} />);
    const file = new File(['x'], 'foto.png', { type: 'image/png' });
    fireEvent.change(screen.getByTestId('basic-image-file-input'), { target: { files: [file] } });

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const next: DesignSurface = onChange.mock.calls[0][0];
    expect(next.layers.some((l) => l.type === 'image')).toBe(true);
  });
});
