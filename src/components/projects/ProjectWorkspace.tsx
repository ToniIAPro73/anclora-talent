'use client';

import { useEffect, useTransition, useState, useMemo, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, Download } from 'lucide-react';
import { Stepper, type Step } from '@/components/ui/Stepper';
import { ChapterOrganizer } from './ChapterOrganizer';
import { ContentWorkspace } from './content-workspace/ContentWorkspace';
import { CoverStudioV2 } from './design-surface/CoverStudioV2';
import { PreviewCanvas } from './PreviewCanvas';
import { FixedPdfPreview } from './FixedPdfPreview';
import { useEditorPreferences } from '@/hooks/use-editor-preferences';
import { CollaborationPanel } from './CollaborationPanel';
import { AIAssistant } from './AIAssistant';
import { ChapterEditorModal } from './ChapterEditorModal';
import { AddChapterDialog } from './AddChapterDialog';
import { ImportChapterDialog } from './ImportChapterDialog';
import { ReimportDialog } from './ReimportDialog';
import { DocumentDataModal } from './DocumentDataModal';
import { Portal } from '@/components/ui/Portal';
import { SlotPortal } from '@/components/ui/SlotPortal';
import { PdfExportButton } from './PdfExportButton';
import { CreateEditableCopyButton } from './CreateEditableCopyButton';
import { WorkspaceOnboarding } from './WorkspaceOnboarding';
import { useDocumentComposition } from './useDocumentComposition';
import { resolveDocumentRules } from '@/lib/compose/rules';
import { projectToSemanticDocument } from '@/lib/compose/preview-adapter';
import { countPreflightErrors, preflight } from '@/lib/preflight/preflight';
import {
  saveChapterContentAction,
  saveProjectWorkflowStepAction,
  syncProjectPaginationAction,
} from '@/lib/projects/actions';
import {
  clearLastChapterSave,
  getLastChapterSaveSnapshot,
  subscribeLastChapterSave,
} from './advanced-chapter-editor/last-chapter-save';
import { computeChapterPageMetrics } from '@/lib/preview/metrics';
import { premiumPrimaryDarkButton, premiumSecondaryLightButton } from '@/components/ui/button-styles';
import { isFixedPdfProject, type ProjectRecord } from '@/lib/projects/types';
import { getProjectCapabilities } from '@/lib/projects/capabilities';
import type { AppMessages } from '@/lib/i18n/messages';
import type { BrandProfile } from '@/lib/brand/brand-profile';
import type { LaunchPackView } from '@/lib/manifest/view';
import type { DocumentSnapshotMeta } from '@/lib/snapshots/model';
import { LaunchPackPanel } from './LaunchPackPanel';
import { PublishChannelsPanel } from './PublishChannelsPanel';
import { KdpDisclosurePanel } from './KdpDisclosurePanel';
import { buildExportQueryString } from '@/lib/projects/export-config';
import type { CoAuthorChapter } from '@/lib/ai/co-author';
import type { KdpDisclosure } from '@/lib/ai/kdp-disclosure';
import type { CollaborationView } from '@/lib/collaboration/view';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { getBackCoverDesign, getCoverDesign } from '@/lib/projects/design-surface-repository';

type SaveState = 'idle' | 'saving' | 'saved';
type PaginationSyncFeedback = 'idle' | 'done' | 'missing-index';
const PROJECT_WORKFLOW_STEP_STORAGE_KEY = 'anclora-project-workflow-step';

function normalizeWorkflowStep(step: number | undefined) {
  if (!Number.isFinite(step)) {
    return 1;
  }

  return Math.min(8, Math.max(1, Math.trunc(step ?? 1)));
}

function readStoredWorkflowStep(projectId: string) {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(PROJECT_WORKFLOW_STEP_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Record<string, number>;
    return typeof parsed[projectId] === 'number' ? normalizeWorkflowStep(parsed[projectId]) : null;
  } catch {
    return null;
  }
}

function writeStoredWorkflowStep(projectId: string, step: number) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const raw = window.localStorage.getItem(PROJECT_WORKFLOW_STEP_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    parsed[projectId] = normalizeWorkflowStep(step);
    window.localStorage.setItem(PROJECT_WORKFLOW_STEP_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore storage failures so they never block the editor.
  }
}

