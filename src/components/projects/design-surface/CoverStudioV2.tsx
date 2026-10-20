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
import { Download, Upload } from 'lucide-react';
import type { AppMessages } from '@/lib/i18n/messages';
import {
  applyOriginalPageBackground,
  createEmptyDesignSurface,
  isEmptyDesignSurface,
  type DesignSurface,
} from '@/lib/projects/design-surface';
import { saveBackCoverDesignAction, saveCoverDesignAction, type SaveDesignSurfaceResult } from '@/lib/projects/actions';
import { rasterizeSourcePdfPage, resolveOriginPageNumber } from '@/lib/projects/pdf-page-rasterizer';
import type { SemanticBinding } from '@/lib/projects/design-surface-templates';
import { AdvancedCoverEditor } from './AdvancedCoverEditor';
import { BasicCoverEditor } from './BasicCoverEditor';
import { CoverOriginPrompt } from './CoverOriginPrompt';
import type { SurfacePalette } from '@/lib/projects/design-surface-templates';
import { Stepper, type Step } from '@/components/ui/Stepper';
import { createCoverDesignPackage, parseCoverDesignPackage } from '@/lib/projects/cover-design-package';
import { CoverPreflightPanel } from './CoverPreflightPanel';
import { CoverEditorialSystemPanel } from './CoverEditorialSystemPanel';

const AUTOSAVE_DEBOUNCE_MS = 1200;

