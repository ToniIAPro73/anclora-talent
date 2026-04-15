/**
 * Unit tests for preview-builder
 * Tests the complete preview page building process
 */

import { buildPreviewPages } from './preview-builder';
import type { ProjectRecord } from '@/lib/projects/types';
import { DEVICE_PAGINATION_CONFIGS } from './device-configs';
import { createDefaultSurfaceState } from '@/lib/projects/cover-surface';
import { chapterBlocksToHtml } from '@/lib/projects/chapter-html';
import { paginateContent } from './content-paginator';
import { reconcileOverflowBreaks } from './editor-page-layout';

// Helper to create a mock project
function createMockProject(overrides?: Partial<ProjectRecord>): ProjectRecord {
  const baseProject: ProjectRecord = {
    id: 'proj-123',
    userId: 'user-123',
    workspaceId: null,
    slug: 'test-project',
    title: 'Test Project',
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    document: {
      id: 'doc-123',
      title: 'Test Document',
      subtitle: 'A test subtitle',
      author: 'Test Author',
      language: 'es',
      chapters: [
        {
          id: 'ch1',
          order: 1,
          title: 'Chapter 1',
          blocks: [
            {
              id: 'block1',
              type: 'paragraph',
              order: 1,
              content: '<p>This is chapter 1 content.</p>',
            },
          ],
        },
        {
          id: 'ch2',
          order: 2,
          title: 'Chapter 2',
          blocks: [
            {
              id: 'block2',
              type: 'paragraph',
              order: 1,
              content: '<p>This is chapter 2 content.</p>',
            },
          ],
        },
      ],
    },
    cover: {
      id: 'cover-123',
      title: 'Cover Title',
      subtitle: 'Cover Subtitle',
      palette: 'obsidian',
      backgroundImageUrl: null,
      thumbnailUrl: null,
      layout: 'centered',
      showSubtitle: true,
    },
    backCover: {
      id: 'back-123',
      title: 'Back Cover',
      body: 'Back cover body',
      authorBio: 'Author bio',
      accentColor: null,
      backgroundImageUrl: null,
      renderedImageUrl: null,
    },
    assets: [],
  };

  return { ...baseProject, ...overrides };
}

