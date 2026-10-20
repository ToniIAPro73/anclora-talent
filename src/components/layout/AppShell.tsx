'use client';

import { usePathname } from 'next/navigation';
import { LayoutDashboard } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { useUiPreferences } from '@/components/providers/UiPreferencesProvider';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import type { SessionUser } from '@/lib/auth/session';
import { NavigatingLink } from '@/components/ui/NavigatingLink';
import { GlobalLanguageControl } from './GlobalLanguageControl';
import { GlobalThemeControl } from './GlobalThemeControl';
import { UserMenu } from './UserMenu';
import { LegalFooter } from '@/components/legal/LegalFooter';

export function AppShell({
  user,
  children,
}: {
  user: Pick<SessionUser, 'fullName' | 'email'>;
  children: React.ReactNode;
}) {
  const { locale } = useUiPreferences();
  const messages = resolveLocaleMessages(locale).shell;
  const pathname = usePathname();
  const compactDashboard = pathname === '/dashboard';
  const compactNewProject = pathname === '/projects/new';
  const compactEditor = /^\/projects\/[^/]+\/editor$/.test(pathname ?? '');
  const compactCoverStudio = /^\/projects\/[^/]+\/(cover|back-cover)$/.test(pathname ?? '');
  const compactWorkspace = compactEditor || compactCoverStudio;

  return (
    <>
      <div className={`talent-app-shell-frame min-h-screen bg-[var(--app-gradient)] text-[var(--text-primary)]${compactDashboard ? ' talent-dashboard-shell' : ''}${compactNewProject ? ' talent-new-project-shell' : ''}${compactWorkspace ? ' talent-editor-shell' : ''}`}>
      <div className="talent-shell-grid">
        <div className="talent-shell-main min-w-0">
          <header className="talent-shell-topbar" style={{ display: 'flex', minHeight: 56, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'nowrap', gap: 8, padding: '5px 8px' }}>
            <div className="talent-shell-brand" style={{ flex: '0 1 auto', minWidth: 0, gap: 6 }}>
              <BrandLogo size={32} priority />
              <div className="talent-shell-brand__name" style={{ minWidth: 0, fontSize: 14 }}>{messages.brand}</div>
            </div>

            <div className="talent-shell-topbar-actions" style={{ display: 'flex', minWidth: 0, alignItems: 'center', justifyContent: 'flex-end', gap: 4, flexWrap: 'nowrap', marginLeft: 'auto' }}>
              <NavigatingLink href="/dashboard" pendingLabel={messages.navDashboard} aria-label={messages.navDashboard} title={messages.navDashboard} aria-current={compactDashboard ? 'page' : undefined} className="ac-button ac-button--compact" data-testid="workspace-dashboard-button" style={{ minHeight: 32, padding: '0 7px' }}><LayoutDashboard className="h-4 w-4 sm:hidden" aria-hidden="true" /><span className="hidden sm:inline">{messages.navDashboard}</span></NavigatingLink>
              <div className="global-header-controls" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <GlobalLanguageControl />
                <GlobalThemeControl />
              </div>
              <UserMenu user={user} />
            </div>
          </header>

          <main id="main-content" className="talent-shell-content">{children}</main>
        </div>
        </div>
      </div>
      <LegalFooter mode="application" />
    </>
  );
}
