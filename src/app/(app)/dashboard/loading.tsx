import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { readUiPreferences } from '@/lib/ui-preferences/preferences.server';

export default async function DashboardLoading() {
  const { locale } = await readUiPreferences();
  const copy = resolveLocaleMessages(locale).dashboard;
  return <div className="dashboard-layout" aria-busy="true" aria-label={copy.workspaceLoading}><section className="dashboard-projects"><header className="dashboard-toolbar"><h1>{copy.projectsModalTitle}</h1></header><div className="dashboard-project-list">{[0, 1, 2, 3].map((index) => <div key={index} className="dashboard-skeleton" aria-hidden="true"><span /><div /><div /></div>)}</div></section><aside className="dashboard-activity"><h2>{copy.workspaceActivity}</h2></aside></div>;
}
