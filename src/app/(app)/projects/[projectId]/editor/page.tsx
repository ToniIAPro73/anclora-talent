import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EditorForm } from '@/components/projects/EditorForm';
import { premiumPrimaryDarkButton, premiumSecondaryLightButton } from '@/components/ui/button-styles';
import { requireUserId } from '@/lib/auth/guards';
import { projectRepository } from '@/lib/db/repositories';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { readUiPreferences } from '@/lib/ui-preferences/preferences.server';

export default async function ProjectEditorPage({
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
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">{projectCopy.editorEyebrow}</p>
          <h2 className="mt-2 text-4xl font-black tracking-tight text-[var(--text-primary)]">{project.title}</h2>
        </div>
        <div className="flex gap-3">
          <Link href={`/projects/${project.id}/preview`} className={`${premiumSecondaryLightButton} px-5`}>
            {projectCopy.editorOpenPreview}
          </Link>
          <Link href={`/projects/${project.id}/cover`} className={`${premiumPrimaryDarkButton} px-5`}>
            {projectCopy.editorOpenCover}
          </Link>
        </div>
      </div>
      <EditorForm copy={projectCopy} project={project} />
    </div>
  );
}
