import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { ChapterOrganizer } from './ChapterOrganizer';

vi.mock('@/lib/projects/actions', () => ({
  deleteChapterAction: vi.fn(),
  moveChapterAction: vi.fn(),
}));

const chapters = [
  {
    id: 'chapter-1',
    order: 1,
    title: 'Introducción',
    blocks: [{ id: 'block-1', order: 1, type: 'paragraph' as const, content: '<p>Texto</p>' }],
  },
  {
    id: 'chapter-2',
    order: 2,
    title: 'Cierre',
    blocks: [{ id: 'block-2', order: 1, type: 'paragraph' as const, content: '<p>Texto</p>' }],
  },
];

describe('ChapterOrganizer accessibility contract', () => {
  test('names chapter actions with their target and preserves boundary disabling', () => {
    render(
      <ChapterOrganizer
        projectId="project-1"
        chapters={chapters}
        activeChapterId="chapter-1"
        onSelect={vi.fn()}
        onEditChapter={vi.fn()}
        onAddChapter={vi.fn()}
        onImportChapter={vi.fn()}
        onSyncPageNumbers={vi.fn()}
        chapterActionEdit="Edit chapter"
        chapterActionMoveUp="Move chapter up"
        chapterActionMoveDown="Move chapter down"
        chapterActionDelete="Delete chapter"
      />,
    );

    expect(screen.getByRole('button', { name: 'Edit chapter: Introducción' })).toHaveClass('min-w-11');
    expect(screen.getByRole('button', { name: 'Move chapter up: Introducción' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move chapter down: Introducción' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Delete chapter: Introducción' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Move chapter down: Cierre' })).toBeDisabled();
  });
});
