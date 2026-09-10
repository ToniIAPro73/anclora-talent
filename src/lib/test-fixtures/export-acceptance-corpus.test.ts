import { describe, expect, test } from 'vitest';
import { createExportAcceptanceProject } from './export-acceptance-corpus';

describe('export acceptance corpus', () => {
  test('provides a populated non-destructive multilingual corpus', () => {
    const project = createExportAcceptanceProject();
    const content = project.document.chapters.flatMap((chapter) => chapter.blocks).map((block) => block.content).join(' ');

    expect(project.document.chapters).toHaveLength(2);
    expect(content).toContain('acción');
    expect(content).toContain('English text');
    expect(content).toContain('<strong>');
    expect(content).toContain('<a href=');
    expect(content).toContain('<img');
    expect(project.cover.renderedImageUrl).toBeTruthy();
    expect(project.backCover.body).toContain('Contraportada');
  });

  test('provides a genuinely empty project variant', () => {
    const project = createExportAcceptanceProject('empty');

    expect(project.document.chapters).toEqual([]);
    expect(project.userId).toBe('export-acceptance-user');
  });
});
