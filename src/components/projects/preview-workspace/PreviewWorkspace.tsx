'use client';

/**
 * Step 5 — Vista previa. The single editorial validation workspace: pages rail, preview stage and composition panel.
 *
 * It only projects the canonical composition (composeProjectPreview / buildPreviewPages + MultipageFlow and the
 * canonical cover/back-cover DesignSurface). It owns UI state (mode, destination, zoom, current page) and never
 * writes project data.
 */

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { PanelLeft, PanelRight } from 'lucide-react';
import type { ProjectRecord } from '@/lib/projects/types';
import type { AppMessages } from '@/lib/i18n/messages';
import { buildComposedFlowHtml, composeProjectPreview, projectToSemanticDocument } from '@/lib/compose/preview-adapter';
import { createCanvasMeasurer } from '@/lib/compose/measure';
import { compileDocument, generateCssVariables } from '@/lib/style-engine/document-compiler';
import { buildPreviewPages, isTocChapter, type PreviewPage } from '@/lib/preview/preview-builder';
import { preflight } from '@/lib/preflight/preflight';
import { MultipageFlow } from '@/components/projects/MultipageFlow';
import {
  buildLogicalPages,
  buildPreflightRows,
  clampZoom,
  computeMetrics,
  destinationSupportsSpread,
  fitZoom,
  isPreviewMode,
  isReadingDestination,
  resolvePreviewGeometry,
  spreadAt,
  stepPage,
  type CoverSurfaceKind,
  type PreflightFinding,
  type PreviewMode,
  type ReadingDestination,
} from '@/lib/preview/preview-workspace';
import { PreviewToolbar } from './PreviewToolbar';
import { PreviewPageRail } from './PreviewPageRail';
import { PreviewCompositionPanel } from './PreviewCompositionPanel';
import { PreviewSurfacePage } from './PreviewSurfacePage';

type Copy = AppMessages['project'];

const MODE_KEY = 'anclora-talent.preview.mode';
const DESTINATION_KEY = 'anclora-talent.preview.destination';
const PAGE_GAP = 32;
/** Same paper/ink the chapter editor draws its pages with. */
const EDITOR_PAPER = '#f4f0e8';

/** Restrained device frames: the page keeps its real proportions, the frame only says where it is read. */
const FRAMES: Record<ReadingDestination, { x: number; top: number; bottom: number }> = {
  print: { x: 0, top: 0, bottom: 0 },
  desktop: { x: 0, top: 0, bottom: 0 },
  tablet: { x: 18, top: 18, bottom: 18 },
  ereader: { x: 22, top: 22, bottom: 46 },
};

function readStored<T extends string>(key: string, guard: (value: unknown) => value is T): T | null {
  try {
    const value = window.localStorage.getItem(key);
    return guard(value) ? value : null;
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Preferences are a convenience; the workspace works without storage.
  }
}

interface PreviewWorkspaceProps {
  project: ProjectRecord;
  copy: Copy;
  onExport?: () => void;
  exportHref?: string;
}

const noopSubscribe = () => () => undefined;

/**
 * The composition measures real glyphs with canvas, which differs from the server heuristic: rendering it during SSR
 * would hydrate against different pages. The workspace therefore mounts on the client only.
 */
export function PreviewWorkspace(props: PreviewWorkspaceProps) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!mounted) return <section className="pw" data-testid="preview-workspace-loading" aria-busy="true" aria-label={props.copy.pwTitle} />;
  return <PreviewWorkspaceView {...props} />;
}

