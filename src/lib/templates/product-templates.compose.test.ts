import { describe, expect, it } from 'vitest';
import { composeProjectPreview } from '@/lib/compose/preview-adapter';
import { DEVICE_PAGINATION_CONFIGS } from '@/lib/preview/device-configs';
import { createProjectRecord } from '@/lib/projects/factories';
import { PRODUCT_TEMPLATES } from './product-templates';

const config = DEVICE_PAGINATION_CONFIGS.laptop;

describe('template seeds — time to first draft (F2)', () => {
  it('every template seed composes immediately and generates its TOC', () => {
    for (const template of PRODUCT_TEMPLATES) {
      const project = createProjectRecord('user-1', { title: template.id, templateId: template.id });

      const { result } = composeProjectPreview(project, config);
      const tocTexts = result.toc.map((entry) => entry.text);

      expect(result.pages.length).toBeGreaterThan(0);
      // Every chapter's guide heading lands in the generated TOC.
      for (const chapter of template.chapters) {
        expect(tocTexts).toContain(chapter.title);
      }
    }
  });

  it('course template TOC includes module lessons (subheadings)', () => {
    const project = createProjectRecord('user-1', { title: 'Curso', templateId: 'modular-course' });
    const { result } = composeProjectPreview(project, config);
    const tocTexts = result.toc.map((entry) => entry.text);

    expect(tocTexts).toContain('Lección 1.1 · Conceptos base');
    expect(tocTexts).toContain('Recursos del módulo 3');
  });

  it('template seeds compose without violations', () => {
    for (const template of PRODUCT_TEMPLATES) {
      const project = createProjectRecord('user-1', { title: template.id, templateId: template.id });
      const { result } = composeProjectPreview(project, config);
      expect(result.violations).toEqual([]);
    }
  });
});
