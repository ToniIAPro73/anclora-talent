import { notFound } from 'next/navigation';
import { CollaborationWorkspace } from '@/components/projects/collaboration-workspace/CollaborationWorkspace';
import { requireUserId } from '@/lib/auth/guards';
import { getDb, hasDatabase } from '@/lib/db';
import { projectRepository } from '@/lib/db/repositories';
import { resolveProjectAccess } from '@/lib/collaboration/repository';
import { getCollaborationViewForProject } from '@/lib/collaboration/view';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { readUiPreferences } from '@/lib/ui-preferences/preferences.server';

/**
 * Collaborator entry point (author, corrector or maquetador): the same review workspace as Step 6, without the
 * owner-only project editor. The role is resolved server-side from the database (R5); anyone who is not the
 * owner or an accepted collaborator gets a 404. Every write still re-checks the permission matrix in the actions.
 */
export default async function ProjectCollaboratePage({ params }: { params: Promise<{ projectId: string }> }) {
  const userId = await requireUserId();
  const { projectId } = await params;
  if (!hasDatabase()) notFound();

  const access = await resolveProjectAccess(getDb(), { projectId, userId });
  if (!access) notFound();

  const project = await projectRepository.getProjectById(access.ownerId, projectId);
  if (!project) notFound();

  const view = await getCollaborationViewForProject({ project, userId });
  if (!view) notFound();

  const { locale } = await readUiPreferences();
  const messages = resolveLocaleMessages(locale);

  return (
    <div className="ac-workspace-stage talent-workspace-stage" data-testid="collaborate-page">
      <p className="ac-section-heading__eyebrow">{messages.collaboration.wsCollabRouteTitle}</p>
      <h1 className="ac-section-heading__title mt-1 text-2xl">{project.title}</h1>
      <CollaborationWorkspace copy={messages.collaboration} projectId={project.id} view={view} locale={locale} />
    </div>
  );
}
