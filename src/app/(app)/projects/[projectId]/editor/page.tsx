import { notFound } from 'next/navigation';
import { ProjectWorkspace } from '@/components/projects/ProjectWorkspace';
import { requireUserId } from '@/lib/auth/guards';
import { getDb, hasDatabase } from '@/lib/db';
import { projectRepository } from '@/lib/db/repositories';
import { brandProfileRepository } from '@/lib/brand/repository';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { getLaunchPackViewForProject } from '@/lib/manifest/view';
import { isGumroadFlagEnabled } from '@/lib/sales/config';
import { hasChannelToken } from '@/lib/sales/credentials';
import { getSnapshotHistoryViewForProject } from '@/lib/snapshots/view';
import { readUiPreferences } from '@/lib/ui-preferences/preferences.server';
import { projectToSemanticDocument } from '@/lib/compose/preview-adapter';
import { listCoAuthorChapters } from '@/lib/ai/co-author';
import { isAiCloudEnabled } from '@/lib/ai/provider';
import { aiOperationsLog } from '@/lib/ai/operations-log';
import { buildKdpDisclosure } from '@/lib/ai/kdp-disclosure';
import { getCollaborationViewForProject } from '@/lib/collaboration/view';

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
  // F4: publish-to-sales-channels section (same database gate as the pack).
  // The flag gates the Gumroad connect UI; a stored token implies intent and
  // keeps the section visible. Only the boolean reaches the client.
  const publishChannels = hasDatabase()
    ? {
        copy: messages.publishChannels,
        gumroadEnabled: isGumroadFlagEnabled(),
        gumroadConnected: await hasChannelToken(getDb(), { userId, channel: 'gumroad' }),
      }
    : undefined;
  // F2: version history section only with a database (snapshots are persisted);
  // the view carries metadata only — diffs load on demand via server action.
  const history = hasDatabase()
    ? { copy: messages.history, snapshots: await getSnapshotHistoryViewForProject(project.id) }
    : undefined;

  // F3 Capa 2: co-author entry (step 1). Chapters come from the document AST
  // (level-1 slices); the panel hides itself without a cloud provider.
  const { document } = projectToSemanticDocument(project);
  const coAuthor = {
    chapters: listCoAuthorChapters(document),
    cloudAvailable: isAiCloudEnabled(),
  };
  // F3 Capa 2 (governance): KDP AI-content disclosure shown in the export
  // step, derived from the provenance registry + accepted-operations log.
  const kdpDisclosure = buildKdpDisclosure({
    provenance: project.document.provenance,
    operations: await aiOperationsLog.list(userId, project.id),
    locale,
  });

  // F4: collaboration section (step 7). The view resolves the caller's role
  // server-side; without a database the panel stays hidden.
  const collaborationView = hasDatabase()
    ? await getCollaborationViewForProject({ project, userId })
    : null;
  const collaboration = collaborationView
    ? { copy: messages.collaboration, view: collaborationView }
    : undefined;

  return (
    <ProjectWorkspace
      project={project}
      copy={projectCopy}
      brandProfiles={brandProfiles}
      launchPack={launchPack}
      publishChannels={publishChannels}
      history={history}
      coAuthor={coAuthor}
      kdpDisclosure={kdpDisclosure}
      collaboration={collaboration}
      locale={locale}
    />
  );
}
