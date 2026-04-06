'use client';

import { useMemo, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import type { DocumentBlock, ProjectRecord } from '@/lib/projects/types';
import type { AppMessages } from '@/lib/i18n/messages';
import { EditorialMapPanel } from './EditorialMapPanel';
import { PreviewModal } from './PreviewModal';

const paletteMap = {
  obsidian: 'from-[#0b133f] via-[#0b233f] to-[#07252f] text-[#f2e3b3]',
  teal: 'from-[#124a50] via-[#0b313f] to-[#07252f] text-[#f2e3b3]',
  sand: 'from-[#f2e3b3] via-[#e7d4a0] to-[#d4af37] text-[#0b313f]',
};

const PAGE_UNIT_LIMIT = 64;
const HTML_BLOCK_SEGMENT_RE = /<(h[1-6]|p|ul|ol|blockquote)[^>]*>[\s\S]*?<\/\1>|<hr[^>]*\/?>/gi;

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

function normalizeHtmlFragment(input: string) {
  return input.replace(/>\s+</g, '><').trim();
}

function splitListFragment(fragment: string) {
  const tag = fragment.match(/^<(ul|ol)/i)?.[1]?.toLowerCase() === 'ol' ? 'ol' : 'ul';
  const items = Array.from(fragment.matchAll(/<li[^>]*>[\s\S]*?<\/li>/gi)).map((match) => match[0]);

  if (items.length <= 5) {
    return [fragment];
  }

  const groups: string[] = [];
  for (let index = 0; index < items.length; index += 5) {
    groups.push(`<${tag}>${items.slice(index, index + 5).join('')}</${tag}>`);
  }

  return groups;
}

function expandBlockForPagination(block: DocumentBlock) {
  if (!isHtmlContent(block.content)) {
    return [block];
  }

  const fragments = block.content.match(HTML_BLOCK_SEGMENT_RE) ?? [];
  if (fragments.length === 0) {
    return [block];
  }

  return fragments.flatMap((fragment, index) => {
    const normalized = normalizeHtmlFragment(fragment);
    const pieces = /^<(ul|ol)\b/i.test(normalized) ? splitListFragment(normalized) : [normalized];

    return pieces.map((piece, pieceIndex) => ({
      ...block,
      id: `${block.id}-part-${index}-${pieceIndex}`,
      content: piece,
    }));
  });
}

function estimateHtmlUnits(content: string) {
  const headings = (content.match(/<h[1-6][^>]*>/gi) ?? []).length;
  const paragraphs = (content.match(/<p[^>]*>/gi) ?? []).length;
  const quotes = (content.match(/<blockquote[^>]*>/gi) ?? []).length;
  const listItems = Array.from(content.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi));

  let units = 0;

  if (headings > 0) {
    units += headings * 8;
  }

  if (paragraphs > 0) {
    units += paragraphs * 3;
  }

  if (quotes > 0) {
    units += quotes * 6;
  }

  if (listItems.length > 0) {
    units += 2;
    for (const [, itemContent] of listItems) {
      units += 2 + Math.ceil(countWords(itemContent.replace(/<[^>]+>/g, ' ')) / 10);
    }
  }

  const looseTextWords = countWords(content);
  units += Math.ceil(looseTextWords / 28);

  return units;
}

function estimatePageItemUnits(item: PageItem) {
  if (item.kind === 'chapter-title') {
    return 7 + Math.ceil(countWords(item.text) / 10);
  }

  const { block } = item;
  if (isHtmlContent(block.content)) {
    return estimateHtmlUnits(block.content);
  }

  if (block.type === 'heading') {
    return 7 + Math.ceil(countWords(block.content) / 10);
  }

  if (block.type === 'quote') {
    return 6 + Math.ceil(countWords(block.content) / 16);
  }

  return 3 + Math.ceil(countWords(block.content) / 22);
}

