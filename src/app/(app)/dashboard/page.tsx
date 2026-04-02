import Link from 'next/link';
import { CreateProjectForm } from '@/components/projects/CreateProjectForm';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { premiumPrimaryDarkButton, premiumPrimaryMintButton } from '@/components/ui/button-styles';
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
        <div className="overflow-hidden rounded-[34px] border border-[var(--border-subtle)] bg-[var(--shell-main-surface)] p-8 text-[var(--text-primary)] shadow-[var(--shadow-strong)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">{dashboardCopy.eyebrow}</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-tight sm:text-5xl">
            {dashboardCopy.title}
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--text-secondary)]">
            {dashboardCopy.description}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/projects/new" className={`${premiumPrimaryMintButton} px-5`}>
              {dashboardCopy.createProject}
            </Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">{dashboardCopy.projectsEyebrow}</p>
              <p className="mt-3 text-2xl font-black text-[var(--text-primary)]">{projects.length}</p>
            </div>
            <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">{dashboardCopy.statusEyebrow}</p>
              <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
                {dataAvailable
                  ? hasProjects
                    ? dashboardCopy.statusActive
                    : dashboardCopy.statusEmpty
                  : dashboardCopy.statusFallback}
              </p>
            </div>
            <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">{dashboardCopy.contractEyebrow}</p>
              <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
                {dataAvailable ? dashboardCopy.contractReady : dashboardCopy.contractFallback}
              </p>
            </div>
          </div>
        </div>
        <CreateProjectForm copy={projectCopy} />
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">{dashboardCopy.sectionEyebrow}</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-[var(--text-primary)]">{dashboardCopy.sectionTitle}</h2>
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
              {dataAvailable
                ? dashboardCopy.emptyTitle
                : dashboardCopy.emptyFallbackTitle}
            </h3>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              {dataAvailable
                ? dashboardCopy.emptyDescription
                : dashboardCopy.emptyFallbackDescription}
            </p>
            <Link href="/projects/new" className={`mt-6 ${premiumPrimaryDarkButton} min-h-11 px-5`}>
              {dashboardCopy.emptyAction}
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