function PreviewWorkspaceView({
  project,
  copy,
  onExport,
  exportHref,
}: PreviewWorkspaceProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  // --- UI state (never persisted into the project) -----------------------------------------------------------
  const [mode, setMode] = useState<PreviewMode>('document');
  const [destination, setDestination] = useState<ReadingDestination>('print');
  const [index, setIndex] = useState(0);
  const [fit, setFit] = useState(true);
  const [manualZoom, setManualZoom] = useState(100);
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const [fullscreen, setFullscreen] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    const storedMode = readStored(MODE_KEY, isPreviewMode);
    const storedDestination = readStored(DESTINATION_KEY, isReadingDestination);
    // Reading the viewer's saved preferences after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (storedMode) setMode(storedMode);
    if (storedDestination) setDestination(storedDestination);
  }, []);

  // The composition follows the destination without blocking the controls.
  const compositionDestination = useDeferredValue(destination);
  const busy = compositionDestination !== destination;

  // --- Canonical composition ---------------------------------------------------------------------------------
  const compiledDocument = useMemo(() => {
    const rawDoc = project.document.documentModel ?? {
      version: 1,
      metadata: project.document.metadata ?? { title: project.title },
      blocks: [],
    };
    return compileDocument({
      projectId: project.id,
      document: rawDoc,
      sourceStyleProfile: project.document.metadata?.originalDocumentStyleProfile ?? null,
      referenceProfile: project.document.metadata?.referenceEditorialProfile ?? null,
      brandProfile: project.brandProfile ?? null,
      userOverrides: project.document.metadata?.userOverrides ?? [],
      projectFontAssets: project.document.metadata?.projectFontAssets ?? [],
    });
  }, [project]);

  const styleVariables = useMemo(() => generateCssVariables(compiledDocument.styleMap), [compiledDocument.styleMap]);
  const sourceMargins = useMemo(() => ({
    top: compiledDocument.styleMap.page.marginsPt.top * (96 / 72),
    bottom: compiledDocument.styleMap.page.marginsPt.bottom * (96 / 72),
    left: compiledDocument.styleMap.page.marginsPt.left * (96 / 72),
    right: compiledDocument.styleMap.page.marginsPt.right * (96 / 72),
  }), [compiledDocument.styleMap]);

  const sourceFidelity = Boolean(
    project.document.metadata?.sourcePageMap?.status === 'VALID' &&
    project.document.metadata.sourcePageMap.pages.length > 0,
  );

  const geometry = useMemo(() => resolvePreviewGeometry({
    destination: compositionDestination,
    sourceFidelity,
    projectOverrides: {
      fontSize: compiledDocument.styleMap.body.fontSizePt * (96 / 72),
      lineHeight: compiledDocument.styleMap.body.lineHeight,
      pageWidth: compiledDocument.styleMap.page.widthPt * (96 / 72),
      pageHeight: compiledDocument.styleMap.page.heightPt * (96 / 72),
      margins: sourceMargins,
    },
  }), [compiledDocument.styleMap, compositionDestination, sourceFidelity, sourceMargins]);
  const config = geometry.config;
  // Paper: the document's own paper colour when it defines one (brand/composition), otherwise the editors' paper.
  const stylePaper = compiledDocument.styleMap.palette.paper;
  const paper = stylePaper && stylePaper.toUpperCase() !== '#FFFFFF' ? stylePaper : EDITOR_PAPER;
  const margins = useMemo(
    () => ({ top: config.marginTop, bottom: config.marginBottom, left: config.marginLeft, right: config.marginRight }),
    [config.marginBottom, config.marginLeft, config.marginRight, config.marginTop],
  );

  const measurer = useMemo(() => createCanvasMeasurer(), []);
  const composed = useMemo(() => composeProjectPreview(project, config, measurer), [config, measurer, project]);
  const previewPages = useMemo<PreviewPage[]>(
    () => (sourceFidelity ? buildPreviewPages(project, config) : composed.pages),
    [composed.pages, config, project, sourceFidelity],
  );
  const cover = useMemo(() => previewPages.find((page) => page.type === 'cover') ?? null, [previewPages]);
  const backCover = useMemo(() => previewPages.find((page) => page.type === 'back-cover') ?? null, [previewPages]);
  const contentPages = useMemo(() => previewPages.filter((page) => page.type === 'content'), [previewPages]);
  const contentHtml = useMemo(() => buildComposedFlowHtml(previewPages), [previewPages]);
  const canonicalPages = useMemo(
    () => contentPages.map((page) => ({ pageNumber: page.pageNumber, html: page.content, pageKind: page.pageKind, contentSlices: page.contentSlices })),
    [contentPages],
  );

  const [measuredContentPages, setMeasuredContentPages] = useState(contentPages.length || 1);
  const pages = useMemo(
    () => buildLogicalPages({ contentPageCount: measuredContentPages, hasBackCover: Boolean(backCover) }),
    [backCover, measuredContentPages],
  );
  const lastIndex = pages.length - 1;
  const safeIndex = Math.max(0, Math.min(index, lastIndex));
  const current = pages[safeIndex];

  const sources = useMemo<Array<PreviewPage | null>>(
    () => pages.map((page) => (page.kind === 'cover' ? cover : page.kind === 'back-cover' ? backCover : contentPages[page.contentIndex ?? 0] ?? null)),
    [backCover, contentPages, cover, pages],
  );

  // --- What the stage shows ----------------------------------------------------------------------------------
  const spreadAvailable = destinationSupportsSpread(destination);
  const effectiveMode: PreviewMode = mode === 'spread' && !spreadAvailable ? 'document' : mode;

  const view = useMemo(() => {
    if (effectiveMode === 'cover' || current.kind !== 'content') {
      const back = effectiveMode === 'cover' ? current.kind === 'back-cover' : current.kind === 'back-cover';
      return { type: 'surface' as const, surface: back ? ('back' as const) : ('front' as const), visible: [back ? lastIndex : 0] };
    }
    if (effectiveMode === 'spread') {
      const spread = spreadAt(pages, safeIndex);
      const visible = [spread.left, spread.right].filter((page): page is NonNullable<typeof page> => Boolean(page));
      const first = visible[0] ?? current;
      return { type: 'flow' as const, flowIndex: first.contentIndex ?? 0, flowMode: 'spread' as const, double: visible.length === 2, visible: visible.map((page) => page.index) };
    }
    return { type: 'flow' as const, flowIndex: current.contentIndex ?? 0, flowMode: 'single' as const, double: false, visible: [safeIndex] };
  }, [current, effectiveMode, lastIndex, pages, safeIndex]);

  const coverSurface: CoverSurfaceKind = view.type === 'surface' ? view.surface : 'front';
  const frame = FRAMES[destination];
  const sheetWidth = view.type === 'flow' && view.double ? config.pageWidth * 2 + PAGE_GAP : config.pageWidth;
  const sheetHeight = config.pageHeight;
  const naturalWidth = sheetWidth + frame.x * 2;
  const naturalHeight = sheetHeight + frame.top + frame.bottom;

  // --- Fit / zoom --------------------------------------------------------------------------------------------
  useEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    const measure = () => setStage({ width: element.clientWidth, height: element.clientHeight });
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const fitValue = fitZoom({ stageWidth: stage.width, stageHeight: stage.height, contentWidth: naturalWidth, contentHeight: naturalHeight });
  const zoom = fit ? fitValue : manualZoom;
  const scale = zoom / 100;

  const changeZoom = (delta: number) => {
    setManualZoom(clampZoom(zoom + delta));
    setFit(false);
  };

  // --- Navigation --------------------------------------------------------------------------------------------
  const goTo = useCallback((target: number) => {
    setIndex(Math.max(0, Math.min(lastIndex, target)));
  }, [lastIndex]);

  const goStep = useCallback((direction: 1 | -1) => {
    if (effectiveMode === 'cover') {
      if (!backCover) return;
      setIndex(direction === 1 ? lastIndex : 0);
      return;
    }
    setIndex(stepPage(pages, safeIndex, direction, effectiveMode));
  }, [backCover, effectiveMode, lastIndex, pages, safeIndex]);

  const canPrev = effectiveMode === 'cover' ? coverSurface === 'back' : safeIndex > 0;
  const canNext = effectiveMode === 'cover' ? Boolean(backCover) && coverSurface === 'front' : view.type === 'flow' ? Math.max(...view.visible) < lastIndex : safeIndex < lastIndex;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('input, select, textarea, [contenteditable="true"]')) return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); goStep(-1); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); goStep(1); }
    else if (event.key === 'Home') { event.preventDefault(); goTo(0); }
    else if (event.key === 'End') { event.preventDefault(); goTo(lastIndex); }
  };

  const changeMode = (next: PreviewMode) => {
    setMode(next);
    writeStored(MODE_KEY, next);
    if (next === 'cover' && current.kind === 'content') setIndex(0);
  };

  const changeDestination = (next: ReadingDestination) => {
    setDestination(next);
    writeStored(DESTINATION_KEY, next);
    setFit(true);
  };

  const changeCoverSurface = (surface: CoverSurfaceKind) => setIndex(surface === 'back' && backCover ? lastIndex : 0);

  const selectThumb = (target: number) => {
    if (mode === 'cover' && pages[target]?.kind === 'content') changeMode('document');
    goTo(target);
    setRailOpen(false);
  };

  const toggleFullscreen = () => {
    const element = rootRef.current;
    if (!element) return;
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void element.requestFullscreen?.();
  };
  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // --- Panel data --------------------------------------------------------------------------------------------
  const chapterSemanticType = useCallback((page: PreviewPage | undefined) => {
    const chapter = project.document.chapters.find((candidate) => candidate.id === page?.chapterId);
    if (!chapter) return undefined;
    return chapter.semanticType ?? (isTocChapter(chapter.title) ? 'toc' : undefined);
  }, [project.document.chapters]);

  const metrics = useMemo(() => computeMetrics({
    pages,
    contentPageSemanticTypes: pages.filter((page) => page.kind === 'content').map((page) => chapterSemanticType(contentPages[page.contentIndex ?? 0])),
  }), [chapterSemanticType, contentPages, pages]);

  const checks = useMemo(() => {
    try {
      const { document } = projectToSemanticDocument(project);
      return preflight({ document, composed: composed.result, metadata: document.metadata });
    } catch {
      return [];
    }
  }, [composed.result, project]);

  const preflightRows = useMemo(() => buildPreflightRows({
    checks,
    violations: composed.result.violations,
    toLogicalPage: (compositionPage) => Math.max(1, Math.min(lastIndex, compositionPage + 1)),
  }), [checks, composed.result.violations, lastIndex]);

  const renderFinding = (finding: PreflightFinding) => {
    if (finding.message) return finding.message;
    const template = copy.preflightRules[finding.rule];
    if (!template) return finding.rule;
    return Object.entries(finding.params).reduce((message, [key, value]) => message.replaceAll(`{${key}}`, value), template);
  };

  const notice = geometry.sourceAuthoritative
    ? { kind: 'fixed' as const, text: copy.pwFixedNotice }
    : geometry.recomposedForDevice
      ? { kind: 'recomposed' as const, text: copy.pwRecomposedNotice }
      : null;

  const viewLabel = destination === 'print' ? copy.pwViewPrint : destination === 'desktop' ? copy.pwViewDesktop : destination === 'tablet' ? copy.pwViewTablet : copy.pwViewEreader;
  const surfaceLabel = current.kind === 'cover' ? copy.pwCoverFront : current.kind === 'back-cover' ? copy.pwCoverBack : null;
  const flowVisible = view.type === 'flow';

  return (
    <section
      ref={rootRef}
      className="pw"
      data-testid="preview-workspace"
      data-destination={destination}
      data-busy={busy ? 'true' : 'false'}
      data-mode={effectiveMode}
      data-fit={fit ? 'true' : 'false'}
      data-source-authoritative={geometry.sourceAuthoritative ? 'true' : 'false'}
      aria-label={copy.pwTitle}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{ '--pw-paper': paper } as React.CSSProperties}
    >
      <aside className="pw-rail" data-testid="preview-page-rail" data-open={railOpen ? 'true' : 'false'}>
        <PreviewPageRail
          copy={copy}
          project={project}
          pages={pages}
          sources={sources}
          currentIndex={safeIndex}
          highlightIndices={view.visible}
          onSelect={selectThumb}
          pageWidth={config.pageWidth}
          pageHeight={config.pageHeight}
          margins={margins}
          styleVariables={styleVariables}
        />
      </aside>

      <div className="pw-main">
        <div className="pw-drawer-toggles">
          <button type="button" className="pw-icon-button" data-testid="preview-rail-toggle" aria-pressed={railOpen} aria-label={copy.pwRailToggle} title={copy.pwRailToggle} onClick={() => { setRailOpen((value) => !value); setPanelOpen(false); }}>
            <PanelLeft className="h-4 w-4" />
          </button>
          <button type="button" className="pw-icon-button" data-testid="preview-panel-toggle" aria-pressed={panelOpen} aria-label={copy.pwPanelToggle} title={copy.pwPanelToggle} onClick={() => { setPanelOpen((value) => !value); setRailOpen(false); }}>
            <PanelRight className="h-4 w-4" />
          </button>
        </div>
        <PreviewToolbar
          copy={copy}
          mode={effectiveMode}
          spreadAvailable={spreadAvailable}
          onModeChange={changeMode}
          coverSurface={coverSurface}
          onCoverSurfaceChange={changeCoverSurface}
          hasBackCover={Boolean(backCover)}
          pageNumber={safeIndex + 1}
          totalPages={pages.length}
          surfaceLabel={surfaceLabel}
          onPageInput={(page) => goTo(page - 1)}
          onPrev={() => goStep(-1)}
          onNext={() => goStep(1)}
          canPrev={canPrev}
          canNext={canNext}
          zoom={zoom}
          fitActive={fit}
          onZoomOut={() => changeZoom(-10)}
          onZoomIn={() => changeZoom(10)}
          onFit={() => setFit(true)}
          fullscreen={fullscreen}
          onToggleFullscreen={toggleFullscreen}
          onExport={onExport}
          exportHref={exportHref}
        />

        <div
          ref={stageRef}
          className="pw-stage"
          data-testid="preview-stage"
          data-overflow={fit ? 'fit' : 'manual'}
          role="region"
          aria-label={`${copy.pwStageLabel} — ${viewLabel}`}
        >
          <div className="pw-frame" style={{ width: naturalWidth * scale, height: naturalHeight * scale }} data-testid="preview-frame">
            <div
              className="pw-device"
              data-testid="preview-sheet"
              data-device={destination}
              data-page-width={config.pageWidth}
              data-page-height={config.pageHeight}
              data-zoom={zoom}
              style={{ width: naturalWidth, height: naturalHeight, padding: `${frame.top}px ${frame.x}px ${frame.bottom}px`, transform: `scale(${scale})` }}
            >
              <div className="pw-sheet" style={{ width: sheetWidth, height: sheetHeight }}>
                <div className={flowVisible ? 'pw-flow' : 'pw-flow pw-flow--hidden'} aria-hidden={!flowVisible} data-testid="preview-flow">
                  <MultipageFlow
                    html={contentHtml}
                    config={config}
                    currentPage={view.type === 'flow' ? view.flowIndex : 0}
                    viewMode={view.type === 'flow' ? view.flowMode : 'single'}
                    margins={margins}
                    styleVariables={styleVariables}
                    showPageNumbers
                    pageNumberOffset={2}
                    pageCountHint={contentPages.length}
                    onPageCountChange={setMeasuredContentPages}
                    sourceFooter={project.document.metadata?.originalDocumentStyleProfile?.footer ?? null}
                    canonicalPages={sourceFidelity ? canonicalPages : undefined}
                  />
                </div>
                {view.type === 'surface' && view.surface === 'front' && cover ? (
                  <PreviewSurfacePage page={cover} project={project} copy={copy} width={config.pageWidth} height={config.pageHeight} />
                ) : null}
                {view.type === 'surface' && view.surface === 'back' && backCover ? (
                  <PreviewSurfacePage page={backCover} project={project} copy={copy} width={config.pageWidth} height={config.pageHeight} />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <aside className="pw-panel" data-testid="preview-composition-panel" data-open={panelOpen ? 'true' : 'false'}>
        <PreviewCompositionPanel
          copy={copy}
          destination={destination}
          onDestinationChange={changeDestination}
          config={config}
          metrics={metrics}
          notice={notice}
          rows={preflightRows}
          renderFinding={renderFinding}
          onGoToPage={goTo}
          busy={busy}
        />
      </aside>
    </section>
  );
}
