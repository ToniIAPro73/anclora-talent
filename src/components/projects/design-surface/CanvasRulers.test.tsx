import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { CanvasRulers, rulerMajorStep } from './CanvasRulers';

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

  test('the labelled step adapts to the zoom so labels stay readable (>= 48 screen px apart)', () => {
    for (const zoom of [0.25, 0.5, 0.73, 1, 1.5, 2.5]) {
      const step = rulerMajorStep(zoom);
      expect(step * zoom).toBeGreaterThanOrEqual(48);
    }
    expect(rulerMajorStep(1)).toBe(50);
    expect(rulerMajorStep(2.5)).toBe(20);
    expect(rulerMajorStep(0.5)).toBe(100);
  });

  test('origin is the top-left of the cover and labels are in surface pixels', () => {
    render(<CanvasRulers width={400} height={600} zoom={1} />);
    const rulers = screen.getByTestId('canvas-rulers');
    expect(rulers).toHaveStyle({ left: '-20px', top: '-20px' });
    expect(rulers).toHaveAttribute('data-ruler-step', '50');
    const labels = [...screen.getByTestId('canvas-ruler-horizontal').querySelectorAll('.cover-ruler__label')].map((node) => node.textContent);
    expect(labels).toEqual(['0', '50', '100', '150', '200', '250', '300', '350', '400']);
  });
});
