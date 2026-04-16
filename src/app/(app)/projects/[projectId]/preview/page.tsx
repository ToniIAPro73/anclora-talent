import { notFound } from 'next/navigation';
import { PreviewCanvas } from '@/components/projects/PreviewCanvas';
import { ExportLinks } from '@/components/projects/ExportLinks';
import { premiumPrimaryDarkButton, premiumSecondaryLightButton } from '@/components/ui/button-styles';
import { NavigatingLink } from '@/components/ui/NavigatingLink';
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
          <NavigatingLink href={`/projects/${project.id}/editor`} pendingLabel={projectCopy.previewBackToEditor} className={`${premiumSecondaryLightButton} px-5`}>
            {projectCopy.previewBackToEditor}
          </NavigatingLink>
          <ExportLinks
            project={project}
            projectId={project.id}
            projectSlug={project.slug || ''}
            copy={projectCopy}
          />
          <NavigatingLink href={`/projects/${project.id}/cover`} pendingLabel={projectCopy.previewOpenCover} className={`${premiumPrimaryDarkButton} px-5`}>
            {projectCopy.previewOpenCover}
          </NavigatingLink>
        </div>
      </div>
      <PreviewCanvas copy={projectCopy} project={project} />
    </div>
  );
}
