'use client';

import { useMemo, useState } from 'react';
import type { ProjectRecord } from '@/lib/projects/types';
import { DEVICE_PAGINATION_CONFIGS } from '@/lib/preview/device-configs';
import {
  composeProjectPreview,
  composeProjectPreviewIncremental,
  findChangedChapterStartId,
  type ComposedPreview,
} from '@/lib/compose/preview-adapter';
import { diffCompositions, type CompositionDiff } from '@/lib/compose/compose';
import { createCanvasMeasurer } from '@/lib/compose/measure';

/** F0.2: lightweight client telemetry for the recomposition budget (<300 ms). */
export interface RecompositionTelemetry {
  /** Measured (re)compositions retained in the window. */
  count: number;
  /** Duration of the most recent (re)composition in ms (null before the first). */
  lastMs: number | null;
  /** Mean duration of the retained window in ms. */
  avgMs: number | null;
}

export interface LiveComposition extends ComposedPreview {
  /** Structural diff vs. the previous composition (null on first render). */
  diff: CompositionDiff | null;
  /** Rolling recomposition timings (F0.2). */
  telemetry: RecompositionTelemetry;
}

/** Only the last N measurements are retained (rolling window). */
const TELEMETRY_WINDOW = 20;

interface CompositionHistory {
  project: ProjectRecord;
  /** Cached composition (telemetry is derived on return, never cached). */
  live: Omit<LiveComposition, 'telemetry'>;
  /** Retained recomposition durations, oldest first (max TELEMETRY_WINDOW). */
  durations: number[];
  /** Last project revision whose composition was measured (dedupe guard). */
  measuredProject: ProjectRecord | null;
}

/**
 * Live preview composition (C5). Composes the project with the FASE C engine
 * (laptop/6x9, canvas font metrics in the browser) and, when the project
 * revision changes, recomposes **incrementally** from the first changed
 * chapter forward — pages of earlier chapters are reused verbatim. Also
 * computes the structural before/after diff (chapter page shifts, TOC delta,
 * new violations) and the first recomposed page for the visual badge.
 *
 * Uses the "adjust state during render" pattern (no effects, no ref reads):
 * when `project` changes, the diff/incremental result is computed during the
 * same render pass and stored for the next comparison.
 *
 * Debounce note: edits reach this hook through the debounced save flow of
 * the chapter editor (`useChapterEditor`) + `router.refresh()`, so each
 * recomposition already corresponds to a settled edit, not a keystroke.
 *
 * Telemetry (F0.2): every (re)composition is timed with `performance.now()`,
 * logged to the client console under the `[anclora:recompose]` namespace and
 * retained in a rolling window exposed as `telemetry` (count/lastMs/avgMs).
 */
export function useDocumentComposition(project: ProjectRecord): LiveComposition {
  const measurer = useMemo(() => createCanvasMeasurer(), []);
  const [history, setHistory] = useState<CompositionHistory | null>(null);

  let computed: Omit<LiveComposition, 'telemetry'>;
  let durations = history?.durations ?? [];
  let measuredProject = history?.measuredProject ?? null;

  if (history && history.project === project) {
    computed = history.live;
  } else {
    const changedStartId = history ? findChangedChapterStartId(history.project, project) : null;
    // eslint-disable-next-line react-hooks/purity -- F0.2 telemetry: timing the compose is the point; the value only feeds the log/rolling window, never the render output.
    const startedAt = performance.now();
    if (history && changedStartId) {
      const composed = composeProjectPreviewIncremental(
        history.live,
        project,
        changedStartId,
        DEVICE_PAGINATION_CONFIGS.laptop,
        measurer,
      );
      computed = { ...composed, diff: diffCompositions(history.live.result, composed.result) };
    } else {
      computed = {
        ...composeProjectPreview(project, DEVICE_PAGINATION_CONFIGS.laptop, measurer),
        diff: null,
      };
    }
    // eslint-disable-next-line react-hooks/purity -- F0.2 telemetry: see note on `startedAt` above.
    const elapsedMs = performance.now() - startedAt;
    // Dedupe guard: the render-phase state adjustment (and StrictMode double
    // renders in dev) can re-run this branch for the same project revision.
    if (measuredProject !== project) {
      measuredProject = project;
      durations = [...durations, elapsedMs].slice(-TELEMETRY_WINDOW);
      console.debug(
        `[anclora:recompose] ${Math.round(elapsedMs)}ms ${
          changedStartId
            ? `incremental desde pág. ${computed.recomposedFromPage ?? '?'}`
            : 'completa'
        }`,
      );
    }
  }

  if (!history || history.project !== project || history.live !== computed) {
    // Render-phase state adjustment (React-documented pattern): schedules a
    // re-render before commit so the next comparison uses this composition.
    setHistory({ project, live: computed, durations, measuredProject });
  }

  const lastMs = durations.length > 0 ? durations[durations.length - 1] : null;
  const avgMs =
    durations.length > 0
      ? durations.reduce((total, ms) => total + ms, 0) / durations.length
      : null;

  return { ...computed, telemetry: { count: durations.length, lastMs, avgMs } };
}
