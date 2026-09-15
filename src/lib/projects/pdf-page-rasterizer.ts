/**
 * Cover Studio v2 — original-page rasterization (mission §33-39).
 *
 * Renders one page of a project's original source document (any project
 * with a `source-document` asset, not only fixed-pdf ones) to a PNG data
 * URL, client-side, via the same pdfjs-dist + same-origin worker setup
 * `FixedPdfPreview.tsx` already uses. The rendered pixels feed
 * `applyOriginalPageBackground()` as the cover/back-cover background image
 * — the original PDF file itself is never read, modified, or re-uploaded;
 * this only ever produces a derived raster copy for one page.
 */

const DEFAULT_TARGET_WIDTH = 1600;

export async function rasterizeSourcePdfPage(
  projectId: string,
  pageNumber: number,
  targetWidth: number = DEFAULT_TARGET_WIDTH,
): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const documentUrl = `/api/projects/source-pdf?projectId=${encodeURIComponent(projectId)}`;
  const pdfDoc = await pdfjsLib.getDocument({ url: documentUrl }).promise;

  try {
    const page = await pdfDoc.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = targetWidth / baseViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D canvas context unavailable');

    await page.render({ canvas, canvasContext: context, viewport }).promise;
    return canvas.toDataURL('image/png');
  } finally {
    pdfDoc.destroy();
  }
}

/** Cover uses page 1; back cover uses the document's last page (mission §39). */
export function resolveOriginPageNumber(surfaceKind: 'cover' | 'back-cover', pageCount: number | null | undefined): number {
  if (surfaceKind === 'cover') return 1;
  return Math.max(1, pageCount ?? 1);
}
