import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
  afterEach(() => vi.restoreAllMocks());

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

  it('quotes family names so names with digits (Source Serif 4) are not dropped by the browser', () => {
    render(<FontSelector selectedFont="Family 007" onFontSelect={vi.fn()} compact />);
    expect(screen.getByTestId('font-selector-toggle').querySelector('span')!.style.fontFamily).toBe('"Family 007"');
    fireEvent.click(screen.getByTestId('font-selector-toggle'));
    const option = screen.getByTestId('font-option-family-008').querySelector('span')!;
    expect(option.style.fontFamily).toBe('"Family 008"');
  });

  it('keeps the search and category chrome compact while the font results own vertical scrolling', () => {
    render(<FontSelector selectedFont="Family 000" onFontSelect={vi.fn()} compact />);
    fireEvent.click(screen.getByTestId('font-selector-toggle'));

    expect(screen.getByTestId('font-selector-dropdown')).toHaveAttribute('data-placement', 'down');
    expect(screen.getByTestId('font-selector-search-input')).toHaveClass('font-selector-search-input');
    expect(screen.getByTestId('font-selector-categories')).toHaveClass('font-selector-categories');
    expect(screen.getByTestId('font-selector-list')).toHaveClass('font-selector-list');
  });

  it('opens toward the side with sufficient visible space and stays within a short viewport', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 480 });
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 360 });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 24, y: 410, top: 410, right: 204, bottom: 438, left: 24, width: 180, height: 28,
      toJSON: () => ({}),
    } as DOMRect);

    render(<FontSelector selectedFont="Family 000" onFontSelect={vi.fn()} compact />);
    fireEvent.click(screen.getByTestId('font-selector-toggle'));

    const dropdown = screen.getByTestId('font-selector-dropdown');
    expect(dropdown).toHaveAttribute('data-placement', 'up');
    expect(Number.parseFloat((dropdown as HTMLDivElement).style.maxHeight)).toBeLessThanOrEqual(394);
    expect(Number.parseFloat((dropdown as HTMLDivElement).style.maxHeight)).toBeGreaterThan(0);
    expect(Number.parseFloat((dropdown as HTMLDivElement).style.width)).toBeLessThanOrEqual(344);
  });

  it('repositions an open picker after scrolling and resizing the viewport', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 600 });
    const rect = { x: 20, y: 500, top: 500, right: 220, bottom: 528, left: 20, width: 200, height: 28, toJSON: () => ({}) };
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => rect as DOMRect);

    render(<FontSelector selectedFont="Family 000" onFontSelect={vi.fn()} compact />);
    fireEvent.click(screen.getByTestId('font-selector-toggle'));
    const dropdown = screen.getByTestId('font-selector-dropdown');
    expect(dropdown).toHaveAttribute('data-placement', 'up');

    Object.assign(rect, { y: 24, top: 24, bottom: 52 });
    fireEvent.scroll(window);
    expect(dropdown).toHaveAttribute('data-placement', 'down');
    expect(dropdown).toHaveStyle({ top: '58px' });

    Object.assign(rect, { y: 520, top: 520, bottom: 548 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 560 });
    fireEvent(window, new Event('resize'));
    expect(dropdown).toHaveAttribute('data-placement', 'up');
  });
});
