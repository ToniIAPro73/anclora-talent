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

export interface LiveComposition extends ComposedPreview {
  /** Structural diff vs. the previous composition (null on first render). */
  diff: CompositionDiff | null;
}

interface CompositionHistory {
  project: ProjectRecord;
  live: LiveComposition;
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
 */
export function useDocumentComposition(project: ProjectRecord): LiveComposition {
  const measurer = useMemo(() => createCanvasMeasurer(), []);
  const [history, setHistory] = useState<CompositionHistory | null>(null);

  let computed: LiveComposition;
  if (history && history.project === project) {
    computed = history.live;
  } else if (history) {
    const changedStartId = findChangedChapterStartId(history.project, project);
    if (changedStartId) {
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
  } else {
    computed = {
      ...composeProjectPreview(project, DEVICE_PAGINATION_CONFIGS.laptop, measurer),
      diff: null,
    };
  }

  if (!history || history.project !== project || history.live !== computed) {
    // Render-phase state adjustment (React-documented pattern): schedules a
    // re-render before commit so the next comparison uses this composition.
    setHistory({ project, live: computed });
  }

  return computed;
}
