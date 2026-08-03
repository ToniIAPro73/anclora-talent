'use client';

import { useMemo } from 'react';
import type { ProjectRecord } from '@/lib/projects/types';
import { DEVICE_PAGINATION_CONFIGS } from '@/lib/preview/device-configs';
import { composeProjectPreview, type ComposedPreview } from '@/lib/compose/preview-adapter';
import { createCanvasMeasurer } from '@/lib/compose/measure';

/**
 * Composes the project document with the FASE C engine (laptop/6x9 format)
 * and memoizes the result per project revision. Shared by the document
 * health panel, the export gate and the live preview wiring.
 *
 * Uses the canvas measurer when available (real font metrics in the
 * browser); falls back to the deterministic heuristic measurer in SSR/tests.
 */
export function useDocumentComposition(project: ProjectRecord): ComposedPreview {
  const measurer = useMemo(() => createCanvasMeasurer(), []);
  return useMemo(
    () => composeProjectPreview(project, DEVICE_PAGINATION_CONFIGS.laptop, measurer),
    [project, measurer],
  );
}
