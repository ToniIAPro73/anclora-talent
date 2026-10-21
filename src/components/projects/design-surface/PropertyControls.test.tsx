import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CompactNumberField } from './PropertyControls';

describe('CompactNumberField', () => {
  it('keeps an editable draft so a value can be cleared and replaced with multiple digits', () => {
    const onChange = vi.fn();
    render(<CompactNumberField label="Aa" value={8} min={8} max={160} onChange={onChange} testId="font-size" suggestions={[8, 12, 18]} />);
    const input = screen.getByTestId('font-size');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    expect(input).toHaveValue(null);
    fireEvent.change(input, { target: { value: '1' } });
    fireEvent.change(input, { target: { value: '18' } });

    expect(input).toHaveValue(18);
    expect(onChange).toHaveBeenLastCalledWith(18);
    expect(input).toHaveAttribute('list');
  });

  it('restores the committed value when an empty draft blurs', () => {
    render(<CompactNumberField label="Aa" value={14} onChange={vi.fn()} testId="font-size" />);
    const input = screen.getByTestId('font-size');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(input).toHaveValue(14);
  });
});
