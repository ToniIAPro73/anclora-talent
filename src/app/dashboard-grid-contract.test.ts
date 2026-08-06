import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const globalsCss = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8');
const dashboardPage = readFileSync(
  resolve(process.cwd(), 'src/app/(app)/dashboard/page.tsx'),
  'utf8',
);
const createProjectForm = readFileSync(
  resolve(process.cwd(), 'src/components/projects/CreateProjectForm.tsx'),
  'utf8',
);
const appShell = readFileSync(
  resolve(process.cwd(), 'src/components/layout/AppShell.tsx'),
  'utf8',
);

describe('dashboard v3 contract', () => {
  test('P-SHELL-01: main shell keeps the fluid clamp without a sidebar grid track', () => {
    expect(globalsCss).toMatch(
      /\.talent-shell-grid\s*\{[^}]*max-width: clamp\(96rem, 92vw, 128rem\)/,
    );
    expect(appShell).not.toContain('gridTemplateColumns');
    expect(appShell).not.toContain('anclora-sidebar-collapsed');
  });

  test('dashboard renders creation as the primary full-screen surface', () => {
    expect(dashboardPage).toContain('talent-dashboard-create');
    expect(dashboardPage).toContain('variant="dashboard"');
    expect(dashboardPage).not.toContain('PaginatedProjectGrid');
    expect(dashboardPage).not.toContain('dashboard-new-project');
  });

  test('create form splits primary and optional sections for desktop dashboard layout', () => {
    expect(createProjectForm).toContain('talent-create-form__primary');
    expect(createProjectForm).toContain('talent-create-form__optional');
    expect(globalsCss).toMatch(/\.talent-create-form--dashboard\s*\{[^}]*grid-template-columns: minmax\(0, 1\.25fr\) minmax\(22rem, 0\.75fr\)/);
    expect(globalsCss).toMatch(/\.talent-create-form--dashboard \.ac-template-catalog__grid\s*\{[^}]*display: flex/);
    expect(globalsCss).not.toMatch(/\.talent-create-form--dashboard \.talent-create-form__optional\s*\{[^}]*overflow-y: auto/);
  });

  test('projects are exposed by modal-table query state, not dashboard cards', () => {
    expect(dashboardPage).toContain('ProjectsTableModal');
    expect(dashboardPage).toContain("params?.projects === '1'");
    expect(globalsCss).toContain('.talent-projects-table');
    expect(globalsCss).toContain('position: sticky');
  });
});
