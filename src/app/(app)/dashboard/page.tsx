import { redirect } from 'next/navigation';
import { DashboardWorkspace } from '@/components/projects/DashboardWorkspace';
import { FileStudioConnectionCard } from '@/components/filestudio/FileStudioConnectionCard';
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
  if (params?.focus === 'new-project') redirect('/projects/new');

  const filestudioConnection = isFileStudioEnabled() && hasDatabase()
    ? await getConnection(userId).catch(() => null)
    : null;

  return (
    <div className="talent-dashboard-workspace">
      <DashboardWorkspace projects={projects} dataAvailable={dataAvailable} locale={locale} copy={dashboardCopy} projectCopy={projectCopy} />

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
