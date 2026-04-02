import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

function maskUrl(url: string | undefined) {
  if (!url) return null;

  return url
    .replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@')
    .replace(/([?&](?:password|token)=)[^&]+/gi, '$1***');
}

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return NextResponse.json(
      {
        ok: false,
        hasDatabaseUrl: false,
      },
      { status: 500 },
    );
  }

  try {
    const sql = neon(databaseUrl);
    const result = await sql`
      select
        current_database() as database_name,
        current_schema() as schema_name,
        to_regclass('public.projects') as projects_table,
        to_regclass('public.project_documents') as project_documents_table,
        to_regclass('public.document_blocks') as document_blocks_table,
        to_regclass('public.cover_designs') as cover_designs_table
    `;

    return NextResponse.json({
      ok: true,
      hasDatabaseUrl: true,
      databaseUrl: maskUrl(databaseUrl),
      result: result[0] ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        ok: false,
        hasDatabaseUrl: true,
        databaseUrl: maskUrl(databaseUrl),
        error: message,
      },
      { status: 500 },
    );
  }
}
