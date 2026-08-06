import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const globalsCss = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8');

describe('modal overlay contract (MODAL_CONTRACT, U6)', () => {
  test('the .ac-modal overlay is a fixed, centered, full-viewport shell', () => {
    const overlay = globalsCss.match(/\.ac-modal\s*\{([^}]*)\}/);
    expect(overlay).not.toBeNull();
    const body = overlay![1];
    expect(body).toContain('position: fixed');
    expect(body).toContain('inset: 0');
    expect(body).toContain('place-items: center');
    expect(body).toContain('z-index: 80');
    // The design-system modal.css styles `.ac-modal` as a 720px panel;
    // the overlay must neutralize those panel properties.
    expect(body).toContain('width: auto');
    expect(body).toContain('box-shadow: none');
  });

  test('the backdrop dims and separates the panel from the page', () => {
    expect(globalsCss).toMatch(/\.ac-modal__backdrop\s*\{[^}]*position: fixed/);
    expect(globalsCss).toMatch(/\.ac-modal__backdrop\s*\{[^}]*backdrop-filter: blur/);
  });

  test('the panel stays inside the viewport and scrolls internally if needed', () => {
    expect(globalsCss).toMatch(/\.ac-modal__panel\s*\{[^}]*max-height: calc\(100vh - 2rem\)/);
    expect(globalsCss).toMatch(/\.ac-modal__panel\s*\{[^}]*overflow-y: auto/);
    expect(globalsCss).toMatch(/\.ac-modal__panel\s*\{\s*max-width: calc\(100vw - 2rem\)/);
  });

  test('the document-data modal never stacks with the workspace onboarding', () => {
    const workspace = readFileSync(
      resolve(process.cwd(), 'src/components/projects/ProjectWorkspace.tsx'),
      'utf8',
    );
    expect(workspace).toContain('{!initialOpenDocumentData && <WorkspaceOnboarding');
  });
});
