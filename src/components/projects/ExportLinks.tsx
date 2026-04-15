'use client';

import type { AppMessages } from '@/lib/i18n/messages';
import { useEditorPreferences } from '@/hooks/use-editor-preferences';
import {
  premiumPrimaryDarkButton,
  premiumSecondaryLightButton,
} from '@/components/ui/button-styles';
import { buildExportQueryString } from '@/lib/projects/export-config';
import type { ProjectRecord } from '@/lib/projects/types';
import { PdfExportButton } from './PdfExportButton';

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

export function ExportLinks({
  project,
  projectId,
  projectSlug,
  copy,
}: ExportLinksProps) {
  const { preferences } = useEditorPreferences();
  const query = buildExportQueryString(preferences);

  return (
    <>
      <a
        href={buildExportHref('/api/projects/export', projectId, query)}
        download={`${projectSlug || copy.previewExportFilename}.html`}
        className={`${premiumSecondaryLightButton} px-5`}
      >
        {copy.previewExportButton}
      </a>
      <PdfExportButton
        project={project}
        projectSlug={projectSlug}
        copy={copy}
        className={`${premiumSecondaryLightButton} px-5`}
      />
      <a
        href={buildExportHref('/api/projects/export/docx', projectId, query)}
        download={`${projectSlug || copy.previewExportFilename}.docx`}
        className={`${premiumSecondaryLightButton} px-5`}
      >
        {copy.previewExportDocxButton}
      </a>
    </>
  );
}
