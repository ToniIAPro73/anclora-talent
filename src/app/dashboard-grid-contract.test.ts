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
});
