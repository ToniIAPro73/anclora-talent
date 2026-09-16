'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useEditorPreferences } from '@/hooks/use-editor-preferences';
import { buildExportQueryString } from '@/lib/projects/export-config';
import type { ProjectRecord } from '@/lib/projects/types';
import type { AppMessages } from '@/lib/i18n/messages';

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function PdfExportButton({
  project,
  projectSlug,
  copy,
  className,
}: {
  project: ProjectRecord;
  projectSlug: string;
  copy: AppMessages['project'];
  className?: string;
}) {
  const { preferences } = useEditorPreferences();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (isExporting) return;

    try {
      setIsExporting(true);

      const query = buildExportQueryString(preferences, project);
      const suffix = query ? `&${query}` : '';
      const response = await fetch(`/api/projects/export/pdf?projectId=${project.id}${suffix}`);

      if (!response.ok) {
        let errorDetail = 'Error al exportar el PDF.';
        try {
          const body = await response.json();
          if (body.error) errorDetail = body.error;
        } catch {
          // ignore non-json
        }
        throw new Error(errorDetail);
      }

      const blob = await response.blob();
      const filename = `${projectSlug || copy.previewExportFilename}.pdf`;
      downloadBlob(filename, blob);
    } catch (error) {
      console.error('[pdf-export/client] failed', error);
      const message =
        error instanceof Error ? error.message : 'No se pudo exportar el PDF desde el navegador.';
      window.alert(message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      type="button"
      data-testid="pdf-export-button"
      onClick={handleExport}
      disabled={isExporting}
      className={className}
    >
      {isExporting ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Exportando PDF...
        </span>
      ) : (
        copy.previewExportPdfButton
      )}
    </button>
  );
}
