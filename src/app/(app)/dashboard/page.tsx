import { CreateProjectForm } from '@/components/projects/CreateProjectForm';
import { DashboardFocusTitle } from '@/components/projects/DashboardFocusTitle';
import { FileStudioConnectionCard } from '@/components/filestudio/FileStudioConnectionCard';
import { ProjectsTableModal } from '@/components/projects/ProjectsTableModal';
import { requireUserId } from '@/lib/auth/guards';
import { hasDatabase } from '@/lib/db';
import { isFileStudioEnabled } from '@/lib/filestudio/config';
import { getConnection } from '@/lib/filestudio/pairing';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { readUiPreferences } from '@/lib/ui-preferences/preferences.server';
import { loadDashboardData } from './dashboard-data';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const userId = await requireUserId();
  const { locale } = await readUiPreferences();
  const dashboardCopy = resolveLocaleMessages(locale).dashboard;
  const projectCopy = resolveLocaleMessages(locale).project;
  const filestudioCopy = resolveLocaleMessages(locale).filestudio;
  const { projects, dataAvailable } = await loadDashboardData(userId);
  const params = await searchParams;
  const shouldOpenProjects = params?.projects === '1';
  const shouldFocusTitle = params?.focus === 'new-project';

  const filestudioConnection = isFileStudioEnabled() && hasDatabase()
    ? await getConnection(userId).catch(() => null)
    : null;

  return (
    <div className="talent-dashboard-v3">
      <DashboardFocusTitle enabled={shouldFocusTitle} />

      <section className="talent-dashboard-create" aria-label={dashboardCopy.createProject}>
        <CreateProjectForm copy={projectCopy} variant="dashboard" />
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

      {!dataAvailable ? (
        <p className="text-xs text-[var(--text-tertiary)]">{dashboardCopy.emptyFallbackDescription}</p>
      ) : null}

      {shouldOpenProjects ? (
        <ProjectsTableModal
          copy={dashboardCopy}
          projectCopy={projectCopy}
          locale={locale}
          projects={projects}
        />
      ) : null}
    </div>
  );
}
