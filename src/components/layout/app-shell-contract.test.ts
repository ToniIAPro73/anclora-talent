import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const appShell = readFileSync(
  resolve(process.cwd(), 'src/components/layout/AppShell.tsx'),
  'utf8',
);
const globalsCss = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8');

describe('app shell v3 contract', () => {
  test('removes sidebar, collapse logic and persistence', () => {
    expect(appShell).not.toContain('aside');
    expect(appShell).not.toContain('collapsed');
    expect(appShell).not.toContain('localStorage');
    expect(appShell).not.toContain('anclora-sidebar-collapsed');
    expect(globalsCss).not.toContain('talent-shell-sidebar');
  });

  test('keeps the global masthead limited to the brand, dashboard and account controls', () => {
    expect(appShell).toContain('talent-shell-brand');
    expect(appShell).toContain('messages.navDashboard');
    expect(appShell).not.toContain('messages.navNewProject');
    expect(appShell).not.toContain('/dashboard?focus=new-project');
    expect(appShell).toContain('<GlobalLanguageControl />');
    expect(appShell).toContain('<GlobalThemeControl />');
    expect(appShell).toContain('<UserMenu user={user} />');
  });

  test('removes secondary and mobile navigation from the global masthead', () => {
    expect(appShell).not.toContain('talent-shell-nav');
    expect(appShell).not.toContain('mobileMenuOpen');
  });

  test('keeps user menu and removes editor preferences from shell', () => {
    expect(appShell).toContain('<UserMenu user={user} />');
    expect(appShell).not.toContain('EditorPreferencesSidebar');
    expect(
      existsSync(
        resolve(process.cwd(), 'src/components/projects/EditorPreferencesSidebar.tsx'),
      ),
    ).toBe(false);
  });

  test('theme and locale toggles remain top-level controls without a mobile burger', () => {
    expect(appShell).not.toContain('talent-shell-mobile-menu-button');
    expect(appShell).toContain('<GlobalLanguageControl />');
    expect(appShell).toContain('<GlobalThemeControl />');
    expect(globalsCss).toContain('.talent-shell-topbar-actions');
  });

  test('renders the shared legal footer after the application shell', () => {
    expect(appShell).toContain("import { LegalFooter } from '@/components/legal/LegalFooter';");
    expect(appShell).toContain('<LegalFooter mode="application" />');
    expect(globalsCss).not.toContain('.talent-app-shell-frame + footer');
  });
});
