import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FontSelector } from './FontSelector';

const fonts = Array.from({ length: 120 }, (_, i) => ({
  family: `Family ${String(i).padStart(3, '0')}`,
  variants: ['400'],
  category: i % 3 === 0 ? 'serif' : i % 3 === 1 ? 'sans-serif' : 'display',
  kind: 'google',
}));

vi.mock('@/hooks/use-google-fonts', () => ({
  useGoogleFonts: () => ({ fonts, loadFont: vi.fn() }),
}));

describe('FontSelector (compact picker)', () => {
  it('keeps the full list in one scroll container below fixed chrome, with compact one-row categories', () => {
    render(<FontSelector selectedFont="Family 000" onFontSelect={vi.fn()} compact />);
    fireEvent.click(screen.getByTestId('font-selector-toggle'));

    const list = screen.getByTestId('font-selector-list');
    expect(list).toHaveClass('overflow-y-auto', 'flex-1', 'min-h-0');
    expect(screen.getByTestId('font-selector-dropdown')).toHaveClass('flex-col', 'overflow-hidden');
    expect(screen.getByTestId('font-selector-categories')).toHaveClass('overflow-x-auto');
    expect(screen.getByTestId('font-selector-categories')).not.toHaveClass('flex-wrap');
    // Every family stays reachable (no silent truncation).
    expect(list.querySelectorAll('[role="option"]')).toHaveLength(120);
  });

  it('search + category filter and keyboard selection apply the font immediately', () => {
    const onFontSelect = vi.fn();
    render(<FontSelector selectedFont="Family 000" onFontSelect={onFontSelect} compact />);
    fireEvent.click(screen.getByTestId('font-selector-toggle'));

    fireEvent.click(screen.getByTestId('font-selector-category-display-button'));
    fireEvent.change(screen.getByTestId('font-selector-search-input'), { target: { value: 'family 11' } });
    const input = screen.getByTestId('font-selector-search-input');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onFontSelect).toHaveBeenCalledTimes(1);
    expect(onFontSelect.mock.calls[0][0]).toMatch(/^Family 11\d$/);
    expect(screen.queryByTestId('font-selector-list')).not.toBeInTheDocument();
  });
});
