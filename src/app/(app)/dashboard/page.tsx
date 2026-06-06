import { CreateProjectForm } from '@/components/projects/CreateProjectForm';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { premiumPrimaryDarkButton, premiumPrimaryMintButton } from '@/components/ui/button-styles';
import { NavigatingLink } from '@/components/ui/NavigatingLink';
import { requireUserId } from '@/lib/auth/guards';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { readUiPreferences } from '@/lib/ui-preferences/preferences.server';
import { loadDashboardData } from './dashboard-data';

export default async function DashboardPage() {
  const userId = await requireUserId();
  const { locale } = await readUiPreferences();
  const dashboardCopy = resolveLocaleMessages(locale).dashboard;
  const projectCopy = resolveLocaleMessages(locale).project;
  const { projects, dataAvailable } = await loadDashboardData(userId);
  const hasProjects = projects.length > 0;

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="ac-surface-panel ac-surface-panel--strong overflow-hidden p-8 text-[var(--text-primary)]">
          <p className="ac-surface-panel__eyebrow">{dashboardCopy.eyebrow}</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-tight sm:text-5xl">
            {dashboardCopy.title}
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--text-secondary)]">
            {dashboardCopy.description}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <NavigatingLink href="/projects/new" pendingLabel={dashboardCopy.createProject} className={`${premiumPrimaryMintButton} px-5`}>
              {dashboardCopy.createProject}
            </NavigatingLink>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="ac-metric-card">
              <p className="ac-metric-card__eyebrow">{dashboardCopy.projectsEyebrow}</p>
              <p className="ac-metric-card__value mt-3 text-[var(--text-primary)]">{projects.length}</p>
            </div>
            <div className="ac-metric-card">
              <p className="ac-metric-card__eyebrow">{dashboardCopy.statusEyebrow}</p>
              <p className="ac-metric-card__summary mt-3 text-sm font-semibold text-[var(--text-primary)]">
                {dataAvailable
                  ? hasProjects
                    ? dashboardCopy.statusActive
                    : dashboardCopy.statusEmpty
                  : dashboardCopy.statusFallback}
              </p>
            </div>
            <div className="ac-metric-card">
              <p className="ac-metric-card__eyebrow">{dashboardCopy.contractEyebrow}</p>
              <p className="ac-metric-card__summary mt-3 text-sm font-semibold text-[var(--text-primary)]">
                {dataAvailable ? dashboardCopy.contractReady : dashboardCopy.contractFallback}
              </p>
            </div>
          </div>
        </div>
        <CreateProjectForm copy={projectCopy} />
      </section>

      <section className="space-y-4">
        <div>
          <p className="ac-surface-panel__eyebrow">{dashboardCopy.sectionEyebrow}</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-[var(--text-primary)]">{dashboardCopy.sectionTitle}</h2>
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
              {dataAvailable
                ? dashboardCopy.emptyTitle
                : dashboardCopy.emptyFallbackTitle}
            </h3>
            <p className="ac-empty-state__summary mt-0 max-w-2xl text-sm leading-7">
              {dataAvailable
                ? dashboardCopy.emptyDescription
                : dashboardCopy.emptyFallbackDescription}
            </p>
            <div className="ac-empty-state__actions">
              <NavigatingLink href="/projects/new" pendingLabel={dashboardCopy.emptyAction} className={`${premiumPrimaryDarkButton} min-h-11 px-5`}>
                {dashboardCopy.emptyAction}
              </NavigatingLink>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