describe('preview-builder', () => {
  describe('buildPreviewPages', () => {
    it('should return preview pages with cover and content', () => {
      const project = createMockProject();
      const config = DEVICE_PAGINATION_CONFIGS.laptop;

      const pages = buildPreviewPages(project, config);

      // Should have at least: cover (1) + content (2+) + back-cover (1)
      expect(pages.length).toBeGreaterThanOrEqual(4);

      // First page should be cover
      expect(pages[0].type).toBe('cover');
      expect(pages[0].pageNumber).toBe(1);

      // Last page should be back cover
      expect(pages[pages.length - 1].type).toBe('back-cover');
    });

    it('should assign sequential page numbers', () => {
      const project = createMockProject();
      const config = DEVICE_PAGINATION_CONFIGS.laptop;

      const pages = buildPreviewPages(project, config);

      // Page numbers should be sequential
      for (let i = 0; i < pages.length; i++) {
        expect(pages[i].pageNumber).toBe(i + 1);
      }
    });

    it('should include all chapters in content pages', () => {
      const project = createMockProject();
      const config = DEVICE_PAGINATION_CONFIGS.laptop;

      const pages = buildPreviewPages(project, config);

      const contentPages = pages.filter(p => p.type === 'content');

      // Should have content from both chapters
      const allContent = contentPages.map(p => p.content ?? '').join('');
      expect(allContent).toContain('This is chapter 1 content.');
      expect(allContent).toContain('This is chapter 2 content.');
    });

    it('should include chapter IDs in content pages', () => {
      const project = createMockProject();
      const config = DEVICE_PAGINATION_CONFIGS.laptop;

      const pages = buildPreviewPages(project, config);

      const contentPages = pages.filter(p => p.type === 'content' && p.chapterId);

      // Should have at least one page per chapter
      expect(contentPages.length).toBeGreaterThanOrEqual(
        project.document.chapters.length,
      );

      // Check that chapter IDs match
      const chapterIds = new Set(contentPages.map(p => p.chapterId));
      expect(chapterIds.has('ch1')).toBe(true);
      expect(chapterIds.has('ch2')).toBe(true);
    });

    it('should include chapter titles in content pages', () => {
      const project = createMockProject();
      const config = DEVICE_PAGINATION_CONFIGS.laptop;

      const pages = buildPreviewPages(project, config);

      const contentPages = pages.filter(p => p.type === 'content');

      // At least one page should have chapter title
      const pageTitles = contentPages
        .filter(p => p.chapterTitle)
        .map(p => p.chapterTitle);
      expect(pageTitles.length).toBeGreaterThan(0);
    });

    it('should handle single chapter projects', () => {
      const project = createMockProject({
        document: {
          ...createMockProject().document,
          chapters: [
            {
              id: 'ch1',
              order: 1,
              title: 'Only Chapter',
              blocks: [
                {
                  id: 'block1',
                  type: 'paragraph',
                  order: 1,
                  content: '<p>Single chapter content.</p>',
                },
              ],
            },
          ],
        },
      });

      const config = DEVICE_PAGINATION_CONFIGS.laptop;
      const pages = buildPreviewPages(project, config);

      // Should still have cover, content, back-cover
      expect(pages.length).toBeGreaterThanOrEqual(3);

      const contentPages = pages.filter(p => p.type === 'content');
      expect(contentPages.length).toBeGreaterThan(0);
    });

    it('should handle empty chapters', () => {
      const project = createMockProject({
        document: {
          ...createMockProject().document,
          chapters: [
            {
              id: 'ch1',
              order: 1,
              title: 'Empty Chapter',
              blocks: [],
            },
            {
              id: 'ch2',
              order: 2,
              title: 'With Content',
              blocks: [
                {
                  id: 'block1',
                  type: 'paragraph',
                  order: 1,
                  content: '<p>Content here.</p>',
                },
              ],
            },
          ],
        },
      });

      const config = DEVICE_PAGINATION_CONFIGS.laptop;
      const pages = buildPreviewPages(project, config);

      // Should not crash with empty chapter
      expect(pages.length).toBeGreaterThan(0);
    });

    it('should not create a synthetic toc page', () => {
      const project = createMockProject();
      const config = DEVICE_PAGINATION_CONFIGS.laptop;

      const pages = buildPreviewPages(project, config);

      const tocPage = pages.find(p => p.type === 'toc');
      expect(tocPage).toBeUndefined();
    });

    it('should respect chapter order', () => {
      const project = createMockProject({
        document: {
          ...createMockProject().document,
          chapters: [
            {
              id: 'ch3',
              order: 1,
              title: 'First Chapter',
              blocks: [
                {
                  id: 'b1',
                  type: 'paragraph',
                  order: 1,
                  content: '<p>First content</p>',
                },
              ],
            },
            {
              id: 'ch1',
              order: 2,
              title: 'Second Chapter',
              blocks: [
                {
                  id: 'b2',
                  type: 'paragraph',
                  order: 1,
                  content: '<p>Second content</p>',
                },
              ],
            },
          ],
        },
      });

      const config = DEVICE_PAGINATION_CONFIGS.laptop;
      const pages = buildPreviewPages(project, config);

      // Content pages should respect order
      const contentPages = pages.filter(p => p.type === 'content' && p.chapterId);
      const chapterOrder = contentPages.map(p => p.chapterId);

      // First content chapter should be ch3, not ch1
      if (chapterOrder.length > 0) {
        expect(chapterOrder[0]).toBe('ch3');
      }
    });

    it('should handle different device configurations', () => {
      const project = createMockProject();

      const mobilePages = buildPreviewPages(project, DEVICE_PAGINATION_CONFIGS.mobile);
      const tabletPages = buildPreviewPages(project, DEVICE_PAGINATION_CONFIGS.tablet);
      const laptopPages = buildPreviewPages(project, DEVICE_PAGINATION_CONFIGS.laptop);

      // All should produce valid results
      expect(mobilePages.length).toBeGreaterThan(0);
      expect(tabletPages.length).toBeGreaterThan(0);
      expect(laptopPages.length).toBeGreaterThan(0);

      // Mobile (narrower) should have more pages due to more line breaks
      expect(mobilePages.length).toBeGreaterThanOrEqual(laptopPages.length);
    });

    it('should include document metadata in cover', () => {
      const project = createMockProject();
      const config = DEVICE_PAGINATION_CONFIGS.laptop;

      const pages = buildPreviewPages(project, config);

      const coverPage = pages.find(p => p.type === 'cover');
      expect(coverPage).toBeDefined();

      if (coverPage?.coverData) {
        expect(coverPage.coverData.title).toBe(project.cover.title);
      }
    });

    it('does not expose a hidden subtitle from saved cover surface state', () => {
      const project = createMockProject({
        cover: {
          ...createMockProject().cover,
          subtitle: 'Subtitulo heredado',
          showSubtitle: true,
          renderedImageUrl: null,
          surfaceState: (() => {
            const state = createDefaultSurfaceState('cover');
            state.fields.title.value = 'Cover Title';
            state.fields.title.visible = true;
            state.fields.subtitle.value = '';
            state.fields.subtitle.visible = false;
            state.fields.author.value = 'Test Author';
            state.fields.author.visible = true;
            return state;
          })(),
        },
      });

      const pages = buildPreviewPages(project, DEVICE_PAGINATION_CONFIGS.laptop);
      const coverPage = pages.find((page) => page.type === 'cover');

      expect(coverPage?.coverData?.subtitle).toBe('');
      expect(coverPage?.coverData?.showSubtitle).toBe(false);
    });

    it('does not expose hidden back cover body or author bio from saved surface state', () => {
      const project = createMockProject({
        backCover: {
          ...createMockProject().backCover,
          renderedImageUrl: null,
          body: 'Texto heredado',
          authorBio: 'Bio heredada',
          surfaceState: (() => {
            const state = createDefaultSurfaceState('back-cover');
            state.fields.title.value = 'Back Cover';
            state.fields.title.visible = true;
            state.fields.body.value = '';
            state.fields.body.visible = false;
            state.fields.authorBio.value = '';
            state.fields.authorBio.visible = false;
            return state;
          })(),
        },
      });

      const pages = buildPreviewPages(project, DEVICE_PAGINATION_CONFIGS.laptop);
      const backCoverPage = pages.find((page) => page.type === 'back-cover');

      expect(backCoverPage?.backCoverData?.body).toBe('');
      expect(backCoverPage?.backCoverData?.authorBio).toBe('');
    });

    it('builds cover, chapter content, and back cover in the real preview order', () => {
      const base = createMockProject();
      const project = createMockProject({
        document: {
          ...base.document,
          chapters: [
            {
              id: 'toc-chapter',
              order: 0,
              title: 'Índice',
              blocks: [
                {
                  id: 'toc-block',
                  type: 'paragraph',
                  order: 0,
                  content: '<h2>Índice</h2><p>Introducción</p>',
                },
              ],
            },
            {
              id: 'intro-chapter',
              order: 1,
              title: 'Introducción',
              blocks: [
                {
                  id: 'intro-block',
                  type: 'paragraph',
                  order: 0,
                  content: '<h2>Introducción</h2><p>Texto</p>',
                },
              ],
            },
          ],
        },
      });

      const pages = buildPreviewPages(project, DEVICE_PAGINATION_CONFIGS.laptop);

      expect(pages[0].type).toBe('cover');
      expect(pages[1].type).toBe('content');
      expect(pages[1].chapterTitle).toBe('Índice');
      expect(pages.some((page) => page.type === 'content' && page.chapterTitle === 'Introducción')).toBe(true);
      expect(pages.at(-1)?.type).toBe('back-cover');
    });

    it('uses chapter-first page numbers that start immediately after the cover', () => {
      const base = createMockProject();
      const project = createMockProject({
        document: {
          ...base.document,
          chapters: [
            {
              id: 'toc-chapter',
              order: 0,
              title: 'Índice',
              blocks: [
                {
                  id: 'toc-block',
                  type: 'paragraph',
                  order: 0,
                  content: '<h2>Índice</h2><p>Introducción</p>',
                },
              ],
            },
          ],
        },
      });

      const pages = buildPreviewPages(project, DEVICE_PAGINATION_CONFIGS.laptop);

      const firstContentPage = pages.find((page) => page.type === 'content');
      expect(firstContentPage?.pageNumber).toBe(2);
    });

    it('enriches an index chapter with the real first page of each chapter', () => {
      const base = createMockProject();
      const project = createMockProject({
        document: {
          ...base.document,
          source: {
            fileName: 'nunca.docx',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            importedAt: new Date().toISOString(),
            outline: [
              { title: 'Índice', level: 1, origin: 'generated' },
              { title: 'Introducción', level: 1, origin: 'generated' },
              { title: 'Fase 1', level: 1, origin: 'generated' },
            ],
          },
          chapters: [
            {
              id: 'toc-chapter',
              order: 0,
              title: 'Índice',
              blocks: [
                {
                  id: 'toc-block',
                  type: 'paragraph',
                  order: 0,
                  content: '<h2>Índice</h2><p>Contenido provisional</p>',
                },
              ],
            },
            {
              id: 'intro-chapter',
              order: 1,
              title: 'Introducción',
              blocks: [
                {
                  id: 'intro-block',
                  type: 'paragraph',
                  order: 0,
                  content: '<h2>Introducción</h2><p>Texto</p>',
                },
              ],
            },
            {
              id: 'phase-chapter',
              order: 2,
              title: 'Fase 1',
              blocks: [
                {
                  id: 'phase-block',
                  type: 'paragraph',
                  order: 0,
                  content: '<h2>Fase 1</h2><p>Otro texto</p>',
                },
              ],
            },
          ],
        },
      });

      const pages = buildPreviewPages(project, DEVICE_PAGINATION_CONFIGS.laptop);
      const tocPage = pages.find(
        (page) => page.type === 'content' && page.chapterTitle === 'Índice',
      );

      expect(tocPage?.content).toContain('Introducción');
      expect(tocPage?.content).toContain('Fase 1');
      expect(tocPage?.content).toContain('····');
      expect(tocPage?.content).toContain('<span data-toc-page="true">3</span>');
      expect(tocPage?.content).toContain('<span data-toc-page="true">4</span>');
    });

    it('falls back to chapter titles when there is no source outline for the index', () => {
      const base = createMockProject();
      const project = createMockProject({
        document: {
          ...base.document,
          chapters: [
            {
              id: 'toc-chapter',
              order: 0,
              title: 'Índice',
              blocks: [
                {
                  id: 'toc-block',
                  type: 'paragraph',
                  order: 0,
                  content: '<h2>Índice</h2><p>Contenido provisional</p>',
                },
              ],
            },
            {
              id: 'intro-chapter',
              order: 1,
              title: 'Introducción',
              blocks: [
                {
                  id: 'intro-block',
                  type: 'paragraph',
                  order: 0,
                  content: '<h2>Introducción</h2><p>Texto</p>',
                },
              ],
            },
          ],
        },
      });

      const pages = buildPreviewPages(project, DEVICE_PAGINATION_CONFIGS.laptop);
      const tocPage = pages.find(
        (page) => page.type === 'content' && page.chapterTitle === 'Índice',
      );

      expect(tocPage?.content).toContain('Introducción');
      expect(tocPage?.content).toContain('<span data-toc-page="true">3</span>');
    });

    it('reconciles stale automatic page breaks the same way as the chapter editor', () => {
      const base = createMockProject();
      const project = createMockProject({
        document: {
          ...base.document,
          chapters: [
            {
              id: 'toc-chapter',
              order: 1,
              title: 'Índice',
              blocks: [
                {
                  id: 'toc-block',
                  type: 'paragraph',
                  order: 1,
                  content: '<p>Uno</p><hr data-page-break="auto" /><p>Dos</p>',
                },
              ],
            },
          ],
        },
      });

      const pages = buildPreviewPages(project, DEVICE_PAGINATION_CONFIGS.laptop);
      const contentPages = pages.filter((page) => page.type === 'content');

      expect(contentPages).toHaveLength(1);
      expect(contentPages[0].content).toContain('<p>Uno</p>');
      expect(contentPages[0].content).toContain('<p>Dos</p>');
      expect(contentPages[0].content).not.toContain('data-page-break="auto"');
    });

    it('does not inject a synthetic chapter heading that is not present in the chapter html', () => {
      const base = createMockProject();
      const project = createMockProject({
        document: {
          ...base.document,
          chapters: [
            {
              id: 'intro-chapter',
              order: 1,
              title: 'Introducción',
              blocks: [
                {
                  id: 'intro-block',
                  type: 'paragraph',
                  order: 1,
                  content: '<p>Primer párrafo real del capítulo.</p>',
                },
              ],
            },
          ],
        },
      });

      const pages = buildPreviewPages(project, DEVICE_PAGINATION_CONFIGS.laptop);
      const firstContentPage = pages.find((page) => page.type === 'content');

      expect(firstContentPage?.content).toContain('Primer párrafo real del capítulo.');
      expect(firstContentPage?.content).not.toContain('<h2>Introducción</h2>');
    });

    it('paginates chapter content from the same canonical html used by the chapter editor', () => {
      const base = createMockProject();
      const project = createMockProject({
        document: {
          ...base.document,
          chapters: [
            {
              id: 'intro-chapter',
              order: 1,
              title: 'Introducción',
              blocks: [
                {
                  id: 'intro-block-1',
                  type: 'paragraph',
                  order: 1,
                  content: '<p>Uno</p>',
                },
                {
                  id: 'intro-block-2',
                  type: 'paragraph',
                  order: 2,
                  content: '<hr data-page-break="manual" />',
                },
                {
                  id: 'intro-block-3',
                  type: 'paragraph',
                  order: 3,
                  content: '<p>Dos</p>',
                },
              ],
            },
          ],
        },
      });

      const chapterHtml = chapterBlocksToHtml(project.document.chapters[0].blocks);
      const expectedPages = paginateContent(
        reconcileOverflowBreaks(chapterHtml, DEVICE_PAGINATION_CONFIGS.laptop),
        DEVICE_PAGINATION_CONFIGS.laptop,
      );
      const previewPages = buildPreviewPages(project, DEVICE_PAGINATION_CONFIGS.laptop).filter(
        (page) => page.type === 'content',
      );

      expect(previewPages).toHaveLength(expectedPages.length);
      expect(previewPages[0].content).toContain('<p>Uno</p>');
      expect(previewPages.at(-1)?.content).toContain('<p>Dos</p>');
    });

    it('should produce consistent results', () => {
      const project = createMockProject();
      const config = DEVICE_PAGINATION_CONFIGS.laptop;

      const pages1 = buildPreviewPages(project, config);
      const pages2 = buildPreviewPages(project, config);

      // Same input should produce same output
      expect(pages1.length).toBe(pages2.length);

      pages1.forEach((page, i) => {
        expect(page.pageNumber).toBe(pages2[i].pageNumber);
        expect(page.type).toBe(pages2[i].type);
      });
    });
  });
});
