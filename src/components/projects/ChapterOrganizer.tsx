'use client';

import type { DocumentChapter } from '@/lib/projects/types';

export function ChapterOrganizer({
  chapters,
  activeChapterId,
  onSelect,
}: {
  chapters: DocumentChapter[];
  activeChapterId: string;
  onSelect: (chapterId: string) => void;
}) {
  return (
    <nav
      aria-label="Capítulos"
      className="flex flex-col gap-1 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-4 shadow-[var(--shadow-strong)]"
    >
      <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
        Capítulos
      </p>
      {chapters.map((chapter, index) => {
        const isActive = chapter.id === activeChapterId;
        return (
          <button
            key={chapter.id}
            type="button"
            onClick={() => onSelect(chapter.id)}
            aria-current={isActive ? 'page' : undefined}
            className={`flex w-full items-start gap-3 rounded-[18px] px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-mint)] ${
              isActive
                ? 'bg-[var(--button-highlight-bg)] text-[var(--button-highlight-fg)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                isActive
                  ? 'bg-white/20 text-inherit'
                  : 'bg-[var(--surface-highlight)] text-[var(--text-tertiary)]'
              }`}
            >
              {index + 1}
            </span>
            <span className="line-clamp-2 text-xs font-semibold leading-5">
              {chapter.title}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
