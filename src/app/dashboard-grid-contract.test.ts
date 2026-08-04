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
  test('splits hero and create form into balanced columns', () => {
    expect(dashboardPage).toContain('xl:grid-cols-2');
    expect(dashboardPage).not.toContain('1.2fr_0.8fr');
  });

  test('keeps the hero CTA from stretching into a tall card', () => {
    expect(dashboardPage).toContain('flex flex-wrap items-center gap-3');
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
