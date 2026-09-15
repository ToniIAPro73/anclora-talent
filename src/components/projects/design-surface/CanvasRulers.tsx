'use client';

/**
 * Cover Studio v2 — rulers (mission §13). Fixed-interval tick marks (every
 * 50 logical px, labeled every 100) scaled by the current zoom — simpler
 * than adaptive tick density, still gives coherent, readable units at every
 * zoom level the editor actually offers (roughly 25%-200%).
 */

const TICK_INTERVAL = 50;
const LABEL_INTERVAL = 100;
const RULER_THICKNESS = 20;

function buildTicks(length: number) {
  const ticks: Array<{ position: number; label: boolean }> = [];
  for (let position = 0; position <= length; position += TICK_INTERVAL) {
    ticks.push({ position, label: position % LABEL_INTERVAL === 0 });
  }
  return ticks;
}

export interface CanvasRulersProps {
  width: number;
  height: number;
  zoom: number;
  /** Current pointer position in logical surface units, for the moving position indicator (null when the pointer is outside the canvas). */
  cursorPosition?: { x: number; y: number } | null;
}

export function CanvasRulers({ width, height, zoom, cursorPosition }: CanvasRulersProps) {
  const horizontalTicks = buildTicks(width);
  const verticalTicks = buildTicks(height);

  return (
    <div
      data-testid="canvas-rulers"
      className="pointer-events-none absolute inset-0"
      style={{ width: width * zoom + RULER_THICKNESS, height: height * zoom + RULER_THICKNESS }}
      aria-hidden="true"
    >
      <div
        className="absolute left-0 top-0 bg-[var(--surface-soft)]"
        style={{ width: RULER_THICKNESS, height: RULER_THICKNESS }}
      />

      <div
        data-testid="canvas-ruler-horizontal"
        className="absolute top-0 overflow-hidden border-b border-[var(--border-subtle)] bg-[var(--surface-soft)]"
        style={{ left: RULER_THICKNESS, width: width * zoom, height: RULER_THICKNESS }}
      >
        {horizontalTicks.map((tick) => (
          <div
            key={tick.position}
            className="absolute bottom-0 border-l border-[var(--border-subtle)]"
            style={{ left: tick.position * zoom, height: tick.label ? '100%' : '50%' }}
          >
            {tick.label && (
              <span className="absolute -top-0.5 left-1 text-[9px] leading-none text-[var(--text-tertiary)]">{tick.position}</span>
            )}
          </div>
        ))}
        {cursorPosition && (
          <div
            data-testid="canvas-ruler-horizontal-indicator"
            className="absolute top-0 h-full w-px bg-[var(--accent)]"
            style={{ left: cursorPosition.x * zoom }}
          />
        )}
      </div>

      <div
        data-testid="canvas-ruler-vertical"
        className="absolute left-0 overflow-hidden border-r border-[var(--border-subtle)] bg-[var(--surface-soft)]"
        style={{ top: RULER_THICKNESS, width: RULER_THICKNESS, height: height * zoom }}
      >
        {verticalTicks.map((tick) => (
          <div
            key={tick.position}
            className="absolute right-0 border-t border-[var(--border-subtle)]"
            style={{ top: tick.position * zoom, width: tick.label ? '100%' : '50%' }}
          >
            {tick.label && (
              <span
                className="absolute left-0 top-0.5 text-[9px] leading-none text-[var(--text-tertiary)]"
                style={{ writingMode: 'vertical-rl' }}
              >
                {tick.position}
              </span>
            )}
          </div>
        ))}
        {cursorPosition && (
          <div
            data-testid="canvas-ruler-vertical-indicator"
            className="absolute left-0 h-px w-full bg-[var(--accent)]"
            style={{ top: cursorPosition.y * zoom }}
          />
        )}
      </div>
    </div>
  );
}

export const CANVAS_RULER_THICKNESS = RULER_THICKNESS;