export interface CoverStudioV2Props {
  surfaceKind: 'cover' | 'back-cover';
  projectId: string;
  initialSurface: DesignSurface;
  companionSurface?: DesignSurface;
  sourceDocumentAssetId: string | null;
  pageCount: number | null;
  copy: AppMessages['coverDesignSurface'];
  brandColors?: string[];
  /** Manuscript content per semantic slot, used when a template is applied (title/subtitle/author or title/body/bio). */
  semanticBinding?: SemanticBinding;
  /** Direct routes render the canonical workflow stepper; ProjectWorkspace owns it otherwise. */
  showWorkflowNavigation?: boolean;
  workflowLabels?: Pick<AppMessages['project'], 'stepContent' | 'stepChapters' | 'stepCover' | 'stepBackCover' | 'stepPreview' | 'stepCollaborate' | 'stepAI' | 'stepExport'>;
  locale?: 'es' | 'en';
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
function saveActionFor(surfaceKind: 'cover' | 'back-cover') {
  return surfaceKind === 'cover' ? saveCoverDesignAction : saveBackCoverDesignAction;
}

export function CoverStudioV2({
  surfaceKind,
  projectId,
  initialSurface,
  companionSurface: initialCompanionSurface,
  sourceDocumentAssetId,
  pageCount,
  copy,
  brandColors,
  semanticBinding,
  showWorkflowNavigation = false,
  workflowLabels,
  locale = 'es',
}: CoverStudioV2Props) {
  const [surface, setSurface] = useState<DesignSurface>(initialSurface);
  const [companionSurface, setCompanionSurface] = useState<DesignSurface>(initialCompanionSurface ?? createEmptyDesignSurface(surfaceKind === 'cover' ? 'back-cover' : 'cover'));
  const [promptDismissed, setPromptDismissed] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [originalBackgroundSrc, setOriginalBackgroundSrc] = useState<string | undefined>(undefined);
  const [mode, setMode] = useState<'basic' | 'professional'>('professional');
  const [palette, setPalette] = useState<SurfacePalette>('teal');
  const [packageFeedback, setPackageFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const pngExporterRef = useRef<(() => string | null) | null>(null);
  const packageInputRef = useRef<HTMLInputElement>(null);

  const pendingSaveRef = useRef<DesignSurface | null>(null);
  const inFlightRef = useRef(false);
  const flushPromiseRef = useRef<Promise<void> | null>(null);
  const debounceTimerRef = useRef<number | null>(null);

  // A while-loop, not recursion: whatever is the LATEST pending surface when
  // an in-flight save finishes gets sent next, immediately (no additional
  // debounce wait) — a slow earlier request can never land after and
  // overwrite a newer one, because sends are strictly sequential and always
  // read the most recent value (mission Fase 18 race safety).
  const flushSave = useCallback(async () => {
    if (inFlightRef.current) {
      await flushPromiseRef.current;
      return;
    }
    inFlightRef.current = true;
    const flushPromise = (async () => {
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
    })();
    flushPromiseRef.current = flushPromise;
    try {
      await flushPromise;
    } finally {
      inFlightRef.current = false;
      flushPromiseRef.current = null;
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

  const handleExportPackage = useCallback(async () => {
    setPackageFeedback(null);
    try {
      const packageJson = await createCoverDesignPackage(surfaceKind === 'cover'
        ? { cover: surface, 'back-cover': companionSurface }
        : { cover: companionSurface, 'back-cover': surface });
      const blob = new Blob([packageJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `anclora-talent-${projectId}-design.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setPackageFeedback({ kind: 'success', text: copy.workspace.jsonHelp });
    } catch (error) {
      setPackageFeedback({ kind: 'error', text: error instanceof Error ? error.message : copy.workspace.jsonImportError });
    }
  }, [companionSurface, copy.workspace.jsonHelp, copy.workspace.jsonImportError, projectId, surface, surfaceKind]);

  const registerPngExporter = useCallback((exporter: (() => string | null) | null) => {
    pngExporterRef.current = exporter;
  }, []);

  const handleExportPng = useCallback(async () => {
    setPackageFeedback(null);
    try {
      let dataUrl: string | null = null;
      if (mode === 'professional') {
        dataUrl = pngExporterRef.current?.() ?? null;
      } else {
        await document.fonts?.ready;
        const renderer = document.querySelector<HTMLElement>('[data-testid="design-surface-renderer"]');
        if (renderer) {
          const { toPng } = await import('html-to-image');
          dataUrl = await toPng(renderer, {
            width: surface.width,
            height: surface.height,
            canvasWidth: surface.width,
            canvasHeight: surface.height,
            pixelRatio: 1,
          });
        }
      }
      if (!dataUrl) throw new Error('PNG renderer is not ready');
      const anchor = document.createElement('a');
      anchor.href = dataUrl;
      anchor.download = `anclora-talent-${projectId}-${surfaceKind}.png`;
      anchor.click();
      setPackageFeedback({ kind: 'success', text: copy.workspace.exportPngSuccess });
    } catch {
      setPackageFeedback({ kind: 'error', text: copy.workspace.exportPngError });
    }
  }, [copy.workspace.exportPngError, copy.workspace.exportPngSuccess, mode, projectId, surface.height, surface.width, surfaceKind]);

  const handleImportPackage = useCallback(async (file?: File) => {
    if (!file) return;
    setPackageFeedback(null);
    try {
      const imported = parseCoverDesignPackage(await file.text());
      // Drain any user edit queued before import so that its slower autosave
      // cannot land after and overwrite the imported surfaces.
      if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
      await flushSave();
      pendingSaveRef.current = null;
      const nextSurface = surfaceKind === 'cover' ? imported.surfaces.cover : imported.surfaces['back-cover'];
      const nextCompanion = surfaceKind === 'cover' ? imported.surfaces['back-cover'] : imported.surfaces.cover;
      setSurface(nextSurface);
      setCompanionSurface(nextCompanion);
      setSaveStatus('saving');
      const saveCover = await saveCoverDesignAction(projectId, imported.surfaces.cover);
      if (saveCover.status !== 'saved') throw new Error(`${copy.workspace.jsonImportError} ${saveCover.error}`);
      const saveBackCover = await saveBackCoverDesignAction(projectId, imported.surfaces['back-cover']);
      if (saveBackCover.status !== 'saved') {
        setSaveStatus('error');
        throw new Error(copy.workspace.jsonImportPartialSave);
      }
      setSaveStatus('saved');
      setPackageFeedback({ kind: 'success', text: copy.workspace.jsonImported });
    } catch (error) {
      setSaveStatus('error');
      setPackageFeedback({ kind: 'error', text: error instanceof Error ? error.message : copy.workspace.jsonImportError });
    } finally {
      if (packageInputRef.current) packageInputRef.current.value = '';
    }
  }, [copy.workspace.jsonImportError, copy.workspace.jsonImportPartialSave, copy.workspace.jsonImported, flushSave, projectId, surfaceKind]);

  const originPageNumber = useMemo(() => resolveOriginPageNumber(surfaceKind, pageCount), [surfaceKind, pageCount]);
  const hasOriginalAsset = Boolean(sourceDocumentAssetId);
  // The prompt itself decides which buttons to show (Use original/Edit as
  // base only appear when `hasOriginalAsset` is true) — here we only decide
  // WHETHER to show the empty-state prompt at all: never silently generate
  // a design, always ask, until the surface stops being empty or the user
  // explicitly dismisses it via "Choose template"/"Create from scratch".
  const showOriginPrompt = !promptDismissed && isEmptyDesignSurface(surface);
  const activeWorkflowStep = surfaceKind === 'cover' ? 3 : 4;
  const workflowSteps: Step[] = workflowLabels ? [
    workflowLabels.stepContent,
    workflowLabels.stepChapters,
    workflowLabels.stepCover,
    workflowLabels.stepBackCover,
    workflowLabels.stepPreview,
    workflowLabels.stepCollaborate,
    workflowLabels.stepAI,
    workflowLabels.stepExport,
  ].map((title, index) => ({
    id: index + 1,
    title,
    status: index + 1 === activeWorkflowStep ? 'active' : index + 1 < activeWorkflowStep ? 'completed' : 'pending',
  })) : [];

  const navigateToWorkflowStep = useCallback((step: number) => {
    const route = step === 3 ? 'cover' : step === 4 ? 'back-cover' : `editor?step=${step}`;
    window.location.assign(`/projects/${projectId}/${route}`);
  }, [projectId]);

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
      {showWorkflowNavigation && workflowSteps.length > 0 && (
        <div className="cover-workflow-stepper-bar" data-testid="cover-workflow-stepper">
          <Stepper steps={workflowSteps} activeStep={activeWorkflowStep} onStepClick={navigateToWorkflowStep} />
        </div>
      )}
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
        <>
          <div className="cover-studio-mode-bar">
            <div className="cover-studio-mode-switch" role="group" aria-label={copy.workspace.professionalModeLabel}>
              <button type="button" className="ac-button ac-button--secondary ac-button--sm" data-testid="studio-mode-basic-button" aria-pressed={mode === 'basic'} onClick={() => setMode('basic')}>
                {copy.workspace.basicModeLabel}
              </button>
              <button type="button" className="ac-button ac-button--secondary ac-button--sm" data-testid="studio-mode-professional-button" aria-label={copy.workspace.professionalModeLabel} title={copy.workspace.professionalModeLabel} aria-pressed={mode === 'professional'} onClick={() => setMode('professional')}>
                <span aria-hidden="true">Pro</span>
              </button>
            </div>
            <div className="cover-studio-package-actions">
              <input
                ref={packageInputRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                aria-label={copy.workspace.importEditableJson}
                data-testid="cover-package-input"
                onChange={(event) => void handleImportPackage(event.currentTarget.files?.[0])}
              />
              <button type="button" className="ac-button ac-button--secondary ac-button--sm cover-studio-package-icon-button" data-testid="cover-package-import-button" aria-label={copy.workspace.importEditableJson} title={copy.workspace.importEditableJson} onClick={() => packageInputRef.current?.click()}>
                <Upload aria-hidden="true" size={15} />
                <span aria-hidden="true">JSON</span>
              </button>
              <button type="button" className="ac-button ac-button--secondary ac-button--sm cover-studio-package-icon-button" data-testid="cover-package-export-button" aria-label={copy.workspace.exportEditableJson} title={copy.workspace.exportEditableJson} onClick={() => void handleExportPackage()}>
                <Download aria-hidden="true" size={15} />
                <span aria-hidden="true">JSON</span>
              </button>
              <button type="button" className="ac-button ac-button--secondary ac-button--sm cover-studio-package-icon-button" data-testid="cover-png-export-button" aria-label={copy.workspace.exportPng} title={copy.workspace.exportPng} onClick={() => void handleExportPng()}>
                <Download aria-hidden="true" size={15} />
                <span aria-hidden="true">PNG</span>
              </button>
            </div>
            {mode === 'basic' && (
              <button type="button" className="ac-button ac-button--primary ac-button--sm" data-testid="basic-mode-save-final-button" onClick={() => void handleSaveFinal()}>
                {saveStatus === 'saving' ? copy.studio.savingLabel : saveStatus === 'error' ? copy.studio.saveErrorLabel : surface.status === 'final' ? copy.studio.finalStatusLabel : copy.workspace.save}
              </button>
            )}
            <p className="cover-package-help" data-testid="cover-package-help">{copy.workspace.jsonHelp}</p>
          </div>
          {packageFeedback && <p data-testid="cover-package-feedback" className={`cover-package-feedback cover-package-feedback--${packageFeedback.kind}`} role={packageFeedback.kind === 'error' ? 'alert' : 'status'}>{packageFeedback.text}</p>}
          {mode === 'basic' ? (
            <BasicCoverEditor surface={surface} onChange={handleChange} copy={copy} palette={palette} onPaletteChange={setPalette} brandColors={brandColors} semanticBinding={semanticBinding} />
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
              onPngExporterChange={registerPngExporter}
            />
          )}
          <CoverPreflightPanel surface={surface} locale={locale} copy={copy.workspace} />
          <CoverEditorialSystemPanel
            projectId={projectId}
            surface={surface}
            companionSurface={companionSurface}
            locale={locale}
            onChange={handleChange}
            onCompanionChange={setCompanionSurface}
          />
        </>
      )}
    </div>
  );
}
