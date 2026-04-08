import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const saveChapterContentActionMock = vi.fn();

vi.mock('@/lib/projects/actions', () => ({
  saveChapterContentAction: (...args: unknown[]) => saveChapterContentActionMock(...args),
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
    expect(result.current.htmlContent).toBe('<h2>Capítulo 2</h2>\n<p>Dos</p>');

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
});
