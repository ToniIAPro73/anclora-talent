'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toJpeg } from 'html-to-image';
import { PDFDocument } from 'pdf-lib';
import { buildPreviewPages, type PreviewPage } from '@/lib/preview/preview-builder';
import {
  buildPaginationConfig,
  FORMAT_PRESETS,
  type PaginationConfig,
  type PreviewFormat,
} from '@/lib/preview/device-configs';
import { useEditorPreferences } from '@/hooks/use-editor-preferences';
import { defaultEditorPreferences } from '@/lib/ui-preferences/preferences';
import type { ProjectRecord } from '@/lib/projects/types';
import type { AppMessages } from '@/lib/i18n/messages';
import { CoverPreview } from './CoverPreview';
import { BackCoverPreview } from './BackCoverPreview';
import { createDefaultSurfaceState, normalizeSurfaceState } from '@/lib/projects/cover-surface';
import { resolveBackCoverSurfaceFields } from '@/lib/projects/back-cover-surface-resolver';
import { resolveCoverSurfaceFields } from '@/lib/projects/cover-surface-resolver';

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function nextPaint() {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function resolveExportFormat(device: string | undefined): PreviewFormat {
  if (device === 'desktop') return 'laptop';
  if (device === 'mobile' || device === 'tablet') return device;
  return 'laptop';
}

function buildClientPaginationConfig(
  device: string | undefined,
  fontSize: string | undefined,
  margins:
    | {
        top: number;
        bottom: number;
        left: number;
        right: number;
      }
    | undefined,
) {
  return buildPaginationConfig(resolveExportFormat(device), {
    fontSize: fontSize ?? defaultEditorPreferences.fontSize,
    margins: margins ?? defaultEditorPreferences.margins!,
  });
}

function buildCoverSurface(project: ProjectRecord) {
  const fallback = createDefaultSurfaceState('cover');
  const baseState = normalizeSurfaceState(project.cover.surfaceState ?? fallback);
  return {
    ...baseState,
    fields: {
      ...baseState.fields,
      ...resolveCoverSurfaceFields(project, baseState),
    },
  };
}

function buildBackCoverSurface(project: ProjectRecord) {
  const fallback = createDefaultSurfaceState('back-cover');
  const baseState = normalizeSurfaceState(project.backCover.surfaceState ?? fallback);
  return {
    ...baseState,
    fields: {
      ...baseState.fields,
      ...resolveBackCoverSurfaceFields(project, baseState),
    },
  };
}

function PreviewContentPage({
  page,
  config,
}: {
  page: PreviewPage;
  config: PaginationConfig;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-[8px] border border-[var(--preview-paper-border)] bg-[var(--preview-paper)] shadow-[var(--shadow-strong)]"
      style={{
        width: `${config.pageWidth}px`,
        height: `${config.pageHeight}px`,
        paddingTop: `${config.marginTop}px`,
        paddingBottom: `${config.marginBottom}px`,
        paddingLeft: `${config.marginLeft}px`,
        paddingRight: `${config.marginRight}px`,
        textAlign: 'left',
      }}
    >
      <style>{`
        .pdf-export-content-root {
          height: 100%;
          overflow: hidden;
          color: var(--text-primary);
          font-size: ${config.fontSize}px;
          line-height: ${config.lineHeight};
          text-align: left;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .pdf-export-content-root p,
        .pdf-export-content-root h1,
        .pdf-export-content-root h2,
        .pdf-export-content-root h3,
        .pdf-export-content-root h4,
        .pdf-export-content-root h5,
        .pdf-export-content-root h6,
        .pdf-export-content-root blockquote,
        .pdf-export-content-root li {
          text-align: inherit;
        }
        .pdf-export-content-root > * {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .pdf-export-content-root img {
          max-width: 100%;
          height: auto;
          object-fit: cover;
        }
        .pdf-export-content-root p {
          margin: 0;
          overflow-wrap: break-word;
          word-break: break-word;
        }
        .pdf-export-content-root p + p {
          margin-top: 0.8rem;
        }
        .pdf-export-content-root [data-toc-line="true"] {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
          width: 100%;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
        }
        .pdf-export-content-root [data-toc-title="true"] {
          display: block;
          flex: 0 1 auto;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .pdf-export-content-root [data-toc-title="true"] * {
          white-space: nowrap !important;
        }
        .pdf-export-content-root [data-toc-title="true"] br {
          display: none;
        }
        .pdf-export-content-root [data-toc-leader="true"] {
          display: block;
          flex: 1 1 auto;
          min-width: 0.5rem;
          overflow: hidden;
          color: var(--text-tertiary);
          line-height: 1;
          transform: translateY(-0.02em);
          white-space: nowrap;
          font-size: 0;
        }
        .pdf-export-content-root [data-toc-leader="true"]::before {
          content: '················································································································································';
          display: block;
          font-size: 1rem;
          letter-spacing: 0.08em;
          white-space: nowrap;
        }
        .pdf-export-content-root [data-toc-page="true"] {
          display: inline-block;
          flex: 0 0 auto;
          min-width: 1.5rem;
          text-align: right;
          font-weight: 700;
          white-space: nowrap;
        }
        .pdf-export-content-root h1 {
          font-size: 2rem;
          line-height: 1.1;
          font-weight: 800;
          margin: 0 0 1rem 0;
          color: var(--text-primary);
        }
        .pdf-export-content-root h2 {
          font-size: 1.5rem;
          line-height: 1.2;
          font-weight: 750;
          margin: 0 0 0.85rem 0;
          color: var(--text-primary);
        }
        .pdf-export-content-root h3 {
          font-size: 1.2rem;
          line-height: 1.3;
          font-weight: 700;
          margin: 0 0 0.75rem 0;
          color: var(--text-primary);
        }
        .pdf-export-content-root h4 {
          font-size: 1.05rem;
          line-height: 1.35;
          font-weight: 700;
          margin: 0 0 0.65rem 0;
          color: var(--text-primary);
        }
        .pdf-export-content-root h5,
        .pdf-export-content-root h6 {
          font-size: 0.95rem;
          line-height: 1.4;
          font-weight: 700;
          margin: 0 0 0.6rem 0;
          color: var(--text-primary);
        }
        .pdf-export-content-root ul,
        .pdf-export-content-root ol {
          margin: 0 0 1rem 1.5rem;
          padding: 0;
        }
        .pdf-export-content-root ul:not([data-bullet-style]) {
          list-style-type: disc;
        }
        .pdf-export-content-root ol:not([data-list-style]) {
          list-style-type: decimal;
        }
        .pdf-export-content-root li {
          margin: 0.35rem 0;
        }
        .pdf-export-content-root ul[data-bullet-style="disc"] {
          list-style-type: disc;
        }
        .pdf-export-content-root ul[data-bullet-style="circle"] {
          list-style-type: circle;
        }
        .pdf-export-content-root ul[data-bullet-style="square"] {
          list-style-type: square;
        }
        .pdf-export-content-root ul[data-bullet-style="diamond"],
        .pdf-export-content-root ul[data-bullet-style="arrow"],
        .pdf-export-content-root ul[data-bullet-style="check"] {
          list-style: none;
          padding-left: 0;
        }
        .pdf-export-content-root ul[data-bullet-style="diamond"] > li,
        .pdf-export-content-root ul[data-bullet-style="arrow"] > li,
        .pdf-export-content-root ul[data-bullet-style="check"] > li {
          position: relative;
          padding-left: 1.5rem;
        }
        .pdf-export-content-root ul[data-bullet-style="diamond"] > li::before {
          content: "◆";
        }
        .pdf-export-content-root ul[data-bullet-style="arrow"] > li::before {
          content: "➤";
        }
        .pdf-export-content-root ul[data-bullet-style="check"] > li::before {
          content: "✓";
        }
        .pdf-export-content-root ul[data-bullet-style="diamond"] > li::before,
        .pdf-export-content-root ul[data-bullet-style="arrow"] > li::before,
        .pdf-export-content-root ul[data-bullet-style="check"] > li::before {
          position: absolute;
          left: 0;
          color: var(--text-primary);
          font-weight: 700;
        }
        .pdf-export-content-root ol[data-list-style="decimal"] {
          list-style-type: decimal;
        }
        .pdf-export-content-root ol[data-list-style="upper-alpha"] {
          list-style-type: upper-alpha;
        }
        .pdf-export-content-root ol[data-list-style="lower-alpha"] {
          list-style-type: lower-alpha;
        }
        .pdf-export-content-root ol[data-list-style="upper-roman"] {
          list-style-type: upper-roman;
        }
        .pdf-export-content-root ol[data-list-style="lower-roman"] {
          list-style-type: lower-roman;
        }
        .pdf-export-content-root ol[data-list-style="decimal-parentheses"],
        .pdf-export-content-root ol[data-list-style="lower-alpha-parentheses"] {
          list-style: none;
          counter-reset: custom-list;
          padding-left: 0;
        }
        .pdf-export-content-root ol[data-list-style="decimal-parentheses"] > li,
        .pdf-export-content-root ol[data-list-style="lower-alpha-parentheses"] > li {
          position: relative;
          padding-left: 2rem;
          counter-increment: custom-list;
        }
        .pdf-export-content-root ol[data-list-style="decimal-parentheses"] > li::before {
          content: counter(custom-list) ") ";
        }
        .pdf-export-content-root ol[data-list-style="lower-alpha-parentheses"] > li::before {
          content: counter(custom-list, lower-alpha) ") ";
        }
        .pdf-export-content-root ol[data-list-style="decimal-parentheses"] > li::before,
        .pdf-export-content-root ol[data-list-style="lower-alpha-parentheses"] > li::before {
          position: absolute;
          left: 0;
          color: var(--text-primary);
          font-weight: 600;
        }
        .pdf-export-content-root hr {
          display: none;
        }
      `}</style>
      <div
        className="pdf-export-content-root ProseMirror"
        dangerouslySetInnerHTML={{ __html: page.content ?? '' }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-7 flex justify-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(7,12,20,0.05)] px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-[var(--text-tertiary)]">
          <span aria-hidden="true" className="text-[10px] tracking-[0.08em] opacity-70">∿∿</span>
          <span>{page.pageNumber}</span>
          <span aria-hidden="true" className="text-[10px] tracking-[0.08em] opacity-70">∿∿</span>
        </span>
      </div>
    </div>
  );
}

function PreviewCapturePage({
  page,
  project,
  copy,
  config,
  format,
}: {
  page: PreviewPage;
  project: ProjectRecord;
  copy: AppMessages['project'];
  config: PaginationConfig;
  format: PreviewFormat;
}) {
  const preset = FORMAT_PRESETS[format];

  if (page.type === 'cover' && page.coverData) {
    if (page.coverData.renderedImageUrl) {
      return (
        <div
          className="relative overflow-hidden rounded-[8px] border border-white/10 bg-[#070c14] shadow-[var(--shadow-strong)]"
          style={{ width: `${preset.viewportWidth}px`, height: `${preset.pagePixelHeight}px` }}
        >
          <img
            src={page.coverData.renderedImageUrl}
            alt={copy.previewModalCoverAlt}
            className="h-full w-full object-cover"
          />
        </div>
      );
    }

    return (
      <div
        className="overflow-hidden rounded-[8px] border border-white/10 shadow-[var(--shadow-strong)]"
        style={{ width: `${preset.viewportWidth}px`, height: `${preset.pagePixelHeight}px` }}
      >
        <CoverPreview
          surface={buildCoverSurface(project)}
          palette={project.cover.palette}
          backgroundImageUrl={project.cover.backgroundImageUrl}
          eyebrow={copy.coverEyebrow}
          visualOnly
        />
      </div>
    );
  }

  if (page.type === 'back-cover' && page.backCoverData) {
    if (page.backCoverData.renderedImageUrl) {
      return (
        <div
          className="relative overflow-hidden rounded-[8px] border border-white/10 bg-[#070c14] shadow-[var(--shadow-strong)]"
          style={{ width: `${preset.viewportWidth}px`, height: `${preset.pagePixelHeight}px` }}
        >
          <img
            src={page.backCoverData.renderedImageUrl}
            alt={copy.previewModalBackCoverAlt}
            className="h-full w-full object-cover"
          />
        </div>
      );
    }

    return (
      <div
        className="overflow-hidden rounded-[8px] border border-white/10 shadow-[var(--shadow-strong)]"
        style={{ width: `${preset.viewportWidth}px`, height: `${preset.pagePixelHeight}px` }}
      >
        <BackCoverPreview
          surface={buildBackCoverSurface(project)}
          backgroundImageUrl={project.backCover.backgroundImageUrl}
          accentColor={project.backCover.accentColor}
          eyebrow={copy.backCoverEyebrow}
          visualOnly
        />
      </div>
    );
  }

  return <PreviewContentPage page={page} config={config} />;
}

export function PdfExportButton({
  project,
  projectSlug,
  copy,
  className,
}: {
  project: ProjectRecord;
  projectSlug: string;
  copy: AppMessages['project'];
  className: string;
}) {
  const { preferences } = useEditorPreferences();
  const [isExporting, setIsExporting] = useState(false);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const captureNodeRef = useRef<HTMLDivElement | null>(null);

  const format = resolveExportFormat(preferences.device);
  const config = useMemo(
    () => buildClientPaginationConfig(preferences.device, preferences.fontSize, preferences.margins),
    [preferences.device, preferences.fontSize, preferences.margins],
  );
  const pages = useMemo(() => buildPreviewPages(project, config), [project, config]);

  useEffect(() => {
    if (!isExporting) {
      setActivePageIndex(0);
    }
  }, [isExporting]);

  const handleExport = async () => {
    if (isExporting) return;

    try {
      setIsExporting(true);

      if ('fonts' in document) {
        await (document as Document & { fonts: FontFaceSet }).fonts.ready;
      }

      const pdfDoc = await PDFDocument.create();

      for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
        setActivePageIndex(pageIndex);
        await nextPaint();
        await sleep(60);

        const captureNode = captureNodeRef.current;
        if (!captureNode) {
          throw new Error(`No se pudo preparar la captura de la página ${pageIndex + 1}.`);
        }

        const jpegDataUrl = await toJpeg(captureNode, {
          cacheBust: true,
          quality: 0.92,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
        });

        const image = await pdfDoc.embedJpg(jpegDataUrl);
        const pdfPage = pdfDoc.addPage([config.pageWidth, config.pageHeight]);
        pdfPage.drawImage(image, {
          x: 0,
          y: 0,
          width: config.pageWidth,
          height: config.pageHeight,
        });
      }

      const bytes = await pdfDoc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      downloadBlob(`${projectSlug || copy.previewExportFilename}.pdf`, blob);
    } catch (error) {
      console.error('[pdf-export/client] failed', error);
      const message =
        error instanceof Error ? error.message : 'No se pudo exportar el PDF desde el navegador.';
      window.alert(message);
    } finally {
      setIsExporting(false);
    }
  };

  const activePage = pages[activePageIndex] ?? pages[0];

  return (
    <>
      <button type="button" onClick={handleExport} disabled={isExporting} className={className}>
        {isExporting ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Exportando PDF...
          </span>
        ) : (
          copy.previewExportPdfButton
        )}
      </button>

      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-[-200vw] top-0"
        style={{ textAlign: 'left' }}
      >
        <div ref={captureNodeRef}>
          {activePage ? (
            <PreviewCapturePage
              page={activePage}
              project={project}
              copy={copy}
              config={config}
              format={format}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
