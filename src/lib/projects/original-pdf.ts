import { fetchPrivateProjectDocument } from '@/lib/blob/client';
import type { ProjectRecord } from './types';

export class OriginalPdfNotFoundError extends Error {
  constructor(message = 'Source PDF not found') {
    super(message);
    this.name = 'OriginalPdfNotFoundError';
  }
}

/**
 * Fixed-PDF document mode: resolves the exact bytes of the uploaded original
 * PDF (the project's `source-document` asset), never a composed/recomposed
 * representation. Used wherever a consumer needs the original as an
 * in-memory buffer (e.g. bundling it into the launch pack) rather than
 * streaming it directly to an HTTP response (see
 * `/api/projects/export/pdf/route.ts`, which streams instead of buffering
 * and is intentionally left untouched by this helper).
 */
export async function fetchOriginalPdfBuffer(
  project: ProjectRecord,
): Promise<{ buffer: Buffer; fileName: string }> {
  const sourceAsset = project.assets.find((asset) => asset.usage === 'source-document');
  if (!sourceAsset?.blobUrl) {
    throw new OriginalPdfNotFoundError();
  }

  const blob = await fetchPrivateProjectDocument(
    sourceAsset.blobUrl,
    project.document.source?.sourceAccessLevel ?? 'private',
  );
  if (!blob || blob.statusCode !== 200) {
    throw new OriginalPdfNotFoundError();
  }

  const arrayBuffer = await new Response(blob.stream).arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    fileName: sourceAsset.fileName || `${project.slug || 'proyecto'}.pdf`,
  };
}
