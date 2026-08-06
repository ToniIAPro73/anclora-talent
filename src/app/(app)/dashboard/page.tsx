import { CreateProjectForm } from '@/components/projects/CreateProjectForm';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { FileStudioConnectionCard } from '@/components/filestudio/FileStudioConnectionCard';
import { premiumPrimaryDarkButton } from '@/components/ui/button-styles';
import { NavigatingLink } from '@/components/ui/NavigatingLink';
import { requireUserId } from '@/lib/auth/guards';
import { hasDatabase } from '@/lib/db';
import { isFileStudioEnabled } from '@/lib/filestudio/config';
import { getConnection } from '@/lib/filestudio/pairing';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { readUiPreferences } from '@/lib/ui-preferences/preferences.server';
import { loadDashboardData } from './dashboard-data';

export default async function DashboardPage() {
  const userId = await requireUserId();
  const { locale } = await readUiPreferences();
  const dashboardCopy = resolveLocaleMessages(locale).dashboard;
  const projectCopy = resolveLocaleMessages(locale).project;
  const filestudioCopy = resolveLocaleMessages(locale).filestudio;
  const { projects, dataAvailable } = await loadDashboardData(userId);
  const hasProjects = projects.length > 0;

  // Feature flag (config.ts): without FILESTUDIO_API_URL the whole
  // integration surface stays hidden and nothing else changes.
  const filestudioConnection = isFileStudioEnabled() && hasDatabase()
    ? await getConnection(userId).catch(() => null)
    : null;

  return (
    <div className="space-y-8">
      <section className="ac-surface-panel ac-surface-panel--strong overflow-hidden p-8 text-[var(--text-primary)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="ac-surface-panel__eyebrow">{dashboardCopy.eyebrow}</p>
            <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-tight sm:text-5xl">
              {dashboardCopy.title}
            </h2>
          </div>
          {hasProjects ? (
            <span
              data-testid="dashboard-active-count"
              className="inline-flex items-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]"
            >
              {(projects.length === 1
                ? dashboardCopy.activeProjectsOne
                : dashboardCopy.activeProjectsMany
              ).replace('{count}', String(projects.length))}
            </span>
          ) : null}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className="space-y-4">
          <div>
            <p className="ac-surface-panel__eyebrow">{dashboardCopy.sectionEyebrow}</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-[var(--text-primary)]">{dashboardCopy.sectionTitle}</h2>
          </div>
          {hasProjects ? (
            <div className="grid gap-4 2xl:grid-cols-2">
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
        </div>
        <CreateProjectForm copy={projectCopy} />
      </section>

      {isFileStudioEnabled() && (
        <section aria-label={filestudioCopy.settingsTitle}>
          <FileStudioConnectionCard
            copy={filestudioCopy}
            initialConnection={
              filestudioConnection
                ? {
                    status: filestudioConnection.status,
                    deviceId: filestudioConnection.deviceId,
                    preferredMode: filestudioConnection.preferredMode,
                  }
                : null
            }
          />
        </section>
      )}
    </div>
  );
}
