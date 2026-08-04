import { CreateProjectForm } from '@/components/projects/CreateProjectForm';
import { requireUserId } from '@/lib/auth/guards';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { structureProfileRepository } from '@/lib/structure-profile/repository';
import { readUiPreferences } from '@/lib/ui-preferences/preferences.server';

export default async function NewProjectPage() {
  const { locale } = await readUiPreferences();
  const projectCopy = resolveLocaleMessages(locale).project;
  // F3: saved structure profiles available to the governed scaffolding flow
  // (G1: decoupled from brand; G2: applying one still requires confirmation).
  const userId = await requireUserId();
  const structureProfiles = await structureProfileRepository.listStructureProfilesForUser(userId);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">{projectCopy.newEyebrow}</p>
        <h2 className="mt-2 text-4xl font-black tracking-tight text-[var(--text-primary)]">{projectCopy.newTitle}</h2>
        <p className="mt-3 max-w-3xl text-base leading-8 text-[var(--text-secondary)]">
          {projectCopy.newDescription}
        </p>
      </div>
      <div className="max-w-3xl">
        <CreateProjectForm copy={projectCopy} structureProfiles={structureProfiles} />
      </div>
    </div>
  );
}
