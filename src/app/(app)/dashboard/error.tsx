'use client';

import { useUiPreferences } from '@/components/providers/UiPreferencesProvider';
import { resolveLocaleMessages } from '@/lib/i18n/messages';

export default function DashboardError({ reset }: { reset: () => void }) {
  const { locale } = useUiPreferences();
  const copy = resolveLocaleMessages(locale).dashboard;
  return <div className="dashboard-state" role="alert"><h1>{copy.workspaceError}</h1><p>{copy.workspaceErrorDescription}</p><button type="button" className="ac-button ac-button--compact" onClick={reset}>{copy.workspaceRetry}</button></div>;
}
