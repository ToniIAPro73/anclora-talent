import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

function maskUrl(url: string | undefined) {
  if (!url) return null;

  return url
    .replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@')
    .replace(/([?&](?:password|token)=)[^&]+/gi, '$1***');
}

/**
 * Expected schema derived from src/lib/db/schema.ts.
 * Each entry lists the table name and every column that must exist.
 */
const EXPECTED_SCHEMA: Record<string, string[]> = {
  app_users: ['id', 'clerk_user_id', 'email', 'created_at', 'updated_at'],
  projects: ['id', 'user_id', 'workspace_id', 'slug', 'title', 'status', 'created_at', 'updated_at'],
  project_documents: ['id', 'project_id', 'title', 'subtitle', 'language', 'source_metadata', 'created_at', 'updated_at'],
  document_blocks: ['id', 'project_document_id', 'chapter_id', 'chapter_order', 'chapter_title', 'block_order', 'block_type', 'content', 'created_at'],
  project_assets: ['id', 'project_id', 'workspace_id', 'kind', 'blob_url', 'alt', 'usage', 'created_at'],
  cover_designs: ['id', 'project_id', 'title', 'subtitle', 'palette', 'background_image_url', 'thumbnail_url', 'layout', 'font_family', 'accent_color', 'rendered_image_url', 'updated_at'],
  back_cover_designs: ['id', 'project_id', 'title', 'body', 'author_bio', 'accent_color', 'background_image_url', 'rendered_image_url', 'updated_at'],
  cover_layers: ['id', 'cover_design_id', 'layer_order', 'kind', 'payload'],
  design_templates: ['id', 'template_key', 'name', 'description', 'preview_url', 'defaults'],
  export_jobs: ['id', 'project_id', 'format', 'status', 'artifact_url', 'requested_at', 'completed_at'],
  activity_log: ['id', 'user_id', 'project_id', 'event_type', 'payload', 'created_at'],
};

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return NextResponse.json({ ok: false, hasDatabaseUrl: false }, { status: 500 });
  }

  try {
    const sql = neon(databaseUrl);

    // Get all existing tables in public schema
    const tableRows = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    const existingTables = new Set(tableRows.map((r: Record<string, string>) => r.table_name as string));

    // Get all columns for those tables
    const columnRows = await sql`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `;
    const existingColumns: Record<string, Set<string>> = {};
    for (const row of columnRows as Array<Record<string, string>>) {
      if (!existingColumns[row.table_name]) existingColumns[row.table_name] = new Set();
      existingColumns[row.table_name].add(row.column_name);
    }

    // Compare against expected schema
    const tableReport: Record<string, {
      exists: boolean;
      missingColumns: string[];
      presentColumns: string[];
    }> = {};

    for (const [table, expectedCols] of Object.entries(EXPECTED_SCHEMA)) {
      const exists = existingTables.has(table);
      const actualCols = existingColumns[table] ?? new Set();
      const missingColumns = expectedCols.filter((c) => !actualCols.has(c));
      const presentColumns = expectedCols.filter((c) => actualCols.has(c));
      tableReport[table] = { exists, missingColumns, presentColumns };
    }

    const missingTables = Object.entries(tableReport)
      .filter(([, v]) => !v.exists)
      .map(([t]) => t);

    const tablesWithMissingColumns = Object.entries(tableReport)
      .filter(([, v]) => v.exists && v.missingColumns.length > 0)
      .map(([t, v]) => ({ table: t, missingColumns: v.missingColumns }));

    const schemaOk = missingTables.length === 0 && tablesWithMissingColumns.length === 0;

    return NextResponse.json({
      ok: schemaOk,
      hasDatabaseUrl: true,
      databaseUrl: maskUrl(databaseUrl),
      summary: schemaOk
        ? 'Schema is up to date — all tables and columns present.'
        : `Schema needs migration: ${missingTables.length} missing table(s), ${tablesWithMissingColumns.length} table(s) with missing columns.`,
      missingTables,
      tablesWithMissingColumns,
      tableReport,
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
