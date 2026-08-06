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

  test('renders masthead nav with dashboard, new project and projects modal links', () => {
    expect(appShell).toContain('talent-shell-brand');
    expect(appShell).toContain('messages.navDashboard');
    expect(appShell).toContain('messages.navNewProject');
    expect(appShell).toContain('messages.navProjects');
    expect(appShell).toContain('/dashboard?focus=new-project');
    expect(appShell).toContain('/dashboard?projects=1');
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

  test('mobile burger exists while theme and locale toggles remain top-level controls', () => {
    expect(appShell).toContain('talent-shell-mobile-menu-button');
    expect(appShell).toContain('<LocaleToggle />');
    expect(appShell).toContain('<ThemeToggle />');
    expect(globalsCss).toMatch(/@media \(max-width: 480px\)[\s\S]*\.talent-shell-nav\s*\{[\s\S]*display: none/);
  });
});
