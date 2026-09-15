'use client';

import type { AppMessages } from '@/lib/i18n/messages';
import { useEditorPreferences } from '@/hooks/use-editor-preferences';
import { buildExportQueryString } from '@/lib/projects/export-config';
import type { ProjectRecord } from '@/lib/projects/types';
import { getProjectCapabilities } from '@/lib/projects/capabilities';
import { PdfExportButton } from './PdfExportButton';
import { PreviewDeviceSelector } from './PreviewDeviceSelector';

interface ExportLinksProps {
  project: ProjectRecord;
  projectId: string;
  projectSlug: string;
  copy: AppMessages['project'];
}

function buildExportHref(pathname: string, projectId: string, query: string) {
  const suffix = query ? `&${query}` : '';
  return `${pathname}?projectId=${projectId}${suffix}`;
}

/**
 * Format list for the standalone `/preview` route. Gated by
 * `getProjectCapabilities` (Fase 10) — must stay in sync with the export
 * step buttons in `ProjectWorkspace.tsx`, which apply the same capabilities
 * to the same underlying API routes.
 */
export function ExportLinks({
  project,
  projectId,
  projectSlug,
  copy,
}: ExportLinksProps) {
  const { preferences } = useEditorPreferences();
  // U6: the project's effective composition (project > user defaults) feeds
  // the export query when present.
  const query = buildExportQueryString(preferences, project);
  const capabilities = getProjectCapabilities(project);

  return (
    <div className="ac-export-suite__actions">
      <PreviewDeviceSelector copy={copy} />
      <a
        href={buildExportHref('/api/projects/export', projectId, query)}
        download={`${projectSlug || copy.previewExportFilename}.html`}
        aria-disabled={!capabilities.canExportHtml}
        title={!capabilities.canExportHtml ? copy.fixedPdfHtmlUnavailable : undefined}
        className={`ac-button ac-button--secondary${capabilities.canExportHtml ? '' : ' pointer-events-none opacity-50'}`}
      >
        {copy.previewExportButton}
      </a>
      {capabilities.canCompose ? (
        <PdfExportButton
          project={project}
          projectSlug={projectSlug}
          copy={copy}
          className="ac-button ac-button--primary"
        />
      ) : (
        <a
          href={`/api/projects/export/pdf?projectId=${projectId}`}
          className="ac-button ac-button--primary"
        >
          {copy.fixedPdfExportLabel}
        </a>
      )}
      <a
        href={buildExportHref('/api/projects/export/docx', projectId, query)}
        download={`${projectSlug || copy.previewExportFilename}.docx`}
        aria-disabled={!capabilities.canExportDocx}
        title={!capabilities.canExportDocx ? copy.fixedPdfDocxUnavailable : undefined}
        className={`ac-button ac-button--secondary${capabilities.canExportDocx ? '' : ' pointer-events-none opacity-50'}`}
      >
        {copy.previewExportDocxButton}
      </a>
      <a
        href={buildExportHref('/api/projects/export/epub', projectId, query)}
        download={`${projectSlug || copy.previewExportFilename}.epub`}
        aria-disabled={!capabilities.canExportEpub}
        title={!capabilities.canExportEpub ? copy.fixedPdfEpubUnavailable : undefined}
        className={`ac-button ac-button--secondary${capabilities.canExportEpub ? '' : ' pointer-events-none opacity-50'}`}
      >
        {copy.previewExportEpubButton}
      </a>
      <a
        href={buildExportHref('/api/projects/export/markdown', projectId, query)}
        download={`${projectSlug || copy.previewExportFilename}.md`}
        aria-disabled={!capabilities.canExportMarkdown}
        title={!capabilities.canExportMarkdown ? copy.fixedPdfMarkdownUnavailable : undefined}
        className={`ac-button ac-button--secondary${capabilities.canExportMarkdown ? '' : ' pointer-events-none opacity-50'}`}
      >
        {copy.previewExportMarkdownButton}
      </a>
    </div>
  );
}
