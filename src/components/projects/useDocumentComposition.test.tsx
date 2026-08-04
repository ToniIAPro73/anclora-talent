import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProjectRecord } from '@/lib/projects/types';
import { useDocumentComposition } from './useDocumentComposition';

/**
 * Telemetry of the live composition hook (F0.2): every recompose is timed
 * with `performance.now()`, logged under `[anclora:recompose]` and exposed
 * as a rolling window (max 20) of {count, lastMs, avgMs}.
 */

function fakeProject(paragraphText = 'Uno'): ProjectRecord {
  return {
    id: 'proj-1',
    userId: 'user-1',
    workspaceId: null,
    slug: 'book',
    title: 'Book',
    status: 'draft',
    workflowStep: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    document: {
      id: 'doc-1',
      title: 'Book',
      subtitle: '',
      author: 'Anon',
      language: 'es',
      rules: null,
      chapters: [
        {
          id: 'chapter-1',
          order: 1,
          title: 'Capítulo 1',
          blocks: [
            { id: 'block-1', order: 1, type: 'heading' as const, content: 'Capítulo 1' },
            { id: 'block-2', order: 2, type: 'paragraph' as const, content: '<p>Intro</p>' },
          ],
        },
        {
          id: 'chapter-2',
          order: 2,
          title: 'Capítulo 2',
          blocks: [
            { id: 'block-3', order: 1, type: 'heading' as const, content: 'Capítulo 2' },
            { id: 'block-4', order: 2, type: 'paragraph' as const, content: `<p>${paragraphText}</p>` },
          ],
        },
      ],
    },
    cover: {
      id: 'c1',
      title: 'Book',
      subtitle: '',
      palette: 'obsidian',
      backgroundImageUrl: null,
      thumbnailUrl: null,
    },
    backCover: {
      id: 'b1',
      title: 'Book',
      body: '',
      authorBio: '',
      accentColor: null,
      backgroundImageUrl: null,
      renderedImageUrl: null,
    },
    assets: [],
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * Deterministic clock: every `performance.now()` call advances `stepMs`, so
 * each measured compose window (start/end pair) spans exactly one step.
 * React's own dev profiling also calls `performance.now()` between renders,
 * which is why fixed once-queues are not reliable here.
 */
function mockPerformanceStep(stepMs: number) {
  let now = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => {
    now += stepMs;
    return now;
  });
}

describe('useDocumentComposition — telemetry (F0.2)', () => {
  it('times the initial full compose and logs it under [anclora:recompose]', () => {
    mockPerformanceStep(120);
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    const { result } = renderHook(({ project }) => useDocumentComposition(project), {
      initialProps: { project: fakeProject() },
    });

    expect(result.current.telemetry).toEqual({ count: 1, lastMs: 120, avgMs: 120 });
    expect(result.current.diff).toBeNull();
    expect(debugSpy).toHaveBeenCalledTimes(1);
    expect(debugSpy.mock.calls[0][0]).toContain('[anclora:recompose]');
    expect(debugSpy.mock.calls[0][0]).toContain('120ms');
    expect(debugSpy.mock.calls[0][0]).toContain('completa');
  });

  it('measures the incremental recompose after an edit and keeps a rolling average', () => {
    mockPerformanceStep(30);
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    const { result, rerender } = renderHook(({ project }) => useDocumentComposition(project), {
      initialProps: { project: fakeProject() },
    });

    rerender({ project: fakeProject('Uno editado') });

    expect(result.current.telemetry).toEqual({ count: 2, lastMs: 30, avgMs: 30 });
    expect(result.current.diff).not.toBeNull();
    expect(debugSpy).toHaveBeenCalledTimes(2);
    expect(debugSpy.mock.calls[1][0]).toContain('30ms');
    expect(debugSpy.mock.calls[1][0]).toContain('incremental');
  });

  it('retains only the last 20 measurements', () => {
    mockPerformanceStep(5);
    vi.spyOn(console, 'debug').mockImplementation(() => {});

    const { result, rerender } = renderHook(({ project }) => useDocumentComposition(project), {
      initialProps: { project: fakeProject() },
    });

    for (let edit = 1; edit <= 25; edit += 1) {
      rerender({ project: fakeProject(`Edición ${edit}`) });
    }

    expect(result.current.telemetry.count).toBe(20);
    expect(result.current.telemetry.lastMs).toBe(5);
    expect(result.current.telemetry.avgMs).toBe(5);
  });
});
