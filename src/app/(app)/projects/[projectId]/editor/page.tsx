import { notFound } from 'next/navigation';
import { ProjectWorkspace } from '@/components/projects/ProjectWorkspace';
import { requireUserId } from '@/lib/auth/guards';
import { hasDatabase } from '@/lib/db';
import { projectRepository } from '@/lib/db/repositories';
import { brandProfileRepository } from '@/lib/brand/repository';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { getLaunchPackViewForProject } from '@/lib/manifest/view';
import { getSnapshotHistoryViewForProject } from '@/lib/snapshots/view';
import { readUiPreferences } from '@/lib/ui-preferences/preferences.server';

export default async function ProjectEditorPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const userId = await requireUserId();
  const { projectId } = await params;
  const { locale } = await readUiPreferences();
  const messages = resolveLocaleMessages(locale);
  const projectCopy = messages.project;
  const project = await projectRepository.getProjectById(userId, projectId);

  if (!project) {
    notFound();
  }

  const brandProfiles = await brandProfileRepository.listBrandProfilesForUser(userId);
  // F2: launch pack section only with a database (manifest is persisted);
  // the view carries the latest version with stale flags computed read-time.
  const launchPack = hasDatabase()
    ? { copy: messages.launchPack, view: await getLaunchPackViewForProject(project) }
    : undefined;
  // F2: version history section only with a database (snapshots are persisted);
  // the view carries metadata only — diffs load on demand via server action.
  const history = hasDatabase()
    ? { copy: messages.history, snapshots: await getSnapshotHistoryViewForProject(project.id) }
    : undefined;

  return (
    <ProjectWorkspace
      project={project}
      copy={projectCopy}
      brandProfiles={brandProfiles}
      launchPack={launchPack}
      history={history}
      locale={locale}
    />
  );
}