function buildPages(project: ProjectRecord): PageItem[][] {
  const pages: PageItem[][] = [];
  let current: PageItem[] = [];
  let pageUnits = 0;
  const multiChapter = project.document.chapters.length > 1;
  const shouldAddTitlePage = Boolean(project.document.source) || multiChapter;

  const flush = () => {
    if (current.length > 0) {
      pages.push(current);
      current = [];
      pageUnits = 0;
    }
  };

  for (const chapter of project.document.chapters) {
    if (multiChapter && current.length > 0) {
      flush();
    }
    let isFirstBlock = true;

    const paginatedBlocks = chapter.blocks.flatMap(expandBlockForPagination);

    for (const block of paginatedBlocks) {
      if (isFirstBlock && multiChapter) {
        const chapterTitleItem = { kind: 'chapter-title', text: chapter.title } as const;
        current.push(chapterTitleItem);
        pageUnits += estimatePageItemUnits(chapterTitleItem);
        isFirstBlock = false;
      }
      const item = { kind: 'block', block } as const;
      const itemUnits = estimatePageItemUnits(item);

      if (pageUnits + itemUnits > PAGE_UNIT_LIMIT && pageUnits > 0) {
        flush();
      }

      current.push(item);
      pageUnits += itemUnits;
    }
  }

  flush();
  const contentPages = pages.length > 0 ? pages : [[]];
  return shouldAddTitlePage ? [[], ...contentPages] : contentPages;
}

function isHtmlContent(content: string) {
  return content.trimStart().startsWith('<');
}

function BlockRenderer({ block }: { block: DocumentBlock }) {
  if (isHtmlContent(block.content)) {
    return (
      <div
        className="max-w-none text-[var(--text-secondary)] [&_blockquote]:my-5 [&_blockquote]:rounded-[20px] [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--preview-quote-border)] [&_blockquote]:bg-[var(--preview-quote-bg)] [&_blockquote]:px-5 [&_blockquote]:py-4 [&_h1]:mt-8 [&_h1]:text-3xl [&_h1]:font-black [&_h1]:tracking-tight [&_h1]:text-[var(--text-primary)] [&_h2]:mt-7 [&_h2]:text-2xl [&_h2]:font-black [&_h2]:tracking-tight [&_h2]:text-[var(--text-primary)] [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:tracking-tight [&_h3]:text-[var(--text-primary)] [&_hr]:my-8 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-[var(--border-subtle)] [&_li]:mb-2 [&_li]:leading-7 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_p]:leading-8 [&_strong]:font-semibold [&_strong]:text-[var(--text-primary)] [&_ul]:my-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6"
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
      data-testid="preview-cover-panel"
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
  const [showAdvancedPreview, setShowAdvancedPreview] = useState(false);
  
  // Legacy preview state (kept for backward compatibility)
  const pages = useMemo(() => buildPages(project), [project]);
  const pageSummaries = useMemo(
    () =>
      pages.map((page, index) => {
        if (index === 0) {
          return { pageNumber: 1, label: 'Portada / título' };
        }

        const chapterTitle = page.find((item) => item.kind === 'chapter-title');
        if (chapterTitle && chapterTitle.kind === 'chapter-title') {
          return { pageNumber: index + 1, label: chapterTitle.text };
        }

        const blockItem = page.find((item) => item.kind === 'block');
        if (blockItem && blockItem.kind === 'block') {
          const raw = blockItem.block.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          return { pageNumber: index + 1, label: raw.slice(0, 80) || project.document.title };
        }

        return { pageNumber: index + 1, label: project.document.title };
      }),
    [pages, project.document.title],
  );
  const [pageIndex, setPageIndex] = useState(0);
  const [bookView, setBookView] = useState(false);
  
  // Show advanced preview modal if requested
  if (showAdvancedPreview) {
    return (
      <PreviewModal
        project={project}
        copy={copy}
        onClose={() => setShowAdvancedPreview(false)}
      />
    );
  }

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
    <div className="space-y-6">
      {/* Advanced Preview Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAdvancedPreview(true)}
          className="inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[var(--button-primary-border)] bg-[var(--button-primary-bg)] px-6 py-3 text-base font-bold !text-[var(--button-primary-fg)] shadow-[var(--shadow-soft)] transition hover:bg-[var(--button-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-primary-bg)] focus-visible:ring-offset-2"
        >
          <BookOpen className="h-4 w-4" />
          Vista previa avanzada
        </button>
      </div>
      <EditorialMapPanel copy={copy} pageSummaries={pageSummaries} project={project} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-1">
          <button
            onClick={switchToScroll}
            data-testid="preview-scroll-view-button"
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
            data-testid="preview-book-view-button"
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
              data-testid="preview-previous-page-button"
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
              data-testid="preview-next-page-button"
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
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.75fr)]">
          <PageContent page={pages[pageIndex] ?? []} project={project} pageIndex={pageIndex} copy={copy} />
          <CoverPanel project={project} copy={copy} />
        </div>
      )}
    </div>
  );
}
