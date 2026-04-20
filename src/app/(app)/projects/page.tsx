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
          <p className="ac-surface-panel__eyebrow">
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
        <div className="ac-empty-state">
          <p className="ac-surface-panel__eyebrow">
            {dataAvailable ? dashboardCopy.emptyEyebrow : dashboardCopy.emptyFallbackEyebrow}
          </p>
          <h3 className="ac-empty-state__title mt-0">
            {dataAvailable ? dashboardCopy.emptyTitle : dashboardCopy.emptyFallbackTitle}
          </h3>
          <p className="ac-empty-state__summary mt-0 max-w-2xl text-sm leading-7">
            {dataAvailable ? dashboardCopy.emptyDescription : dashboardCopy.emptyFallbackDescription}
          </p>
          <div className="ac-empty-state__actions">
            <NavigatingLink href="/projects/new" pendingLabel={dashboardCopy.emptyAction} className={`${premiumPrimaryMintButton} px-5`}>
              {dashboardCopy.emptyAction}
            </NavigatingLink>
          </div>
        </div>
      )}
    </div>
  );
}
