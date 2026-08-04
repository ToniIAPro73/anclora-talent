import { describe, expect, it } from 'vitest';
import { defaultDocumentRules, resolveDocumentRules } from '@/lib/compose/rules';
import { PRODUCT_TEMPLATES, getProductTemplate } from './product-templates';

describe('product template library (F2)', () => {
  it('exposes exactly five templates with stable ids', () => {
    expect(PRODUCT_TEMPLATES.map((template) => template.id)).toEqual([
      'standard-book',
      'technical-manual',
      'lead-magnet',
      'modular-course',
      'bundle',
    ]);
  });

  it('every template is a valid declarative definition', () => {
    for (const template of PRODUCT_TEMPLATES) {
      expect(template.nameKey).toBeTruthy();
      expect(template.descriptionKey).toBeTruthy();
      expect(template.chapters.length).toBeGreaterThan(0);
      expect(template.derivedAssets.length).toBeGreaterThan(0);
      for (const asset of template.derivedAssets) {
        expect(typeof asset).toBe('string');
      }
      // Seed chapters: guide heading first, content empty.
      for (const chapter of template.chapters) {
        expect(chapter.blocks[0]).toEqual({ type: 'heading', content: chapter.title });
        const paragraphs = chapter.blocks.filter((block) => block.type === 'paragraph');
        expect(paragraphs.every((block) => block.content === '')).toBe(true);
      }
    }
  });

  it('every template includes an Índice chapter (generated TOC target)', () => {
    for (const template of PRODUCT_TEMPLATES) {
      expect(template.chapters.some((chapter) => chapter.title === 'Índice')).toBe(true);
    }
  });

  it('template rules resolve over the defaults', () => {
    for (const template of PRODUCT_TEMPLATES) {
      const resolved = resolveDocumentRules(template.rules);
      expect(resolved.exportGate).toBe(defaultDocumentRules.exportGate);
      expect(resolved.keepTogether).toBeDefined();
      expect(resolved.numbering).toEqual(defaultDocumentRules.numbering);
    }

    const book = resolveDocumentRules(getProductTemplate('standard-book')?.rules);
    expect(book.chapterStartsOnOddPage).toBe(true);

    const manual = resolveDocumentRules(getProductTemplate('technical-manual')?.rules);
    expect(manual.keepTogether.code).toBe(true);
    expect(manual.keepTogether.list.maxItems).toBe(8);
    expect(manual.chapterStartsOnOddPage).toBe(false);

    const course = resolveDocumentRules(getProductTemplate('modular-course')?.rules);
    expect(course.pageBreakBeforeChapter).toBe(true);
  });

  it('getProductTemplate resolves by id and ignores unknown ids', () => {
    expect(getProductTemplate('lead-magnet')?.id).toBe('lead-magnet');
    expect(getProductTemplate('does-not-exist')).toBeUndefined();
    expect(getProductTemplate(undefined)).toBeUndefined();
    expect(getProductTemplate('')).toBeUndefined();
  });
});
