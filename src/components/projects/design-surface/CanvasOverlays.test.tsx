import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { CanvasOverlays } from './CanvasOverlays';

const copy = {
  addVerticalGuideLabel: 'Añadir guía vertical',
  addHorizontalGuideLabel: 'Añadir guía horizontal',
  removeGuideLabel: 'Quitar guía',
};

describe('CanvasOverlays', () => {
  test('no grid by default, opts in per density', () => {
    const { rerender } = render(
      <CanvasOverlays width={400} height={600} zoom={1} guides={[]} onGuidesChange={vi.fn()} showSafeArea={false} grid="none" copy={copy} />,
    );
    expect(screen.queryByTestId(/canvas-grid-/)).not.toBeInTheDocument();

    rerender(
      <CanvasOverlays width={400} height={600} zoom={1} guides={[]} onGuidesChange={vi.fn()} showSafeArea={false} grid="fine" copy={copy} />,
    );
    expect(screen.getByTestId('canvas-grid-fine')).toBeInTheDocument();
  });

  test('safe area only renders when both showSafeArea is true and a safeArea spec is provided', () => {
    const { rerender } = render(
      <CanvasOverlays width={400} height={600} zoom={1} guides={[]} onGuidesChange={vi.fn()} showSafeArea grid="none" copy={copy} />,
    );
    expect(screen.queryByTestId('canvas-safe-area')).not.toBeInTheDocument();

    rerender(
      <CanvasOverlays
        width={400}
        height={600}
        zoom={1}
        guides={[]}
        onGuidesChange={vi.fn()}
        showSafeArea
        safeArea={{ top: 20, right: 20, bottom: 20, left: 20 }}
        grid="none"
        copy={copy}
      />,
    );
    expect(screen.getByTestId('canvas-safe-area')).toBeInTheDocument();
  });

  test('ISBN area renders only when provided (back-cover helper, mission §39)', () => {
    const { rerender } = render(
      <CanvasOverlays width={400} height={600} zoom={1} guides={[]} onGuidesChange={vi.fn()} showSafeArea={false} grid="none" copy={copy} />,
    );
    expect(screen.queryByTestId('canvas-isbn-area')).not.toBeInTheDocument();

    rerender(
      <CanvasOverlays
        width={400}
        height={600}
        zoom={1}
        guides={[]}
        onGuidesChange={vi.fn()}
        showSafeArea={false}
        isbnArea={{ x: 300, y: 500, width: 80, height: 40 }}
        grid="none"
        copy={copy}
      />,
    );
    expect(screen.getByTestId('canvas-isbn-area')).toBeInTheDocument();
  });

  test('adding a vertical guide appends one centered at width/2', () => {
    const onGuidesChange = vi.fn();
    render(<CanvasOverlays width={400} height={600} zoom={1} guides={[]} onGuidesChange={onGuidesChange} showSafeArea={false} grid="none" copy={copy} />);

    fireEvent.click(screen.getByTestId('add-vertical-guide-button'));
    expect(onGuidesChange).toHaveBeenCalledWith([expect.objectContaining({ axis: 'x', position: 200 })]);
  });

  test('double-clicking a guide removes it', () => {
    const onGuidesChange = vi.fn();
    const guides = [{ id: 'g1', axis: 'x' as const, position: 100 }];
    render(<CanvasOverlays width={400} height={600} zoom={1} guides={guides} onGuidesChange={onGuidesChange} showSafeArea={false} grid="none" copy={copy} />);

    fireEvent.doubleClick(screen.getByTestId('design-guide-g1'));
    expect(onGuidesChange).toHaveBeenCalledWith([]);
  });

  test('the remove button on a guide also removes it', () => {
    const onGuidesChange = vi.fn();
    const guides = [{ id: 'g1', axis: 'y' as const, position: 300 }];
    render(<CanvasOverlays width={400} height={600} zoom={1} guides={guides} onGuidesChange={onGuidesChange} showSafeArea={false} grid="none" copy={copy} />);

    fireEvent.click(screen.getByTestId('design-guide-remove-g1'));
    expect(onGuidesChange).toHaveBeenCalledWith([]);
  });

  test('clears all guides when clear guides button is clicked', () => {
    const onGuidesChange = vi.fn();
    const guides = [
      { id: 'g1', axis: 'x' as const, position: 150 },
      { id: 'g2', axis: 'y' as const, position: 250 },
    ];
    render(<CanvasOverlays width={400} height={600} zoom={1} guides={guides} onGuidesChange={onGuidesChange} showSafeArea={false} grid="none" copy={copy} />);

    const clearButton = screen.getByTestId('clear-guides-button');
    expect(clearButton).toBeInTheDocument();
    fireEvent.click(clearButton);
    expect(onGuidesChange).toHaveBeenCalledWith([]);
  });
});
