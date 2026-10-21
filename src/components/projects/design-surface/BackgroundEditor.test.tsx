import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { BackgroundEditor } from './BackgroundEditor';
import type { BackgroundSpec } from '@/lib/projects/design-surface';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const copy = resolveLocaleMessages('es').coverDesignSurface;

describe('BackgroundEditor', () => {
  test('background type choices share an evenly distributed segmented control', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8');
    const rule = css.match(/\.cover-prop-segmented\s*\{([^}]+)\}/)?.[1] ?? '';
    expect(rule).toContain('width: 100%');
    expect(rule).toContain('repeat(var(--cover-prop-segmented-columns, 3), minmax(0, 1fr))');
    expect(css).toContain('.cover-prop-segmented button {');
    expect(css).toContain('white-space: nowrap');
  });

  test('switching to gradient seeds a sensible two-stop default', () => {
    const onChange = vi.fn();
    const background: BackgroundSpec = { kind: 'solid', color: '#0b133f' };
    render(
      <BackgroundEditor background={background} copy={copy.background} colorPickerCopy={copy.colorPicker} onChange={onChange} onUploadFile={vi.fn()} />,
    );

    fireEvent.click(screen.getByTestId('background-kind-gradient-button'));
    const call = onChange.mock.calls[0][0];
    expect(call.kind).toBe('gradient');
    expect(call.stops).toHaveLength(2);
  });

  test('selecting no background preserves the option to leave the canvas transparent', () => {
    const onChange = vi.fn();
    const background: BackgroundSpec = { kind: 'solid', color: '#0b133f' };
    render(<BackgroundEditor background={background} copy={copy.background} colorPickerCopy={copy.colorPicker} onChange={onChange} onUploadFile={vi.fn()} />);
    fireEvent.click(screen.getByTestId('background-kind-transparent-button'));
    expect(onChange).toHaveBeenCalledWith({ kind: 'transparent' });
  });

  test('background image upload button uses the shared Talent button style', () => {
    render(<BackgroundEditor background={{ kind: 'image', src: '', fit: 'cover', opacity: 1 }} copy={copy.background} colorPickerCopy={copy.colorPicker} onChange={vi.fn()} onUploadFile={vi.fn()} />);
    expect(screen.getByTestId('background-image-upload-button')).toHaveClass('ac-button', 'ac-button--secondary', 'ac-button--compact');
  });

  test('gradient: adding a color stop appends one, removing requires more than two remaining', () => {
    const onChange = vi.fn();
    const background: BackgroundSpec = {
      kind: 'gradient',
      angle: 160,
      stops: [
        { color: '#000000', offset: 0 },
        { color: '#ffffff', offset: 1 },
      ],
    };
    render(
      <BackgroundEditor background={background} copy={copy.background} colorPickerCopy={copy.colorPicker} onChange={onChange} onUploadFile={vi.fn()} />,
    );

    // Only two stops — no remove button should be offered (mission: never let a gradient collapse to zero stops).
    expect(screen.queryByTestId('background-gradient-remove-stop-0')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('background-gradient-add-stop-button'));
    const call = onChange.mock.calls[0][0];
    expect(call.stops).toHaveLength(3);
  });

  test('switching to image mode exposes fit and opacity controls', () => {
    const onChange = vi.fn();
    const background: BackgroundSpec = { kind: 'image', src: 'https://blob.example/bg.png', fit: 'cover', opacity: 1 };
    render(
      <BackgroundEditor background={background} copy={copy.background} colorPickerCopy={copy.colorPicker} onChange={onChange} onUploadFile={vi.fn()} />,
    );

    expect(screen.getByTestId('background-image-fit-cover-button')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('background-image-fit-contain-button'));
    expect(onChange).toHaveBeenCalledWith({ ...background, fit: 'contain' });
  });

  test('toggling grayscale on an image background updates filters without touching other fields', () => {
    const onChange = vi.fn();
    const background: BackgroundSpec = { kind: 'image', src: 'https://blob.example/bg.png', fit: 'cover', opacity: 0.8 };
    render(
      <BackgroundEditor background={background} copy={copy.background} colorPickerCopy={copy.colorPicker} onChange={onChange} onUploadFile={vi.fn()} />,
    );

    const checkbox = screen.getByTestId('background-image-grayscale-checkbox');
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledWith({ ...background, filters: { grayscale: true } });
  });

  test('uploading a background image file calls onUploadFile', () => {
    const onUploadFile = vi.fn();
    const background: BackgroundSpec = { kind: 'image', src: '', fit: 'cover', opacity: 1 };
    render(
      <BackgroundEditor background={background} copy={copy.background} colorPickerCopy={copy.colorPicker} onChange={vi.fn()} onUploadFile={onUploadFile} />,
    );

    const file = new File(['x'], 'fondo.png', { type: 'image/png' });
    fireEvent.change(screen.getByTestId('background-image-file-input'), { target: { files: [file] } });
    expect(onUploadFile).toHaveBeenCalledWith(file);
  });
});
