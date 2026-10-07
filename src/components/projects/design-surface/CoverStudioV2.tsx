'use client';

/**
 * Cover Studio v2 — live page wrapper (continuation mission, page
 * integration). One component for cover AND back cover (only `surface`,
 * `hasOriginalAsset`/`originPageNumber`, and the initial design differ) —
 * mounted directly into `/projects/[projectId]/cover` and `/back-cover`.
 *
 * Owns exactly what a page needs and nothing the editors already own:
 * - the single persisted `DesignSurface` owned by the unified editor;
 * - the empty-state / original-PDF-inheritance prompt;
 * - coalesced, race-safe autosave with a status indicator;
 * - the original-document prompt before the unified editor is opened.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppMessages } from '@/lib/i18n/messages';
import {
  applyOriginalPageBackground,
  isEmptyDesignSurface,
  type DesignSurface,
} from '@/lib/projects/design-surface';
import { saveBackCoverDesignAction, saveCoverDesignAction, type SaveDesignSurfaceResult } from '@/lib/projects/actions';
import { rasterizeSourcePdfPage, resolveOriginPageNumber } from '@/lib/projects/pdf-page-rasterizer';
import type { SemanticBinding } from '@/lib/projects/design-surface-templates';
import { AdvancedCoverEditor } from './AdvancedCoverEditor';
import { CoverOriginPrompt } from './CoverOriginPrompt';

const AUTOSAVE_DEBOUNCE_MS = 1200;

export interface CoverStudioV2Props {
  surfaceKind: 'cover' | 'back-cover';
  projectId: string;
  initialSurface: DesignSurface;
  sourceDocumentAssetId: string | null;
  pageCount: number | null;
  copy: AppMessages['coverDesignSurface'];
  brandColors?: string[];
  /** Manuscript content per semantic slot, used when a template is applied (title/subtitle/author or title/body/bio). */
  semanticBinding?: SemanticBinding;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
function saveActionFor(surfaceKind: 'cover' | 'back-cover') {
  return surfaceKind === 'cover' ? saveCoverDesignAction : saveBackCoverDesignAction;
}

export function CoverStudioV2({
  surfaceKind,
  projectId,
  initialSurface,
  sourceDocumentAssetId,
  pageCount,
  copy,
  brandColors,
  semanticBinding,
}: CoverStudioV2Props) {
  const [surface, setSurface] = useState<DesignSurface>(initialSurface);
  const [promptDismissed, setPromptDismissed] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [originalBackgroundSrc, setOriginalBackgroundSrc] = useState<string | undefined>(undefined);

  const pendingSaveRef = useRef<DesignSurface | null>(null);
  const inFlightRef = useRef(false);
  const debounceTimerRef = useRef<number | null>(null);

  // A while-loop, not recursion: whatever is the LATEST pending surface when
  // an in-flight save finishes gets sent next, immediately (no additional
  // debounce wait) — a slow earlier request can never land after and
  // overwrite a newer one, because sends are strictly sequential and always
  // read the most recent value (mission Fase 18 race safety).
  const flushSave = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      while (pendingSaveRef.current) {
        const toSave = pendingSaveRef.current;
        pendingSaveRef.current = null;
        setSaveStatus('saving');

        let result: SaveDesignSurfaceResult;
        try {
          result = await saveActionFor(surfaceKind)(projectId, toSave);
        } catch {
          result = { status: 'error', error: 'network' };
        }

        setSaveStatus(result.status === 'saved' ? 'saved' : 'error');
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [projectId, surfaceKind]);

  const scheduleSave = useCallback(
    (next: DesignSurface) => {
      pendingSaveRef.current = next;
      if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = window.setTimeout(() => {
        void flushSave();
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [flushSave],
  );

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const handleChange = useCallback(
    (next: DesignSurface) => {
      setSurface(next);
      scheduleSave(next);
    },
    [scheduleSave],
  );

  const handleSaveFinal = useCallback(async () => {
    const finalSurface: DesignSurface = { ...surface, status: 'final' };
    setSurface(finalSurface);
    if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
    pendingSaveRef.current = finalSurface;
    await flushSave();
  }, [surface, flushSave]);

  const originPageNumber = useMemo(() => resolveOriginPageNumber(surfaceKind, pageCount), [surfaceKind, pageCount]);
  const hasOriginalAsset = Boolean(sourceDocumentAssetId);
  // The prompt itself decides which buttons to show (Use original/Edit as
  // base only appear when `hasOriginalAsset` is true) — here we only decide
  // WHETHER to show the empty-state prompt at all: never silently generate
  // a design, always ask, until the surface stops being empty or the user
  // explicitly dismisses it via "Choose template"/"Create from scratch".
  const showOriginPrompt = !promptDismissed && isEmptyDesignSurface(surface);

  const handleUseOriginal = useCallback(async () => {
    if (!sourceDocumentAssetId) return;
    const dataUrl = await rasterizeSourcePdfPage(projectId, originPageNumber);
    setOriginalBackgroundSrc(dataUrl);
    handleChange(applyOriginalPageBackground(surface, { assetId: sourceDocumentAssetId, mode: 'use-original', imageDataUrl: dataUrl }));
  }, [sourceDocumentAssetId, projectId, originPageNumber, surface, handleChange]);

  const handleEditAsBase = useCallback(async () => {
    if (!sourceDocumentAssetId) return;
    const dataUrl = await rasterizeSourcePdfPage(projectId, originPageNumber);
    setOriginalBackgroundSrc(dataUrl);
    handleChange(applyOriginalPageBackground(surface, { assetId: sourceDocumentAssetId, mode: 'edit-original', imageDataUrl: dataUrl }));
  }, [sourceDocumentAssetId, projectId, originPageNumber, surface, handleChange]);

  return (
    <div className="cover-studio-v2 w-full h-full" data-testid="cover-studio-v2" data-surface-kind={surfaceKind}>
      {showOriginPrompt ? (
        <CoverOriginPrompt
          copy={copy.origin}
          hasOriginalAsset={hasOriginalAsset}
          onUseOriginal={handleUseOriginal}
          onEditAsBase={handleEditAsBase}
          onChooseTemplate={() => {
            setPromptDismissed(true);
          }}
          onCreateFromScratch={() => setPromptDismissed(true)}
        />
      ) : (
        <AdvancedCoverEditor
          surface={surface}
          onChange={handleChange}
          copy={copy}
          brandColors={brandColors}
          semanticBinding={semanticBinding}
          originalBackgroundSrc={originalBackgroundSrc}
          saveStatus={saveStatus}
          onSaveFinal={() => void handleSaveFinal()}
        />
      )}
    </div>
  );
}
