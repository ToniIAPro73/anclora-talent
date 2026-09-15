'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import type { AppMessages } from '@/lib/i18n/messages';

type ViewerStatus = 'loading' | 'ready' | 'error';

/**
 * Fixed-PDF document mode: renders the ORIGINAL, unmodified PDF — never a
 * composed/reconstructed representation. Pages are drawn onto a <canvas>
 * with pdfjs-dist; the rendered pixels are exactly what the source PDF
 * contains (only the surrounding chrome responds to light/dark).
 */
export function FixedPdfPreview({
  projectId,
  copy,
}: {
  projectId: string;
  copy: AppMessages['project'];
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pdfDocRef = useRef<import('pdfjs-dist').PDFDocumentProxy | null>(null);
  const [status, setStatus] = useState<ViewerStatus>('loading');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus('loading');
      try {
        const pdfjsLib = await import('pdfjs-dist');
        // Served as a plain static file (see `postinstall` in package.json,
        // which copies it from node_modules on every install) instead of a
        // bundler-resolved `new URL(...)` reference: this repo's
        // `serverExternalPackages` already carves out `pdfjs-dist` for the
        // server-side pdf-parse path, which collided with Turbopack trying
        // to resolve the worker for this CLIENT bundle too ("Package
        // pdfjs-dist can't be external" — the worker chunk was silently not
        // emitted). A same-origin static path sidesteps that entirely.
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        const documentUrl = `/api/projects/source-pdf?projectId=${encodeURIComponent(projectId)}`;
        const pdfDoc = await pdfjsLib.getDocument({ url: documentUrl }).promise;
        if (cancelled) {
          pdfDoc.destroy();
          return;
        }

        pdfDocRef.current = pdfDoc;
        setPageCount(pdfDoc.numPages);
        setPageNumber(1);
        setStatus('ready');
      } catch (error) {
        console.error('[FixedPdfPreview] failed to load the source PDF', error);
        if (!cancelled) {
          setStatus('error');
        }
      }
    }

    load();

    return () => {
      cancelled = true;
      pdfDocRef.current?.destroy();
      pdfDocRef.current = null;
    };
  }, [projectId]);

  useEffect(() => {
    if (status !== 'ready' || !pdfDocRef.current || !canvasRef.current) return;
    let cancelled = false;

    async function renderPage() {
      const pdfDoc = pdfDocRef.current;
      const canvas = canvasRef.current;
      if (!pdfDoc || !canvas) return;

      const page = await pdfDoc.getPage(pageNumber);
      if (cancelled) return;

      const containerWidth = containerRef.current?.clientWidth ?? 640;
      const baseViewport = page.getViewport({ scale: 1 });
      const fitScale = (containerWidth / baseViewport.width) * zoom;
      const viewport = page.getViewport({ scale: fitScale });

      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvas, canvasContext: context, viewport }).promise;
    }

    renderPage();

    return () => {
      cancelled = true;
    };
  }, [status, pageNumber, zoom]);

  return (
    <div
      className="ac-surface-panel ac-surface-panel--subtle p-6"
      data-testid="fixed-pdf-preview"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="fixed-pdf-prev-page"
            onClick={() => setPageNumber((current) => Math.max(1, current - 1))}
            disabled={status !== 'ready' || pageNumber <= 1}
            className="ac-button ac-button--ghost ac-button--sm"
            aria-label={copy.previewModalPage}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]" data-testid="fixed-pdf-page-indicator">
            {status === 'ready' ? `${copy.previewModalPage} ${pageNumber} / ${pageCount}` : ''}
          </span>
          <button
            type="button"
            data-testid="fixed-pdf-next-page"
            onClick={() => setPageNumber((current) => Math.min(pageCount, current + 1))}
            disabled={status !== 'ready' || pageNumber >= pageCount}
            className="ac-button ac-button--ghost ac-button--sm"
            aria-label={copy.previewModalPage}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="fixed-pdf-zoom-out"
            onClick={() => setZoom((current) => Math.max(0.5, current - 0.25))}
            disabled={status !== 'ready'}
            className="ac-button ac-button--ghost ac-button--sm"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            type="button"
            data-testid="fixed-pdf-zoom-in"
            onClick={() => setZoom((current) => Math.min(2.5, current + 0.25))}
            disabled={status !== 'ready'}
            className="ac-button ac-button--ghost ac-button--sm"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex max-w-full items-center justify-center overflow-x-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--page-surface)] p-4"
      >
        {status === 'loading' && (
          <p className="py-16 text-sm text-[var(--text-secondary)]" data-testid="fixed-pdf-preview-loading">
            {copy.fixedPdfPreviewLoading}
          </p>
        )}
        {status === 'error' && (
          <p className="py-16 text-sm text-red-400" data-testid="fixed-pdf-preview-error">
            {copy.fixedPdfPreviewError}
          </p>
        )}
        <canvas
          ref={canvasRef}
          data-testid="fixed-pdf-canvas"
          className={status === 'ready' ? 'max-w-full' : 'hidden'}
        />
      </div>
    </div>
  );
}
