import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const root = process.cwd();
const css = readFileSync(resolve(root, 'src/app/globals.css'), 'utf8');
const landing = readFileSync(resolve(root, 'src/components/marketing/landing-header.tsx'), 'utf8');
const productStory = readFileSync(resolve(root, 'src/components/marketing/landing-product-story.tsx'), 'utf8');
const editor = readFileSync(resolve(root, 'src/components/projects/advanced-chapter-editor/ChapterEditorFullscreen.tsx'), 'utf8');
const chapters = readFileSync(resolve(root, 'src/components/projects/ChapterOrganizer.tsx'), 'utf8');

describe('global button system contract', () => {
  test('has one canonical CSS family and no dashboard-specific visual family', () => {
    expect(css).not.toMatch(/\.dashboard-button(?:[^\w-]|$)/);
    expect(css).toContain('.ac-button--compact');
    expect(css).toContain('.ac-button.ac-button--compact.ac-button--icon');
    expect(css).toContain('.ac-button--compact:active');
    expect(css).toContain('[aria-pressed="true"]');
  });

  test('contains all canonical variants with semantic interaction tokens', () => {
    expect(css).toContain('.ac-button--primary');
    expect(css).toContain('.ac-button--secondary');
    expect(css).toContain('.ac-button--outline');
    expect(css).toContain('.ac-button--ghost');
    expect(css).toContain('.ac-button--destructive');
    expect(css).toContain('.ac-button--active');
    expect(css).toContain('.ac-button:disabled');
  });

  test('Landing, Chapters, and Chapter Editor consume the same primitive', () => {
    expect(landing).toContain('ac-button ac-button--compact');
    expect(productStory).toContain('ac-button ac-button--compact');
    expect(chapters).toContain('ac-button');
    expect(editor).toContain('ac-button');
    expect(editor).toContain('ac-button--icon');
  });

  test('hardens contrast on navigation and filter selections without blue-on-blue', () => {
    expect(css).toContain('.talent-composition-workspace__section-item[data-active=\'true\']');
    expect(css).toContain('.talent-preflight-workspace__filter[data-active=\'true\']');
    expect(css).not.toContain('.talent-composition-workspace__section-item[data-active=\'true\'] {\n  background: var(--accent);\n  color: var(--accent-text);');
  });
});
