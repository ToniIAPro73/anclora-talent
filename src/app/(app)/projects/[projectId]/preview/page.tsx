import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PreviewCanvas } from '@/components/projects/PreviewCanvas';
import { premiumPrimaryDarkButton, premiumSecondaryLightButton } from '@/components/ui/button-styles';
import { requireUserId } from '@/lib/auth/guards';
import { projectRepository } from '@/lib/db/repositories';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { readUiPreferences } from '@/lib/ui-preferences/preferences.server';

export default async function ProjectPreviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const userId = await requireUserId();
  const { projectId } = await params;
  const { locale } = await readUiPreferences();
  const projectCopy = resolveLocaleMessages(locale).project;
  const project = await projectRepository.getProjectById(userId, projectId);

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">{projectCopy.previewEyebrow}</p>
          <h2 className="mt-2 text-4xl font-black tracking-tight text-[var(--text-primary)]">{projectCopy.previewTitle}</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={`/projects/${project.id}/editor`} className={`${premiumSecondaryLightButton} px-5`}>
            {projectCopy.previewBackToEditor}
          </Link>
          <a
            href={`/api/projects/export?projectId=${project.id}`}
            download={`${project.slug || projectCopy.previewExportFilename}.html`}
            className={`${premiumSecondaryLightButton} px-5`}
          >
            {projectCopy.previewExportButton}
          </a>
          <a
            href={`/api/projects/export/pdf?projectId=${project.id}`}
            download={`${project.slug || projectCopy.previewExportFilename}.pdf`}
            className={`${premiumSecondaryLightButton} px-5`}
          >
            {projectCopy.previewExportPdfButton}
          </a>
          <a
            href={`/api/projects/export/docx?projectId=${project.id}`}
            download={`${project.slug || projectCopy.previewExportFilename}.docx`}
            className={`${premiumSecondaryLightButton} px-5`}
          >
            {projectCopy.previewExportDocxButton}
          </a>
          <Link href={`/projects/${project.id}/cover`} className={`${premiumPrimaryDarkButton} px-5`}>
            {projectCopy.previewOpenCover}
          </Link>
        </div>
      </div>
      <PreviewCanvas copy={projectCopy} project={project} />
    </div>
  );
}
