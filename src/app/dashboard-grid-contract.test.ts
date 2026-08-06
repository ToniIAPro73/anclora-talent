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
const paginatedGrid = readFileSync(
  resolve(process.cwd(), 'src/components/projects/PaginatedProjectGrid.tsx'),
  'utf8',
);

describe('dashboard grid balance contract', () => {
  test('lays projects and create form out in a two-column grid', () => {
    expect(dashboardPage).toContain('xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]');
    expect(dashboardPage).not.toContain('gap-6 xl:grid-cols-2');
  });

  test('keeps a compact hero without metric cards, description or hero CTA', () => {
    expect(dashboardPage).not.toContain('ac-metric-card');
    expect(dashboardPage).not.toContain('dashboardCopy.description');
    expect(dashboardPage).toContain('data-testid="dashboard-active-count"');
  });

  test('gives the shell enough width to avoid a narrow central band', () => {
    expect(globalsCss).toMatch(/\.talent-shell-grid\s*\{[^}]*max-width: 96rem/);
  });

  test('auto-fits template cards inside the create form instead of fixed columns', () => {
    expect(createProjectForm).toContain('talent-create-form');
    expect(globalsCss).toMatch(
      /\.talent-create-form \.ac-template-catalog__grid\s*\{[^}]*repeat\(auto-fit, minmax\(190px, 1fr\)\)/,
    );
    expect(globalsCss).toMatch(/\.talent-create-form \.ac-template-card__summary\s*\{[^}]*-webkit-line-clamp: 3/);
  });

  test('P-U3-01: projects render through the paginated grid with a load-more control', () => {
    expect(dashboardPage).toContain('PaginatedProjectGrid');
    expect(paginatedGrid).toContain('data-testid="dashboard-load-more"');
    expect(paginatedGrid).toContain('slice(0, visibleCount)');
  });

  test('P-E2-03: the projects section header exposes a visible new-project action', () => {
    expect(dashboardPage).toContain('data-testid="dashboard-new-project"');
    expect(dashboardPage).toContain('dashboardCopy.sectionNewProject');
  });

  test('P-U3-03: the create form column is self-start and sticky so long lists leave no gap', () => {
    expect(dashboardPage).toContain('self-start xl:sticky xl:top-8');
  });

  test('P-E6-01: hero typography scales down on small viewports', () => {
    expect(dashboardPage).toContain('text-3xl font-black tracking-tight sm:text-5xl');
    expect(dashboardPage).toContain('p-5 text-[var(--text-primary)] sm:p-8');
  });
});
