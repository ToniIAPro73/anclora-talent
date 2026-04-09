import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const saveChapterContentActionMock = vi.fn();
const routerRefreshMock = vi.fn();

vi.mock('@/lib/projects/actions', () => ({
  saveChapterContentAction: (...args: unknown[]) => saveChapterContentActionMock(...args),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: routerRefreshMock,
  }),
}));

import { useChapterEditor } from './useChapterEditor';

describe('useChapterEditor', () => {
  const chapters = [
    {
      id: 'chapter-1',
      order: 1,
      title: 'Capítulo 1',
      blocks: [{ id: 'block-1', order: 1, type: 'paragraph' as const, content: '<p>Uno</p>' }],
    },
    {
      id: 'chapter-2',
      order: 2,
      title: 'Capítulo 2',
      blocks: [
        { id: 'block-2', order: 1, type: 'heading' as const, content: 'Capítulo 2' },
        { id: 'block-3', order: 2, type: 'paragraph' as const, content: 'Dos' },
      ],
    },
  ];

  beforeEach(() => {
    saveChapterContentActionMock.mockReset();
    routerRefreshMock.mockReset();
    vi.restoreAllMocks();
  });

  test('does not mark the chapter as changed when the editor re-emits the baseline html', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');

    const { result } = renderHook(() =>
      useChapterEditor({
        chapters,
        initialChapterIndex: 0,
        projectId: 'project-1',
      }),
    );

    act(() => {
      result.current.setHtmlContent('<p>Uno</p>');
    });

    expect(result.current.hasChanges).toBe(false);

    await act(async () => {
      await result.current.goToNextChapter();
    });

    expect(result.current.currentIndex).toBe(1);
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  test('prompts before changing chapter when there are real unsaved changes', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    const { result } = renderHook(() =>
      useChapterEditor({
        chapters,
        initialChapterIndex: 0,
        projectId: 'project-1',
      }),
    );

    act(() => {
      result.current.setHtmlContent('<p>Uno editado</p>');
    });

    expect(result.current.hasChanges).toBe(true);

    await act(async () => {
      await result.current.goToNextChapter();
    });

    expect(result.current.currentIndex).toBe(0);
    expect(confirmSpy).toHaveBeenCalledTimes(1);
  });

  test('reconstructs semantic chapter blocks into stable editor html when navigating', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');

    const { result } = renderHook(() =>
      useChapterEditor({
        chapters,
        initialChapterIndex: 0,
        projectId: 'project-1',
      }),
    );

    await act(async () => {
      await result.current.goToNextChapter();
    });

    expect(result.current.currentIndex).toBe(1);
    expect(result.current.htmlContent).toBe('<h2>Capítulo 2</h2><p>Dos</p>');

    act(() => {
      result.current.setHtmlContent('<h2>Capítulo 2</h2><p>Dos</p>');
    });

    expect(result.current.hasChanges).toBe(false);
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  test('derives total pages from real pagination instead of counting consecutive manual breaks', () => {
    const chaptersWithBreaks = [
      {
        id: 'chapter-breaks',
        order: 1,
        title: 'Capítulo con saltos',
        blocks: [
          {
            id: 'block-breaks',
            order: 1,
            type: 'paragraph' as const,
            content: '<p>Uno</p><hr data-page-break="true" /><hr data-page-break="true" /><p>Dos</p>',
          },
        ],
      },
    ];

    const { result } = renderHook(() =>
      useChapterEditor({
        chapters: chaptersWithBreaks,
        initialChapterIndex: 0,
        projectId: 'project-1',
      }),
    );

    expect(result.current.totalPages).toBe(2);
  });

  test('does not mark typed page break serialization changes as unsaved edits', () => {
    const chaptersWithTypedBreaks = [
      {
        id: 'chapter-layout',
        order: 1,
        title: 'Capítulo maquetado',
        blocks: [
          {
            id: 'block-layout',
            order: 1,
            type: 'paragraph' as const,
            content: '<p>Uno</p><hr data-page-break="manual" /><p>Dos</p><hr data-page-break="auto" /><p>Tres</p>',
          },
        ],
      },
    ];

    const { result } = renderHook(() =>
      useChapterEditor({
        chapters: chaptersWithTypedBreaks,
        initialChapterIndex: 0,
        projectId: 'project-1',
      }),
    );

    act(() => {
      result.current.setHtmlContent('<p>Uno</p><hr data-page-break="manual"><p>Dos</p><hr data-page-break="auto"><p>Tres</p>');
    });

    expect(result.current.hasChanges).toBe(false);
    expect(result.current.totalPages).toBe(2);
  });

  test('collapses stale auto page breaks when short content fits on one page', () => {
    const chaptersWithStaleAutoBreak = [
      {
        id: 'chapter-auto',
        order: 1,
        title: 'Capítulo corto',
        blocks: [
          {
            id: 'block-auto',
            order: 1,
            type: 'paragraph' as const,
            content: '<p>Fase 1: Percepción</p><hr data-page-break="auto" /><p>Días 1 al 10</p>',
          },
        ],
      },
    ];

    const { result } = renderHook(() =>
      useChapterEditor({
        chapters: chaptersWithStaleAutoBreak,
        initialChapterIndex: 0,
        projectId: 'project-1',
      }),
    );

    expect(result.current.totalPages).toBe(1);
    expect(result.current.htmlContent).toBe('<p>Fase 1: Percepción</p><p>Días 1 al 10</p>');
  });

  test('strips legacy plain hr separators when loading chapter content', () => {
    const chaptersWithLegacyRules = [
      {
        id: 'chapter-rules',
        order: 1,
        title: 'Capítulo con reglas',
        blocks: [
          {
            id: 'block-rules',
            order: 1,
            type: 'paragraph' as const,
            content: '<p>Índice</p><hr /><p>Introducción</p>',
          },
        ],
      },
    ];

    const { result } = renderHook(() =>
      useChapterEditor({
        chapters: chaptersWithLegacyRules,
        initialChapterIndex: 0,
        projectId: 'project-1',
      }),
    );

    expect(result.current.htmlContent).toBe('<p>Índice</p><p>Introducción</p>');
  });

  test('strips decorative separator paragraphs when loading chapter content', () => {
    const chaptersWithDecorativeParagraphs = [
      {
        id: 'chapter-decorative',
        order: 1,
        title: 'Capítulo decorativo',
        blocks: [
          {
            id: 'block-decorative',
            order: 1,
            type: 'paragraph' as const,
            content: '<p>Índice</p><p>─────────────────</p><p>Introducción</p>',
          },
        ],
      },
    ];

    const { result } = renderHook(() =>
      useChapterEditor({
        chapters: chaptersWithDecorativeParagraphs,
        initialChapterIndex: 0,
        projectId: 'project-1',
      }),
    );

    expect(result.current.htmlContent).toBe('<p>Índice</p><p>Introducción</p>');
  });

  test('navigates page by page when a chapter spans multiple pages', () => {
    const longChapter = [
      {
        id: 'chapter-long',
        order: 1,
        title: 'Capítulo largo',
        blocks: [
          {
            id: 'block-long',
            order: 1,
            type: 'paragraph' as const,
            content: `<p>${'Lorem ipsum dolor sit amet. '.repeat(800)}</p>`,
          },
        ],
      },
    ];

    const { result } = renderHook(() =>
      useChapterEditor({
        chapters: longChapter,
        initialChapterIndex: 0,
        projectId: 'project-1',
      }),
    );

    expect(result.current.totalPages).toBeGreaterThan(1);
    expect(result.current.currentPage).toBe(0);
    expect(result.current.canNavigatePagePrev).toBe(false);
    expect(result.current.canNavigatePageNext).toBe(true);

    act(() => {
      result.current.goToPageNext();
    });

    expect(result.current.currentPage).toBe(1);
    expect(result.current.canNavigatePagePrev).toBe(true);
  });

  test('uses measured page counts to clamp pagination to the visible document', () => {
    const longChapter = [
      {
        id: 'chapter-measured',
        order: 1,
        title: 'Capítulo medido',
        blocks: [
          {
            id: 'block-measured',
            order: 1,
            type: 'paragraph' as const,
            content: `<p>${'Lorem ipsum dolor sit amet. '.repeat(800)}</p>`,
          },
        ],
      },
    ];

    const { result } = renderHook(() =>
      useChapterEditor({
        chapters: longChapter,
        initialChapterIndex: 0,
        projectId: 'project-1',
      }),
    );

    act(() => {
      result.current.setMeasuredTotalPages(2);
    });

    expect(result.current.totalPages).toBe(2);

    act(() => {
      result.current.goToPageNext();
    });

    expect(result.current.currentPage).toBe(1);
    expect(result.current.canNavigatePageNext).toBe(false);
  });

  test('never lets an overcounted measured page total exceed the canonical pagination', () => {
    const chaptersWithStaleAutoBreak = [
      {
        id: 'chapter-auto',
        order: 1,
        title: 'Capítulo corto',
        blocks: [
          {
            id: 'block-auto',
            order: 1,
            type: 'paragraph' as const,
            content: '<p>Fase 1: Percepción</p><hr data-page-break="auto" /><p>Días 1 al 10</p>',
          },
        ],
      },
    ];

    const { result } = renderHook(() =>
      useChapterEditor({
        chapters: chaptersWithStaleAutoBreak,
        initialChapterIndex: 0,
        projectId: 'project-1',
      }),
    );

    act(() => {
      result.current.setMeasuredTotalPages(3);
    });

    expect(result.current.totalPages).toBe(1);
  });

  test('refreshes the editor route after saving chapter content so preview reads persisted content', async () => {
    saveChapterContentActionMock.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useChapterEditor({
        chapters,
        initialChapterIndex: 0,
        projectId: 'project-1',
      }),
    );

    act(() => {
      result.current.setHtmlContent('<p>Uno editado</p>');
    });

    await act(async () => {
      await result.current.saveChapter();
    });

    expect(saveChapterContentActionMock).toHaveBeenCalledTimes(1);
    expect(routerRefreshMock).toHaveBeenCalledTimes(1);
  });

  test('saves pending changes before navigating to another chapter when the user confirms', async () => {
    saveChapterContentActionMock.mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const { result } = renderHook(() =>
      useChapterEditor({
        chapters,
        initialChapterIndex: 0,
        projectId: 'project-1',
      }),
    );

    act(() => {
      result.current.setHtmlContent('<p>Uno editado</p>');
    });

    await act(async () => {
      await result.current.goToNextChapter();
    });

    expect(saveChapterContentActionMock).toHaveBeenCalledTimes(1);
    expect(result.current.currentIndex).toBe(1);

    await act(async () => {
      await result.current.goToPrevChapter();
    });

    expect(result.current.currentIndex).toBe(0);
    expect(result.current.htmlContent).toBe('<p>Uno editado</p>');
  });
});
