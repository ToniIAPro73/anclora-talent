'use client';

/**
 * Cover Studio v2 — live page wrapper (continuation mission, page
 * integration). One component for cover AND back cover (only `surface`,
 * `hasOriginalAsset`/`originPageNumber`, and the initial design differ) —
 * mounted directly into `/projects/[projectId]/cover` and `/back-cover`.
 *
 * Owns exactly what a page needs and nothing the editors already own:
 * - the single `DesignSurface` both Basic and Advanced read/write (mission
 *   §61-62 — switching modes never resets or loses anything);
 * - the empty-state / original-PDF-inheritance prompt;
 * - coalesced, race-safe autosave with a status indicator;
 * - the Basic/Advanced mode toggle, with a non-blocking mobile notice
 *   instead of user-agent sniffing (mission Fase 10).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutGrid, Sliders } from 'lucide-react';
import type { AppMessages } from '@/lib/i18n/messages';
import {
  applyOriginalPageBackground,
  isEmptyDesignSurface,
  type DesignSurface,
} from '@/lib/projects/design-surface';
import { saveBackCoverDesignAction, saveCoverDesignAction, type SaveDesignSurfaceResult } from '@/lib/projects/actions';
import { rasterizeSourcePdfPage, resolveOriginPageNumber } from '@/lib/projects/pdf-page-rasterizer';
import { useMediaQuery } from '@/hooks/use-media-query';
import { BasicCoverEditor } from './BasicCoverEditor';
import { AdvancedCoverEditor } from './AdvancedCoverEditor';
import { CoverOriginPrompt } from './CoverOriginPrompt';
import type { SurfacePalette } from '@/lib/projects/design-surface-templates';

const AUTOSAVE_DEBOUNCE_MS = 1200;
const WIDE_VIEWPORT_QUERY = '(min-width: 1024px)';

export interface CoverStudioV2Props {
  surfaceKind: 'cover' | 'back-cover';
  projectId: string;
  initialSurface: DesignSurface;
  sourceDocumentAssetId: string | null;
  pageCount: number | null;
  copy: AppMessages['coverDesignSurface'];
  brandColors?: string[];
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type EditorMode = 'basic' | 'advanced';

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
}: CoverStudioV2Props) {
  const [surface, setSurface] = useState<DesignSurface>(initialSurface);
  const [mode, setMode] = useState<EditorMode>('basic');
  const [palette, setPalette] = useState<SurfacePalette>('obsidian');
  const [promptDismissed, setPromptDismissed] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [originalBackgroundSrc, setOriginalBackgroundSrc] = useState<string | undefined>(undefined);

  const isWideViewport = useMediaQuery(WIDE_VIEWPORT_QUERY);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('mode') === 'advanced') setMode('advanced');
  }, []);

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
    <div className="space-y-4" data-testid="cover-studio-v2">
      {!showOriginPrompt && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="ac-editor-inspector__segmented" role="group" aria-label={copy.studio.basicModeLabel}>
            <button
              type="button"
              data-testid="studio-mode-basic-button"
              onClick={() => setMode('basic')}
              data-active={mode === 'basic' ? 'true' : 'false'}
              aria-pressed={mode === 'basic'}
              className="ac-button ac-button--ghost ac-button--sm inline-flex items-center gap-1.5"
            >
              <LayoutGrid className="h-4 w-4" />
              {copy.studio.basicModeLabel}
            </button>
            <button
              type="button"
              data-testid="studio-mode-advanced-button"
              onClick={() => setMode('advanced')}
              data-active={mode === 'advanced' ? 'true' : 'false'}
              aria-pressed={mode === 'advanced'}
              className="ac-button ac-button--ghost ac-button--sm inline-flex items-center gap-1.5"
            >
              <Sliders className="h-4 w-4" />
              {copy.studio.advancedModeLabel}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span
              data-testid="studio-save-status"
              data-status={saveStatus}
              className="text-xs font-medium text-[var(--text-tertiary)]"
            >
              {saveStatus === 'saving'
                ? copy.studio.savingLabel
                : saveStatus === 'saved'
                  ? copy.studio.savedLabel
                  : saveStatus === 'error'
                    ? copy.studio.saveErrorLabel
                    : ''}
            </span>
            <button
              type="button"
              data-testid="studio-save-final-button"
              onClick={() => void handleSaveFinal()}
              className="ac-button ac-button--secondary ac-button--sm"
            >
              {surface.status === 'final' ? copy.studio.finalStatusLabel : copy.studio.saveFinalButton}
            </button>
          </div>
        </div>
      )}

      {mode === 'advanced' && !isWideViewport && !showOriginPrompt && (
        <div className="ac-surface-panel ac-surface-panel--subtle flex flex-wrap items-center justify-between gap-3 p-3 text-xs" data-testid="studio-mobile-advanced-notice">
          <span>{copy.studio.mobileAdvancedNotice}</span>
          <button
            type="button"
            data-testid="studio-mobile-back-to-basic-button"
            onClick={() => setMode('basic')}
            className="ac-button ac-button--ghost ac-button--sm"
          >
            {copy.studio.backToBasicButton}
          </button>
        </div>
      )}

      {showOriginPrompt ? (
        <CoverOriginPrompt
          copy={copy.origin}
          hasOriginalAsset={hasOriginalAsset}
          onUseOriginal={handleUseOriginal}
          onEditAsBase={handleEditAsBase}
          onChooseTemplate={() => {
            setMode('basic');
            setPromptDismissed(true);
          }}
          onCreateFromScratch={() => setPromptDismissed(true)}
        />
      ) : mode === 'basic' ? (
        <BasicCoverEditor
          surface={surface}
          onChange={handleChange}
          copy={copy}
          palette={palette}
          onPaletteChange={setPalette}
          brandColors={brandColors}
        />
      ) : (
        <AdvancedCoverEditor
          surface={surface}
          onChange={handleChange}
          copy={copy}
          brandColors={brandColors}
          originalBackgroundSrc={originalBackgroundSrc}
        />
      )}
    </div>
  );
}
