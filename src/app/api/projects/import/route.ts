import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/guards';
import { buildImportOcrRunner } from '@/lib/filestudio/ocr';
import { extractImportedDocumentSeed } from '@/lib/projects/import';
import { SYSTEM_COMPOSITION_DEFAULTS, type CompositionSource } from '@/lib/projects/composition';
import { extractDocxNormalStyle } from '@/lib/projects/docx-styles';
import { importSessionRepository } from '@/lib/projects/import-session';
import { uploadPrivateProjectDocument, fetchPrivateProjectDocument } from '@/lib/blob/client';
import { sha256Buffer } from '@/lib/projects/hash';
import type { DocumentMode, ManuscriptType, SourceDocumentAccessLevel } from '@/lib/projects/types';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const SUPPORTED_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'txt', 'md']);
const MANUSCRIPT_TYPES = new Set<ManuscriptType>(['essay', 'guide', 'novel', 'non-fiction']);

function getExtension(fileName: string) {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? (parts.at(-1) ?? '') : '';
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const contentType = request.headers?.get ? request.headers.get('content-type') ?? '' : '';

  let file: File | null = null;
  let fileName = '';
  let mimeType = '';
  let sizeBytes = 0;
  let sourceBlobUrl: string | null = null;
  let sourceAccessLevel: SourceDocumentAccessLevel | null = null;
  let sourceSha256: string | null = null;
  let manuscriptTypeOverride: ManuscriptType | undefined;
  let documentModeChoice: DocumentMode = 'editable';

  if (contentType.includes('application/json')) {
    try {
      const body = await request.json();
      sourceBlobUrl = body.sourceBlobUrl ? String(body.sourceBlobUrl).trim() : null;
      fileName = String(body.fileName ?? '').trim();
      mimeType = String(body.mimeType ?? '').trim();
      sizeBytes = Number(body.sizeBytes ?? 0);
      documentModeChoice = body.documentMode === 'fixed-pdf' ? 'fixed-pdf' : 'editable';

      if (
        typeof body.manuscriptType === 'string' &&
        MANUSCRIPT_TYPES.has(body.manuscriptType as ManuscriptType)
      ) {
        manuscriptTypeOverride = body.manuscriptType as ManuscriptType;
      }

      if (!sourceBlobUrl || !fileName) {
        return NextResponse.json({ error: 'Missing sourceBlobUrl or fileName' }, { status: 400 });
      }

      const streamResult = await fetchPrivateProjectDocument(sourceBlobUrl, 'private');
      if (!streamResult || !streamResult.stream) {
        return NextResponse.json({ error: 'Failed to read stored source document' }, { status: 502 });
      }

      // Convert stream to Buffer
      const chunks: Uint8Array[] = [];
      const reader = (streamResult.stream as ReadableStream<Uint8Array>).getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      const buffer = Buffer.concat(chunks);
      sourceSha256 = sha256Buffer(buffer);
      sizeBytes = buffer.byteLength;
      sourceAccessLevel = 'private';
      file = new File([buffer], fileName, { type: mimeType });
    } catch (err) {
      console.error('[import-route] json parse/fetch error', err);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
  } else {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const uploaded = formData.get('sourceDocument');
    if (!(uploaded instanceof File) || uploaded.size === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    file = uploaded;
    fileName = file.name;
    mimeType = file.type;
    sizeBytes = file.size;

    const manuscriptTypeField = formData.get('manuscriptType');
    if (
      typeof manuscriptTypeField === 'string' &&
      MANUSCRIPT_TYPES.has(manuscriptTypeField as ManuscriptType)
    ) {
      manuscriptTypeOverride = manuscriptTypeField as ManuscriptType;
    }

    const docModeField = formData.get('documentMode');
    if (docModeField === 'fixed-pdf') {
      documentModeChoice = 'fixed-pdf';
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    sourceSha256 = sha256Buffer(buffer);

    // If private blob token is configured, securely store the uploaded document
    if (process.env.SOURCE_DOCUMENT_READ_WRITE_TOKEN) {
      try {
        const stored = await uploadPrivateProjectDocument(randomUUID(), file);
        sourceBlobUrl = stored.url;
        sourceAccessLevel = stored.accessLevel;
      } catch (uploadError) {
        console.warn('[import-route] private storage upload failed or skipped', uploadError);
      }
    }
  }

  if (!file) {
    return NextResponse.json({ error: 'No file available' }, { status: 400 });
  }

  if (sizeBytes > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'FILE_TOO_LARGE' }, { status: 413 });
  }

  const extension = getExtension(fileName);
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    return NextResponse.json({ error: 'FORMAT_UNSUPPORTED' }, { status: 422 });
  }

  if (extension === 'pdf') {
    documentModeChoice = 'fixed-pdf';
  }

  // U6: best-effort composition extraction from the DOCX Normal style.
  let composition: { settings: typeof SYSTEM_COMPOSITION_DEFAULTS; source: CompositionSource } = {
    settings: SYSTEM_COMPOSITION_DEFAULTS,
    source: 'not-extracted',
  };
  if (extension === 'docx') {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const normalStyle = await extractDocxNormalStyle(buffer);
      if (normalStyle) {
        composition = {
          settings: { ...SYSTEM_COMPOSITION_DEFAULTS, ...normalStyle },
          source: 'docx-styles',
        };
      }
    } catch (styleError) {
      console.warn('[import-route] docx style extraction failed; using defaults', {
        fileName,
        styleError,
      });
    }
  }

  try {
    const ocr = await buildImportOcrRunner(user.id);
    const seed = await extractImportedDocumentSeed(file, { ocr, manuscriptTypeOverride });

    // Create import session in PostgreSQL to decouple parsing from final create
    const session = await importSessionRepository.createImportSession(user.id, {
      sourceFileName: seed.sourceFileName || fileName,
      sourceMimeType: seed.sourceMimeType || mimeType,
      sourceBlobUrl,
      sourceAccessLevel,
      sourceSha256,
      sourceSizeBytes: sizeBytes,
      documentMode: documentModeChoice,
      extractedSeed: seed,
      composition: composition.settings,
    });

    return NextResponse.json({
      ok: true,
      importSessionId: session.id,
      title: seed.title,
      subtitle: seed.subtitle,
      author: seed.author,
      chapterCount: seed.chapters?.length ?? 1,
      chapterTitles: seed.chapters?.map((chapter) => chapter.title).slice(0, 4) ?? [],
      warnings: seed.warnings ?? [],
      confidence: seed.confidence,
      manuscriptType: seed.manuscriptType,
      detectedManuscriptType: seed.detectedManuscriptType,
      sourceFileName: seed.sourceFileName,
      ocrAppliedMode: seed.ocrAppliedMode,
      parseWarning: Boolean(seed.parseFailed),
      composition,
      sourceBlobUrl,
      documentMode: documentModeChoice,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Import failed';
    console.error('[import-route] extraction failed', { userId: user.id, fileName, detail });
    return NextResponse.json({ error: 'IMPORT_FAILED', detail }, { status: 422 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionId = request.nextUrl.searchParams.get('sessionId');
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
  }

  await importSessionRepository.deleteImportSession(user.id, sessionId);
  return NextResponse.json({ ok: true });
}
