import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { ColorPickerField } from './ColorPickerField';
import { resolveLocaleMessages } from '@/lib/i18n/messages';

const copy = resolveLocaleMessages('es').coverDesignSurface.colorPicker;

describe('ColorPickerField', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('shows the current value and opens the popover on click', () => {
    render(<ColorPickerField label="Color" value="#0b133f" onChange={vi.fn()} copy={copy} testId="color-field" />);

    expect(screen.getByTestId('color-field-toggle')).toHaveTextContent('#0b133f');
    fireEvent.click(screen.getByTestId('color-field-toggle'));
    expect(screen.getByText(copy.paletteLabel)).toBeInTheDocument();
  });

  test('clicking a palette swatch commits the color and records it as recent', () => {
    const onChange = vi.fn();
    render(<ColorPickerField label="Color" value="#0b133f" onChange={onChange} copy={copy} testId="color-field" />);
    fireEvent.click(screen.getByTestId('color-field-toggle'));

    fireEvent.click(screen.getByTestId('color-field-swatch-d4af37'));
    expect(onChange).toHaveBeenCalledWith('#d4af37');

    expect(JSON.parse(window.localStorage.getItem('anclora-cover-studio-recent-colors-v1') ?? '[]')).toContain('#d4af37');
  });

  test('brand colors render as an extra preset row when provided', () => {
    render(
      <ColorPickerField label="Color" value="#0b133f" onChange={vi.fn()} copy={copy} testId="color-field" brandColors={['#ABCDEF']} />,
    );
    fireEvent.click(screen.getByTestId('color-field-toggle'));
    expect(screen.getByTestId('color-field-brand-ABCDEF')).toBeInTheDocument();
  });

  test('no brand colors -> no brand section rendered', () => {
    render(<ColorPickerField label="Color" value="#0b133f" onChange={vi.fn()} copy={copy} testId="color-field" />);
    fireEvent.click(screen.getByTestId('color-field-toggle'));
    expect(screen.queryByText(copy.brandColorsLabel)).not.toBeInTheDocument();
  });
});
