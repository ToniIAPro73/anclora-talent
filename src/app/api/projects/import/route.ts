import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { extractImportedDocumentSeed } from '@/lib/projects/import';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const SUPPORTED_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'txt', 'md']);

function getExtension(fileName: string) {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? (parts.at(-1) ?? '') : '';
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
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

  try {
    const seed = await extractImportedDocumentSeed(file);

    return NextResponse.json({
      ok: true,
      title: seed.title,
      subtitle: seed.subtitle,
      chapterCount: seed.chapters?.length ?? 1,
      sourceFileName: seed.sourceFileName,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Import failed';
    console.error('[import-route] extraction failed', { userId, fileName: file.name, detail });
    return NextResponse.json({ error: 'IMPORT_FAILED', detail }, { status: 422 });
  }
}
