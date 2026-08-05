import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/guards';
import { buildImportOcrRunner } from '@/lib/filestudio/ocr';
import { extractImportedDocumentSeed } from '@/lib/projects/import';
import type { ManuscriptType } from '@/lib/projects/types';

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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const file = formData.get('sourceDocument');

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'FILE_TOO_LARGE' }, { status: 413 });
  }

  const extension = getExtension(file.name);
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    return NextResponse.json({ error: 'FORMAT_UNSUPPORTED' }, { status: 422 });
  }

  const manuscriptTypeField = formData.get('manuscriptType');
  const manuscriptTypeOverride =
    typeof manuscriptTypeField === 'string' && MANUSCRIPT_TYPES.has(manuscriptTypeField as ManuscriptType)
      ? (manuscriptTypeField as ManuscriptType)
      : undefined;

  try {
    // F2 OCR de ingesta: undefined when FileStudio is not configured — the
    // import then behaves exactly as before.
    const ocr = await buildImportOcrRunner(user.id);
    const seed = await extractImportedDocumentSeed(file, { ocr, manuscriptTypeOverride });

    return NextResponse.json({
      ok: true,
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
      // Declared processing mode when OCR ran (ProcessingModeBadge in the UI).
      ocrAppliedMode: seed.ocrAppliedMode,
      // U4: true when the source parser failed and the import degraded to an
      // empty shell document — the UI shows a non-blocking warning.
      parseWarning: Boolean(seed.parseFailed),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Import failed';
    console.error('[import-route] extraction failed', { userId: user.id, fileName: file.name, detail });
    return NextResponse.json({ error: 'IMPORT_FAILED', detail }, { status: 422 });
  }
}
