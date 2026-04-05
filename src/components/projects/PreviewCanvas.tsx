'use client';

import { useMemo, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import type { DocumentBlock, ProjectRecord } from '@/lib/projects/types';
import type { AppMessages } from '@/lib/i18n/messages';

const paletteMap = {
  obsidian: 'from-[#0b133f] via-[#0b233f] to-[#07252f] text-[#f2e3b3]',
  teal: 'from-[#124a50] via-[#0b313f] to-[#07252f] text-[#f2e3b3]',
  sand: 'from-[#f2e3b3] via-[#e7d4a0] to-[#d4af37] text-[#0b313f]',
};

const WORDS_PER_PAGE = 350;

type PageItem =
  | { kind: 'chapter-title'; text: string }
  | { kind: 'block'; block: DocumentBlock };

function countWords(text: string): number {
  return text
    .replace(/<[^>]+>/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function buildPages(project: ProjectRecord): PageItem[][] {
  const pages: PageItem[][] = [];
  let current: PageItem[] = [];
  let wordCount = 0;
  const multiChapter = project.document.chapters.length > 1;

  const flush = () => {
    if (current.length > 0) {
      pages.push(current);
      current = [];
      wordCount = 0;
    }
  };

  for (const chapter of project.document.chapters) {
    if (multiChapter && current.length > 0) {
      flush();
    }
    let isFirstBlock = true;

    for (const block of chapter.blocks) {
      const w = countWords(block.content);
      if (wordCount + w > WORDS_PER_PAGE && wordCount > 0) {
        flush();
      }
      if (isFirstBlock && multiChapter) {
        current.push({ kind: 'chapter-title', text: chapter.title });
        isFirstBlock = false;
      }
      current.push({ kind: 'block', block });
      wordCount += w;
    }
  }

  flush();
  return pages.length > 0 ? pages : [[]];
}

function isHtmlContent(content: string) {
  return content.trimStart().startsWith('<');
}

function BlockRenderer({ block }: { block: DocumentBlock }) {
  if (isHtmlContent(block.content)) {
    return (
      <div
        className="prose prose-sm max-w-none text-[var(--text-secondary)] [&_h2]:text-2xl [&_h2]:font-black [&_h2]:tracking-tight [&_h2]:text-[var(--text-primary)] [&_blockquote]:rounded-[16px] [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--preview-quote-border)] [&_blockquote]:bg-[var(--preview-quote-bg)] [&_blockquote]:px-5 [&_blockquote]:py-4 [&_p]:leading-8"
        dangerouslySetInnerHTML={{ __html: block.content }}
      />
    );
  }
  if (block.type === 'heading') {
    return <h3 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">{block.content}</h3>;
  }
  if (block.type === 'quote') {
    return (
      <blockquote className="rounded-[28px] border-l-4 border-[var(--preview-quote-border)] bg-[var(--preview-quote-bg)] px-6 py-6 text-lg leading-8 text-[var(--text-primary)]">
        {block.content}
      </blockquote>
    );
  }
  return <p className="text-base leading-8 text-[var(--text-secondary)]">{block.content}</p>;
}

function PageContent({
  page,
  project,
  pageIndex,
  copy,
}: {
  page: PageItem[];
  project: ProjectRecord;
  pageIndex: number;
  copy: AppMessages['project'];
}) {
  return (
    <article className="rounded-[32px] border border-[var(--preview-paper-border)] bg-[var(--preview-paper)] p-8 shadow-[var(--shadow-soft)]">
      {pageIndex === 0 ? (
        <>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">
            {copy.previewCanvasEyebrow}
          </p>
          <h2 className="mt-4 text-4xl font-black tracking-tight text-[var(--text-primary)]">
            {project.document.title}
          </h2>
          <p className="mt-3 max-w-3xl text-lg leading-8 text-[var(--text-secondary)]">
            {project.document.subtitle}
          </p>
          <div className="mt-10 space-y-6">
            {page.map((item, i) =>
              item.kind === 'chapter-title' ? (
                <h3 key={i} className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
                  {item.text}
                </h3>
              ) : (
                <BlockRenderer key={item.block.id} block={item.block} />
              )
            )}
          </div>
        </>
      ) : (
        <>
          <p className="mb-8 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">
            {project.document.title}
          </p>
          <div className="space-y-6">
            {page.map((item, i) =>
              item.kind === 'chapter-title' ? (
                <h3 key={i} className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
                  {item.text}
                </h3>
              ) : (
                <BlockRenderer key={item.block.id} block={item.block} />
              )
            )}
          </div>
        </>
      )}
    </article>
  );
}

function CoverPanel({ project, copy }: { project: ProjectRecord; copy: AppMessages['project'] }) {
  return (
    <aside
      className={`rounded-[32px] border border-[var(--border-subtle)] bg-gradient-to-br p-8 shadow-[var(--shadow-soft)] ${paletteMap[project.cover.palette]}`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.28em] opacity-70">{copy.previewCoverEyebrow}</p>
      <div className="mt-6 rounded-[28px] border border-white/15 bg-black/10 p-6 backdrop-blur">
        {project.cover.backgroundImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.cover.backgroundImageUrl}
            alt={project.cover.title}
            className="mb-6 h-56 w-full rounded-[22px] object-cover"
          />
        ) : null}
        <h3 className="text-4xl font-black tracking-tight">{project.cover.title}</h3>
        <p className="mt-4 text-sm leading-7 opacity-80">{project.cover.subtitle}</p>
      </div>
    </aside>
  );
}

export function PreviewCanvas({
  copy,
  project,
}: {
  copy: AppMessages['project'];
  project: ProjectRecord;
}) {
  const pages = useMemo(() => buildPages(project), [project]);
  const [pageIndex, setPageIndex] = useState(0);
  const [bookView, setBookView] = useState(false);

  const totalPages = pages.length;
  const rightIdx = bookView ? pageIndex + 1 : -1;
  const totalSpreads = bookView ? Math.ceil(totalPages / 2) : totalPages;
  const currentDisplay = bookView ? Math.floor(pageIndex / 2) + 1 : pageIndex + 1;

  const canPrev = pageIndex > 0;
  const canNext = bookView
    ? pageIndex + 2 < totalPages
    : pageIndex < totalPages - 1;

  const goPrev = () =>
    setPageIndex(prev => Math.max(0, prev - (bookView ? 2 : 1)));

  const goNext = () =>
    setPageIndex(prev => Math.min(totalPages - 1, prev + (bookView ? 2 : 1)));

  const switchToBook = () => {
    setBookView(true);
    setPageIndex(prev => Math.floor(prev / 2) * 2);
  };

  const switchToScroll = () => {
    setBookView(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-1">
          <button
            onClick={switchToScroll}
            className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              !bookView
                ? 'bg-[var(--shell-main-surface)] text-[var(--text-primary)] shadow-[var(--shadow-soft)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Vista continua
          </button>
          <button
            onClick={switchToBook}
            className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              bookView
                ? 'bg-[var(--shell-main-surface)] text-[var(--text-primary)] shadow-[var(--shadow-soft)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Vista libro
          </button>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={goPrev}
              disabled={!canPrev}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-soft)] text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[90px] text-center text-xs font-semibold text-[var(--text-tertiary)]">
              Página {currentDisplay} de {totalSpreads}
            </span>
            <button
              onClick={goNext}
              disabled={!canNext}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-soft)] text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {bookView ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <PageContent page={pages[pageIndex] ?? []} project={project} pageIndex={pageIndex} copy={copy} />
          {rightIdx < totalPages ? (
            <PageContent page={pages[rightIdx]} project={project} pageIndex={rightIdx} copy={copy} />
          ) : (
            <CoverPanel project={project} copy={copy} />
          )}
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <PageContent page={pages[pageIndex] ?? []} project={project} pageIndex={pageIndex} copy={copy} />
          <CoverPanel project={project} copy={copy} />
        </div>
      )}
    </div>
  );
}
