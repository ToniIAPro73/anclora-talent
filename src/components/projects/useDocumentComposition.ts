'use client';

import { useMemo } from 'react';
import type { ProjectRecord } from '@/lib/projects/types';
import { DEVICE_PAGINATION_CONFIGS } from '@/lib/preview/device-configs';
import { composeProjectPreview, type ComposedPreview } from '@/lib/compose/preview-adapter';

/**
 * Composes the project document with the FASE C engine (laptop/6x9 format)
 * and memoizes the result per project revision. Shared by the document
 * health panel, the export gate and the live preview wiring.
 */
export function useDocumentComposition(project: ProjectRecord): ComposedPreview {
  return useMemo(
    () => composeProjectPreview(project, DEVICE_PAGINATION_CONFIGS.laptop),
    [project],
  );
}
