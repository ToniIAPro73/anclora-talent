import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const appShell = readFileSync(
  resolve(process.cwd(), 'src/components/layout/AppShell.tsx'),
  'utf8',
);

describe('app shell sidebar contract (U1/U2/U6)', () => {
  test('U1: nav is dashboard + projects only, no internal-jargon cards or badges', () => {
    expect(appShell).not.toContain('navNewProject');
    expect(appShell).not.toContain('STACK ACTIVO');
    expect(appShell).not.toContain('CONTRATO');
    expect(appShell).not.toContain('PREMIUM APP');
  });

  test('U6: the editor preferences panel no longer lives in the shell', () => {
    expect(appShell).not.toContain('EditorPreferencesSidebar');
    expect(
      existsSync(
        resolve(process.cwd(), 'src/components/projects/EditorPreferencesSidebar.tsx'),
      ),
    ).toBe(false);
  });

  test('U2: collapsed rail is 88px, expanded is 320px, driven by grid-template-columns', () => {
    expect(appShell).toContain("collapsed ? '88px 1fr' : '320px 1fr'");
    expect(appShell).toContain('talent-shell-grid');
  });

  test('U2: collapsed state renders the icon without the grid label span', () => {
    // The collapsed branch must not render the label wrapper whose
    // `talent-shell-sidebar-link__label` grid (42px + 1fr) blocks shrinking.
    const collapsedBranch = appShell.split('collapsed ? (')[1]?.split(') : (')[0] ?? '';
    expect(collapsedBranch).toContain('talent-shell-sidebar-link__icon');
    expect(collapsedBranch).not.toContain('talent-shell-sidebar-link__label');
  });

  test('U2: collapsed items are centered and carry a tooltip', () => {
    expect(appShell).toContain("collapsed ? 'justify-center px-2'");
    expect(appShell).toContain('title={collapsed ? label : undefined}');
  });

  test('U2: the aside clips instead of overlapping the main panel', () => {
    expect(appShell).toMatch(/aside[^>]*min-w-0 overflow-hidden/);
  });
});
