import { ProjectCard } from '@/components/projects/ProjectCard';
import { premiumPrimaryMintButton } from '@/components/ui/button-styles';
import { NavigatingLink } from '@/components/ui/NavigatingLink';
import { requireUserId } from '@/lib/auth/guards';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { readUiPreferences } from '@/lib/ui-preferences/preferences.server';
import { loadDashboardData } from '../dashboard/dashboard-data';

export default async function ProjectsPage() {
  const userId = await requireUserId();
  const { locale } = await readUiPreferences();
  const dashboardCopy = resolveLocaleMessages(locale).dashboard;
  const projectCopy = resolveLocaleMessages(locale).project;
  const { projects, dataAvailable } = await loadDashboardData(userId);
  const hasProjects = projects.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">
            {dashboardCopy.sectionEyebrow}
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-[var(--text-primary)]">
            {dashboardCopy.sectionTitle}
          </h2>
        </div>
        <NavigatingLink href="/projects/new" pendingLabel={dashboardCopy.createProject} className={`${premiumPrimaryMintButton} px-5`}>
          {dashboardCopy.createProject}
        </NavigatingLink>
      </div>

      {hasProjects ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard key={project.id} copy={projectCopy} locale={locale} project={project} />
          ))}
        </div>
      ) : (
        <div className="rounded-[32px] border border-dashed border-[var(--border-subtle)] bg-[var(--page-surface-muted)] p-8 shadow-[var(--shadow-soft)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
            {dataAvailable ? dashboardCopy.emptyEyebrow : dashboardCopy.emptyFallbackEyebrow}
          </p>
          <h3 className="mt-3 text-2xl font-black tracking-tight text-[var(--text-primary)]">
            {dataAvailable ? dashboardCopy.emptyTitle : dashboardCopy.emptyFallbackTitle}
          </h3>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
            {dataAvailable ? dashboardCopy.emptyDescription : dashboardCopy.emptyFallbackDescription}
          </p>
          <NavigatingLink href="/projects/new" pendingLabel={dashboardCopy.emptyAction} className={`mt-6 inline-flex ${premiumPrimaryMintButton} px-5`}>
            {dashboardCopy.emptyAction}
          </NavigatingLink>
        </div>
      )}
    </div>
  );
}
