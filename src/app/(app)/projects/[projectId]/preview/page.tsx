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
    <div className="ac-workspace-stage talent-workspace-stage">
      <div className="ac-workspace-stage__header ac-workspace-stage__header--split">
        <div className="ac-section-heading">
          <p className="ac-section-heading__eyebrow">{projectCopy.previewEyebrow}</p>
          <h2 className="ac-section-heading__title mt-2 text-4xl">{projectCopy.previewTitle}</h2>
        </div>
        <div className="ac-workspace-stage__actions">
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
