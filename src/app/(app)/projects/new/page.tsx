import { CreateProjectForm } from '@/components/projects/CreateProjectForm';
import { requireUserId } from '@/lib/auth/guards';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { structureProfileRepository } from '@/lib/structure-profile/repository';
import { readUiPreferences } from '@/lib/ui-preferences/preferences.server';

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await readUiPreferences();
  const projectCopy = resolveLocaleMessages(locale).project;
  // F3: saved structure profiles available to the governed scaffolding flow
  // (G1: decoupled from brand; G2: applying one still requires confirmation).
  const userId = await requireUserId();
  const structureProfiles = await structureProfileRepository.listStructureProfilesForUser(userId);
  // Fixed-PDF document mode, fail-closed: createProjectAction redirects
  // back here (no project created) when private storage of the original
  // PDF fails — surfaced as a banner, never silently swallowed.
  const resolvedSearchParams = await searchParams;
  const fixedPdfError = resolvedSearchParams?.fixedPdfError === '1';

  return (
    <div className="talent-new-project-page">
      <CreateProjectForm copy={projectCopy} structureProfiles={structureProfiles} fixedPdfError={fixedPdfError} />
    </div>
  );
}
