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
const premiumContract = readFileSync(
  resolve(process.cwd(), 'docs/standards/ANCLORA_PREMIUM_APP_CONTRACT.md'),
  'utf8',
);

describe('light theme dashboard contract', () => {
  test('defines real light-mode button variants instead of reusing dark ones', () => {
    expect(globalsCss).toContain('--button-primary-bg: #124a50;');
    expect(globalsCss).toContain('--button-primary-fg: #fffdf8;');
    expect(globalsCss).toContain('--button-secondary-bg: rgba(255, 253, 248, 0.92);');
  });

  test('keeps dashboard and form layout readable in light mode', () => {
    expect(dashboardPage).toContain('sm:grid-cols-2 xl:grid-cols-3');
    expect(createProjectForm).toContain('xl:flex-row');
    expect(createProjectForm).toContain('w-full xl:w-auto');
  });

  test('documents theme-specific premium variants in the app contract', () => {
    expect(premiumContract).toContain('variantes reales por tema');
    expect(premiumContract).toContain('Un botón válido en `dark` no puede reciclarse');
  });
});