export function ProjectWorkspace({
  project,
  copy,
  brandProfiles = [],
  launchPack,
  publishChannels,
  history,
  coAuthor,
  kdpDisclosure,
  collaboration,
  locale = 'es',
  initialOpenDocumentData = false,
}: {
  project: ProjectRecord;
  copy: AppMessages['project'];
  brandProfiles?: BrandProfile[];
  /** F2: launch pack section (copy + manifest view); rendered in step 9. */
  launchPack?: {
    copy: AppMessages['launchPack'];
    view: LaunchPackView | null;
  };
  /** F4: publish-to-sales-channels section; rendered in step 9 below the pack. */
  publishChannels?: {
    copy: AppMessages['publishChannels'];
    gumroadEnabled: boolean;
    gumroadConnected: boolean;
  };
  /** F2: version history section (copy + snapshot metadata, newest first); rendered in step 1. */
  history?: {
    copy: AppMessages['history'];
    snapshots: DocumentSnapshotMeta[];
  };
  /** F3 Capa 2: co-author section (AST chapters + provider flag); rendered in step 1. */
  coAuthor?: {
    chapters: CoAuthorChapter[];
    cloudAvailable: boolean;
  };
  /** F3 Capa 2: KDP AI-content disclosure; rendered in the export step (9). */
  kdpDisclosure?: KdpDisclosure;
  /** F4: collaboration section (copy + server-loaded view); rendered in step 7. */
  collaboration?: {
    copy: AppMessages['collaboration'];
    view: CollaborationView;
  };
  /** F3: UI locale forwarded to the governed-AI section of the health panel. */
  locale?: 'es' | 'en';
  /** U6: open the document-data modal on mount (?documentData=open). */
  initialOpenDocumentData?: boolean;
}) {
  const router = useRouter();
  const { preferences } = useEditorPreferences();
  // Fixed-PDF document mode: the original PDF is the canonical visual
  // source. Chapters/template/cover/back-cover steps are never forced —
  // they render as "already included" instead of an editor.
  const fixedPdf = isFixedPdfProject(project);
  // Capability matrix (Fase 10): single source for export/compose gating,
  // derived from the same fixed-pdf/editable mode check above.
  const capabilities = useMemo(() => getProjectCapabilities(project), [project]);
  const [activeStep, setActiveStep] = useState(() => {
    const persistedStep = readStoredWorkflowStep(project.id);
    return Number.isFinite(project.workflowStep)
      ? normalizeWorkflowStep(project.workflowStep)
      : (persistedStep ?? 1);
  });
  const [activeChapterId, setActiveChapterId] = useState(
    project.document.chapters[0]?.id ?? '',
  );
  
  // Modal states
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isReimportDialogOpen, setIsReimportDialogOpen] = useState(false);
  const [isDocumentDataOpen, setIsDocumentDataOpen] = useState(initialOpenDocumentData);

  const canonicalCoverSurface = useMemo(() => getCoverDesign(project), [project]);
  const canonicalBackCoverSurface = useMemo(() => getBackCoverDesign(project), [project]);
  const coverDesignSurfaceCopy = useMemo(() => resolveLocaleMessages(locale).coverDesignSurface, [locale]);
  const sourceDocumentAssetId = project.assets.find((asset) => asset.usage === 'source-document')?.id ?? null;
  const sourcePageCount = project.document.source?.pageCount ?? null;
  const [saveStepState, setSaveStepState] = useState<'idle' | 'saved'>('idle');
  const [pageNumberSyncState, setPageNumberSyncState] = useState<SaveState>('idle');
  const [pageNumberSyncFeedback, setPageNumberSyncFeedback] = useState<PaginationSyncFeedback>('idle');
  const [isPending, startTransition] = useTransition();
  // Compact header "Guardado hace X min" label: ticks every 30s so the
  // relative time stays fresh without a per-second re-render.
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNowTick(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const chapterSignature = useMemo(
    () => project.document.chapters.map((ch) => `${ch.id}:${ch.order}`).join(','),
    [project.document.chapters],
  );
  const [lastSyncedChapterSignature, setLastSyncedChapterSignature] = useState(() => chapterSignature);
  const pageNumberIsStale = chapterSignature !== lastSyncedChapterSignature;
  const exportQuery = useMemo(() => buildExportQueryString(preferences, project), [preferences, project]);

  useEffect(() => {
    writeStoredWorkflowStep(project.id, activeStep);
  }, [activeStep, project.id]);

  useEffect(() => {
    if (normalizeWorkflowStep(project.workflowStep) === activeStep) {
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set('projectId', project.id);
      formData.set('workflowStep', String(activeStep));
      await saveProjectWorkflowStepAction(formData);
      setSaveStepState('saved');
      window.setTimeout(() => setSaveStepState('idle'), 2000);
    });
  }, [activeStep, project.id, project.workflowStep, startTransition]);

  const resolvedActiveChapterId = project.document.chapters.some((chapter) => chapter.id === activeChapterId)
    ? activeChapterId
    : (project.document.chapters[0]?.id ?? '');
  const activeChapter =
    project.document.chapters.find((ch) => ch.id === resolvedActiveChapterId) ??
    project.document.chapters[0];

  const editingChapterIndex = useMemo(
    () => project.document.chapters.findIndex((ch) => ch.id === editingChapterId),
    [project.document.chapters, editingChapterId],
  );

  // Compute chapter page metrics (Commit 3)
  const chapterMetricsById = useMemo(() => {
    const metrics = computeChapterPageMetrics(project);
    return Object.fromEntries(metrics.map((m) => [m.chapterId, m]));
  }, [project]);

  const steps: Step[] = useMemo(() => {
    // Fixed-PDF document mode: steps 2-4 (chapters/cover/back
    // cover) are already resolved by the original PDF — shown as
    // completed rather than pending, regardless of activeStep.
    const includedStatus = (id: number): Step['status'] =>
      activeStep === id ? 'active' : fixedPdf ? 'completed' : activeStep > id ? 'completed' : 'pending';

    return [
      { id: 1, title: copy.stepContent, description: copy.stepContentDesc, status: activeStep === 1 ? 'active' : activeStep > 1 ? 'completed' : 'pending' },
      { id: 2, title: copy.stepChapters, description: fixedPdf ? copy.fixedPdfIncludedStepBody : copy.stepChaptersDesc, status: includedStatus(2) },
      { id: 3, title: copy.stepCover, description: fixedPdf ? copy.fixedPdfIncludedStepBody : copy.stepCoverDesc, status: includedStatus(3) },
      { id: 4, title: copy.stepBackCover, description: fixedPdf ? copy.fixedPdfIncludedStepBody : copy.stepBackCoverDesc, status: includedStatus(4) },
      { id: 5, title: copy.stepPreview, description: copy.stepPreviewDesc, status: activeStep === 5 ? 'active' : activeStep > 5 ? 'completed' : 'pending' },
      { id: 6, title: copy.stepCollaborate, description: copy.stepCollaborateDesc, status: activeStep === 6 ? 'active' : activeStep > 6 ? 'completed' : 'pending' },
      { id: 7, title: copy.stepAI, description: copy.stepAIDesc, status: activeStep === 7 ? 'active' : activeStep > 7 ? 'completed' : 'pending' },
      { id: 8, title: copy.stepExport, description: copy.stepExportDesc, status: activeStep === 8 ? 'active' : activeStep > 8 ? 'completed' : 'pending' },
    ];
  }, [activeStep, copy, fixedPdf]);

  const handleSyncPageNumbers = () => {
    setPageNumberSyncState('saving');
    setPageNumberSyncFeedback('idle');

    startTransition(async () => {
      const formData = new FormData();
      formData.set('projectId', project.id);
      formData.set('device', preferences.device ?? 'desktop');
      formData.set('fontSize', preferences.fontSize ?? '16px');
      formData.set('marginTop', String(preferences.margins?.top ?? 24));
      formData.set('marginBottom', String(preferences.margins?.bottom ?? 24));
      formData.set('marginLeft', String(preferences.margins?.left ?? 24));
      formData.set('marginRight', String(preferences.margins?.right ?? 24));

      const result = await syncProjectPaginationAction(formData);
      router.refresh();
      setPageNumberSyncState('saved');
      setLastSyncedChapterSignature(chapterSignature);
      setPageNumberSyncFeedback(result?.status === 'missing-index' ? 'missing-index' : 'done');
      window.setTimeout(() => setPageNumberSyncState('idle'), 2000);
      window.setTimeout(() => setPageNumberSyncFeedback('idle'), 3500);
    });
  };

  // FASE C: composition engine output shared by the health panel and the
  // export gate (memoized per project revision).
  const composition = useDocumentComposition(project);
  const documentViolations = composition.result.violations;
  const documentViolationCount = documentViolations.length;
  // F1: channel pre-flight (KDP/IngramSpark/Kobo) over the same inputs the
  // composition used; merged into the health panel, errors feed the gate.
  const preflightInput = useMemo(() => {
    const { document } = projectToSemanticDocument(project);
    return { document, composed: composition.result, metadata: document.metadata };
  }, [project, composition.result]);
  const preflightChecks = useMemo(() => preflight(preflightInput), [preflightInput]);
  const preflightErrorCount = countPreflightErrors(preflightChecks);
  const exportGate = resolveDocumentRules(project.document.rules).exportGate;
  // Fixed-PDF document mode: Talent does not govern this document's
  // composition, so composition/preflight issues must never block or warn
  // about exporting the original PDF (see capabilities.canCompose).
  const gateIssueCount = capabilities.canCompose ? documentViolationCount + preflightErrorCount : 0;
  const exportBlocked = capabilities.canCompose && exportGate === 'block' && gateIssueCount > 0;

  // F0.3 undo: last chapter save of the session (recorded by the chapter
  // editor). Reverting re-saves the pre-save HTML through the regular save
  // action — no new endpoints; the recomposition after router.refresh()
  // happens on its own.
  const lastChapterSave = useSyncExternalStore(
    subscribeLastChapterSave,
    getLastChapterSaveSnapshot,
    () => null,
  );
  const revertibleSave =
    lastChapterSave &&
    lastChapterSave.projectId === project.id &&
    project.document.chapters.some((chapter) => chapter.id === lastChapterSave.chapterId)
      ? lastChapterSave
      : null;

  const handleRevertLastSave = () => {
    if (!revertibleSave) return;
    const snapshot = revertibleSave;
    startTransition(async () => {
      const formData = new FormData();
      formData.set('projectId', project.id);
      formData.set('chapterId', snapshot.chapterId);
      formData.set('chapterTitle', snapshot.chapterTitle);
      formData.set('htmlContent', snapshot.previousHtml);
      await saveChapterContentAction(formData);
      clearLastChapterSave();
      router.refresh();
    });
  };

  const renderFixedPdfIncludedPanel = (stepTitle: string) => (
    <section
      className="ac-surface-panel ac-surface-panel--subtle p-8 text-center"
      data-testid="fixed-pdf-included-panel"
    >
      <p className="ac-surface-panel__eyebrow">{stepTitle}</p>
      <span
        className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-text)]"
      >
        <Check className="h-3.5 w-3.5" />
        {copy.fixedPdfIncludedBadge}
      </span>
      <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">{copy.fixedPdfIncludedStepBody}</p>
    </section>
  );

  const renderStepContent = () => {
    switch (activeStep) {
      case 1: // Content
        return (
          <ContentWorkspace
            project={project}
            copy={copy}
            activeChapter={{ id: activeChapter.id, title: activeChapter.title }}
            brandProfiles={brandProfiles}
            documentViolations={documentViolations}
            preflightChecks={preflightChecks}
            diff={composition.diff}
            recomposedFromPage={composition.recomposedFromPage}
            telemetry={composition.telemetry}
            revert={
              revertibleSave
                ? {
                    chapterTitle: revertibleSave.chapterTitle,
                    pending: isPending,
                    onRevert: handleRevertLastSave,
                  }
                : null
            }
            locale={locale}
            history={history}
            coAuthor={coAuthor}
            onNavigateStep={setActiveStep}
          />
        );
      case 2: // Chapters
        if (fixedPdf) return renderFixedPdfIncludedPanel(copy.stepChapters);
        return (
          <section className="chapters-workspace-host">
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                data-testid="reimport-open-button"
                onClick={() => setIsReimportDialogOpen(true)}
                className="ac-button ac-button--secondary ac-button--sm"
              >
                {copy.reimportButton}
              </button>
            </div>
            <ChapterOrganizer
              projectId={project.id}
              chapters={project.document.chapters}
              activeChapterId={resolvedActiveChapterId}
              onSelect={setActiveChapterId}
              onEditChapter={setEditingChapterId}
              onAddChapter={() => setIsAddDialogOpen(true)}
              onImportChapter={() => setIsImportDialogOpen(true)}
              onSyncPageNumbers={handleSyncPageNumbers}
              pageNumberSyncState={
                pageNumberSyncState === 'saving'
                  ? 'syncing'
                  : pageNumberSyncState === 'saved'
                    ? 'synced'
                    : 'idle'
              }
              pageNumberIsStale={pageNumberIsStale}
              syncPageNumbersLabel={copy.chapterSyncPageNumbers}
              syncPageNumbersTitle={copy.chapterSyncPageNumbersTitle}
              syncPageNumbersHelper={copy.chapterSyncPageNumbersHelper}
              chapterActionEdit={copy.chapterActionEdit}
              chapterActionMoveUp={copy.chapterActionMoveUp}
              chapterActionMoveDown={copy.chapterActionMoveDown}
              chapterActionDelete={copy.chapterActionDelete}
              metricsById={chapterMetricsById}
              locale={locale}
            />
          </section>
        );
      case 3: // Cover
        if (fixedPdf) return renderFixedPdfIncludedPanel(copy.stepCover);
        return (
          <div className="mx-auto max-w-6xl space-y-6">
            <CoverStudioV2
              key={project.updatedAt}
              surfaceKind="cover"
              projectId={project.id}
              initialSurface={canonicalCoverSurface}
              sourceDocumentAssetId={sourceDocumentAssetId}
              pageCount={sourcePageCount}
              copy={coverDesignSurfaceCopy}
            />
          </div>
        );
      case 4: // Back Cover
        if (fixedPdf) return renderFixedPdfIncludedPanel(copy.stepBackCover);
        return (
          <div className="mx-auto max-w-6xl space-y-6">
            <CoverStudioV2
              key={project.updatedAt}
              surfaceKind="back-cover"
              projectId={project.id}
              initialSurface={canonicalBackCoverSurface}
              sourceDocumentAssetId={sourceDocumentAssetId}
              pageCount={sourcePageCount}
              copy={coverDesignSurfaceCopy}
            />
          </div>
        );
      case 5: // Preview
        return fixedPdf ? (
          <FixedPdfPreview projectId={project.id} copy={copy} />
        ) : (
          <PreviewCanvas project={project} copy={copy} />
        );
      case 6: // Collaborate
        return collaboration ? (
          <CollaborationPanel
            copy={collaboration.copy}
            projectId={project.id}
            view={collaboration.view}
            locale={locale}
          />
        ) : null;
      case 7: // AI
        return <AIAssistant />;
      case 8: // Export
        return (
          <section className="ac-surface-panel ac-export-suite">
            <div className="ac-export-suite__mark">
              <Download className="h-8 w-8" />
            </div>
            <div className="ac-export-suite__content">
              <h3 className="ac-export-suite__title">{copy.stepExport}</h3>
              <p className="ac-export-suite__summary">
                Tu proyecto está listo para ser publicado. Elige el formato de salida deseado.
              </p>
              {exportGate !== 'off' && gateIssueCount > 0 && (
                <p
                  role="alert"
                  data-testid="export-gate-message"
                  className={`mt-3 text-sm font-semibold ${exportBlocked ? 'text-red-600' : 'text-[var(--accent)]'}`}
                >
                  {exportBlocked
                    ? copy.exportGateBlockedMessage
                    : copy.exportGateWarnMessage.replace('{count}', String(gateIssueCount))}
                </p>
              )}
            </div>
            <div
              className={`ac-export-suite__actions ${exportBlocked ? 'pointer-events-none opacity-50' : ''}`}
              aria-disabled={exportBlocked}
            >
               <button
                 data-testid="export-html-button"
                 onClick={() => {
                   const htmlUrl = `/api/projects/export?projectId=${project.id}&${exportQuery}`;
                   window.open(htmlUrl, '_blank');
                 }}
                 disabled={exportBlocked || !capabilities.canExportHtml}
                 title={!capabilities.canExportHtml ? copy.fixedPdfHtmlUnavailable : undefined}
                 className="ac-button ac-button--secondary"
               >
                  {copy.previewExportButton}
               </button>
               {fixedPdf ? (
                 <button
                   data-testid="export-pdf-original-button"
                   onClick={() => {
                     window.open(`/api/projects/export/pdf?projectId=${project.id}`, '_blank');
                   }}
                   className="ac-button ac-button--primary"
                 >
                   {copy.fixedPdfExportLabel}
                 </button>
               ) : (
                 <PdfExportButton
                   project={project}
                   projectSlug={project.slug || ''}
                   copy={copy}
                   className="ac-button ac-button--primary"
                 />
               )}
               <button
                 data-testid="export-docx-button"
                 onClick={() => {
                   const docxUrl = `/api/projects/export/docx?projectId=${project.id}&${exportQuery}`;
                   window.open(docxUrl, '_blank');
                 }}
                 disabled={exportBlocked || !capabilities.canExportDocx}
                 title={!capabilities.canExportDocx ? copy.fixedPdfDocxUnavailable : undefined}
                 className="ac-button ac-button--secondary"
               >
                  {copy.previewExportDocxButton}
               </button>
               <button
                 data-testid="export-epub-button"
                 onClick={() => {
                   const epubUrl = `/api/projects/export/epub?projectId=${project.id}&${exportQuery}`;
                   window.open(epubUrl, '_blank');
                 }}
                 disabled={exportBlocked || !capabilities.canExportEpub}
                 title={!capabilities.canExportEpub ? copy.fixedPdfEpubUnavailable : undefined}
                 className="ac-button ac-button--secondary"
               >
                  {copy.previewExportEpubButton}
               </button>
               <button
                 data-testid="export-markdown-button"
                 onClick={() => {
                   const markdownUrl = `/api/projects/export/markdown?projectId=${project.id}&${exportQuery}`;
                   window.open(markdownUrl, '_blank');
                 }}
                 disabled={exportBlocked || !capabilities.canExportMarkdown}
                 title={!capabilities.canExportMarkdown ? copy.fixedPdfMarkdownUnavailable : undefined}
                 className="ac-button ac-button--secondary"
               >
                  {copy.previewExportMarkdownButton}
               </button>
               {capabilities.canCreateEditableCopy && (
                 <CreateEditableCopyButton
                   projectId={project.id}
                   label={copy.createEditableCopyButton}
                   className="ac-button ac-button--secondary"
                 />
               )}
            </div>
            {kdpDisclosure && <KdpDisclosurePanel disclosure={kdpDisclosure} copy={copy} />}
            {launchPack && (
              <LaunchPackPanel
                copy={launchPack.copy}
                projectId={project.id}
                view={launchPack.view}
              />
            )}
            {publishChannels && (
              <PublishChannelsPanel
                copy={publishChannels.copy}
                projectId={project.id}
                gumroadEnabled={publishChannels.gumroadEnabled}
                gumroadConnected={publishChannels.gumroadConnected}
              />
            )}
          </section>
        );
      default:
        return null;
    }
  };

  const savedLabel = (() => {
    if (isPending) return null;
    const updatedAt = new Date(project.updatedAt).getTime();
    if (!Number.isFinite(updatedAt)) return null;
    const minutes = Math.max(0, Math.floor((nowTick - updatedAt) / 60000));
    return minutes < 1
      ? copy.contentSavedJustNow
      : copy.contentSavedMinutesAgo.replace('{count}', String(minutes));
  })();

  return (
    <div className="ac-workspace-stage talent-workspace-stage" data-testid="project-workspace">
      {/* Header: portalled into the shared app shell's compact editor topbar
          (see AppShell.tsx's #talent-editor-topbar-slot) so the whole app
          shows one merged, compact header row instead of two stacked ones. */}
      <SlotPortal slotId="talent-editor-topbar-slot">
        <div className="talent-editor-topbar" data-testid="content-workspace-topbar">
          <div className="talent-editor-topbar__titles">
            <p className="talent-editor-topbar__eyebrow">{steps[activeStep - 1]?.title ?? copy.editorEyebrow}</p>
            <h2 className="talent-editor-topbar__title">{project.title}</h2>
          </div>

          <div className="talent-editor-topbar__status" data-testid="content-workspace-save-status">
            {isPending && (
              <span className="flex items-center gap-1.5" data-testid="project-save-status-saving">
                <Loader2 className="h-3 w-3 animate-spin" />
                Guardando…
              </span>
            )}
            {!isPending && saveStepState === 'saved' && (
              <span className="flex items-center gap-1.5 text-[var(--accent-text)]" data-testid="project-save-status-saved">
                <Check className="h-3 w-3" />
                Guardado
              </span>
            )}
            {!isPending && saveStepState !== 'saved' && savedLabel && <span>{savedLabel}</span>}
            {pageNumberSyncFeedback === 'done' && (
              <span className="flex items-center gap-1.5 text-[var(--accent-text)]" data-testid="pagination-sync-feedback-done">
                <Check className="h-3 w-3" />
                {copy.chapterSyncPageNumbersDone}
              </span>
            )}
            {pageNumberSyncFeedback === 'missing-index' && (
              <span className="text-amber-500" data-testid="pagination-sync-feedback-missing-index">
                {copy.chapterSyncPageNumbersMissingIndex}
              </span>
            )}
          </div>

          <div className="talent-editor-topbar__actions">
            <button
              type="button"
              data-testid="content-workspace-preview-button"
              onClick={() => setActiveStep(5)}
              className="dashboard-button dashboard-button--primary"
            >
              {copy.contentPreviewAction}
            </button>
            <button
              type="button"
              data-testid="document-data-open-button"
              onClick={() => setIsDocumentDataOpen(true)}
              className="dashboard-button"
            >
              {copy.documentDataOpen}
            </button>
          </div>
        </div>
      </SlotPortal>

      {/* Stepper Navigation */}
      <div className="talent-content-stepper-bar">
        <Stepper steps={steps} activeStep={activeStep} onStepClick={setActiveStep} />
      </div>

      {/* Step Layout */}
      <div className="ac-workflow-shell talent-workflow-shell">
        <div className={`ac-workflow-shell__layout${activeStep === 1 ? ' talent-workflow-shell__layout--full' : ''}`}>
        {activeStep !== 1 && (
          <aside className="ac-workflow-shell__rail xl:sticky xl:top-8 xl:self-start">
             <div className="ac-workflow-shell__panel ac-surface-panel ac-surface-panel--subtle p-5">
                <h4 className="ac-workflow-shell__panel-meta">Progreso</h4>
                <div className="ac-workflow-shell__panel-value mt-3">
                   <strong>{activeStep}</strong>
                   <span>de {steps.length} pasos</span>
                </div>
                <p className="ac-workflow-shell__panel-summary mt-4 text-xs leading-5">
                   {steps[activeStep - 1]?.description || 'Sigue el flujo editorial para completar tu publicación premium.'}
                </p>
             </div>

             <div className="ac-workflow-shell__actions">
                <button
                  data-testid="previous-step-button"
                  onClick={() => setActiveStep(prev => Math.max(1, prev - 1))}
                  disabled={activeStep === 1}
                  className={`${premiumSecondaryLightButton} w-full py-3 text-xs disabled:opacity-30 disabled:cursor-default cursor-pointer`}
                >
                   Paso anterior
                </button>
                <button
                  data-testid="next-step-button"
                  onClick={() => setActiveStep(prev => Math.min(steps.length, prev + 1))}
                  disabled={activeStep === steps.length}
                  className={`${premiumPrimaryDarkButton} w-full py-3 text-xs disabled:opacity-30 disabled:cursor-default cursor-pointer`}
                >
                   Siguiente paso
                </button>
             </div>
          </aside>
        )}

        <main className="ac-workflow-shell__content">
          {renderStepContent()}
        </main>
        </div>
      </div>

      {/* Modals rendered via Portal to escape any transform/backdrop-filter trapping */}
      <Portal>
        {editingChapterId !== null && editingChapterIndex >= 0 && (
          <ChapterEditorModal
            chapters={project.document.chapters}
            currentChapterIndex={editingChapterIndex}
            isOpen={editingChapterId !== null}
            projectId={project.id}
            onClose={() => setEditingChapterId(null)}
          />
        )}

        <AddChapterDialog
          isOpen={isAddDialogOpen}
          projectId={project.id}
          chapters={project.document.chapters}
          onClose={() => setIsAddDialogOpen(false)}
        />

        <ImportChapterDialog
          isOpen={isImportDialogOpen}
          projectId={project.id}
          chapters={project.document.chapters}
          onClose={() => setIsImportDialogOpen(false)}
        />

        <ReimportDialog
          isOpen={isReimportDialogOpen}
          projectId={project.id}
          chapters={project.document.chapters}
          copy={copy}
          onClose={() => setIsReimportDialogOpen(false)}
        />

        <DocumentDataModal
          isOpen={isDocumentDataOpen}
          mode="project"
          copy={copy}
          project={project}
          brandProfiles={brandProfiles}
          onClose={() => setIsDocumentDataOpen(false)}
        />

        {/* The document-data modal (deep link or post-import) takes priority:
            two overlays must never stack (MODAL_CONTRACT). */}
        {!initialOpenDocumentData && <WorkspaceOnboarding copy={copy} />}
      </Portal>
    </div>
  );
}
