import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CoverForm } from '@/components/projects/CoverForm';
import { premiumPrimaryDarkButton, premiumSecondaryLightButton } from '@/components/ui/button-styles';
import { requireUserId } from '@/lib/auth/guards';
import { projectRepository } from '@/lib/db/repositories';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { readUiPreferences } from '@/lib/ui-preferences/preferences.server';

export default async function ProjectCoverPage({
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
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">{projectCopy.coverEyebrow}</p>
          <h2 className="mt-2 text-4xl font-black tracking-tight text-[var(--text-primary)]">{projectCopy.coverTitle}</h2>
        </div>
        <div className="flex gap-3">
          <Link href={`/projects/${project.id}/editor`} className={`${premiumSecondaryLightButton} px-5`}>
            {projectCopy.coverBackEditor}
          </Link>
          <Link href={`/projects/${project.id}/preview`} className={`${premiumPrimaryDarkButton} px-5`}>
            {projectCopy.coverBackPreview}
          </Link>
        </div>
      </div>
      <CoverForm copy={projectCopy} project={project} />
    </div>
  );
}
