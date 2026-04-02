import { CreateProjectForm } from '@/components/projects/CreateProjectForm';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { readUiPreferences } from '@/lib/ui-preferences/preferences.server';

export default async function NewProjectPage() {
  const { locale } = await readUiPreferences();
  const projectCopy = resolveLocaleMessages(locale).project;

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
        <CreateProjectForm copy={projectCopy} />
      </div>
    </div>
  );
}
