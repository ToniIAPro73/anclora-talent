import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { CanvasRulers } from './CanvasRulers';

describe('CanvasRulers', () => {
  test('renders both rulers sized to the surface at 100% zoom', () => {
    render(<CanvasRulers width={400} height={600} zoom={1} />);
    const horizontal = screen.getByTestId('canvas-ruler-horizontal');
    const vertical = screen.getByTestId('canvas-ruler-vertical');
    expect(horizontal).toHaveStyle({ width: '400px' });
    expect(vertical).toHaveStyle({ height: '600px' });
  });

  test('scales tick spacing with zoom', () => {
    const { container: at100 } = render(<CanvasRulers width={400} height={600} zoom={1} />);
    const { container: at50 } = render(<CanvasRulers width={400} height={600} zoom={0.5} />);

    const tickAt100 = at100.querySelector('[data-testid="canvas-ruler-horizontal"] div');
    const tickAt50 = at50.querySelector('[data-testid="canvas-ruler-horizontal"] div');
    expect(tickAt100?.getAttribute('style')).toContain('left: 0px');
    expect(tickAt50).toBeTruthy();
  });

  test('shows a cursor position indicator only when a position is provided', () => {
    const { rerender } = render(<CanvasRulers width={400} height={600} zoom={1} cursorPosition={null} />);
    expect(screen.queryByTestId('canvas-ruler-horizontal-indicator')).not.toBeInTheDocument();

    rerender(<CanvasRulers width={400} height={600} zoom={1} cursorPosition={{ x: 120, y: 80 }} />);
    expect(screen.getByTestId('canvas-ruler-horizontal-indicator')).toHaveStyle({ left: '120px' });
    expect(screen.getByTestId('canvas-ruler-vertical-indicator')).toHaveStyle({ top: '80px' });
  });
});
