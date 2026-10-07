'use client';

/**
 * Cover Studio v2 — rulers (08C). Origin is the top-left of the cover, units are surface pixels. Tick spacing
 * adapts to the zoom so the labelled step stays at least ~48 screen px apart at every zoom level. Pure overlay:
 * it is positioned outside the paper and never takes part in the canvas layout or the export.
 */

const STEPS = [10, 20, 50, 100, 200, 500, 1000];
const MIN_LABEL_SPACING = 48;
export const CANVAS_RULER_THICKNESS = 20;

/** Smallest "nice" step whose on-screen spacing is readable at this zoom. */
export function rulerMajorStep(zoom: number): number {
  return STEPS.find((step) => step * zoom >= MIN_LABEL_SPACING) ?? STEPS[STEPS.length - 1];
}

function buildTicks(length: number, major: number) {
  const minor = major / 5;
  const ticks: Array<{ position: number; label: boolean }> = [];
  for (let position = 0; position <= length + 0.001; position += minor) {
    const rounded = Math.round(position * 100) / 100;
    ticks.push({ position: rounded, label: Math.abs(rounded % major) < 0.001 });
  }
  return ticks;
}

export interface CanvasRulersProps {
  width: number;
  height: number;
  zoom: number;
}

export function CanvasRulers({ width, height, zoom }: CanvasRulersProps) {
  const major = rulerMajorStep(zoom);
  const horizontalTicks = buildTicks(width, major);
  const verticalTicks = buildTicks(height, major);
  const thickness = CANVAS_RULER_THICKNESS;

  return (
    <div
      data-testid="canvas-rulers"
      data-ruler-step={major}
      className="pointer-events-none absolute"
      // The ruler origin (0,0) coincides with the top-left corner of the cover paper.
      style={{ left: -thickness, top: -thickness, width: width * zoom + thickness, height: height * zoom + thickness }}
      aria-hidden="true"
    >
      <div
        data-testid="canvas-ruler-horizontal"
        className="cover-ruler cover-ruler--horizontal"
        style={{ left: thickness, width: width * zoom, height: thickness }}
      >
        {horizontalTicks.map((tick) => (
          <div key={tick.position} className="cover-ruler__tick" style={{ left: tick.position * zoom, height: tick.label ? '100%' : '40%' }}>
            {tick.label && <span className="cover-ruler__label">{tick.position}</span>}
          </div>
        ))}
      </div>
      <div
        data-testid="canvas-ruler-vertical"
        className="cover-ruler cover-ruler--vertical"
        style={{ top: thickness, width: thickness, height: height * zoom }}
      >
        {verticalTicks.map((tick) => (
          <div key={tick.position} className="cover-ruler__tick" style={{ top: tick.position * zoom, width: tick.label ? '100%' : '40%' }}>
            {tick.label && <span className="cover-ruler__label cover-ruler__label--vertical">{tick.position}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
