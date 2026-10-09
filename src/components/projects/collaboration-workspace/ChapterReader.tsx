'use client';

import { useEffect, useRef } from 'react';
import { CheckCircle2, MessageSquarePlus, MessageSquare } from 'lucide-react';
import type { ChapterCommentGroup } from '@/lib/collaboration/comments';
import type { OutlineChapterView } from '@/lib/collaboration/model';
import { chapterOptions, threadCounts, blockThreadSummary, type ChapterFilter } from '@/lib/collaboration/workspace-model';
import { interpolate, type Copy } from './shared';

/**
 * Center column: the document text the comments anchor to (stable AST block ids). One chapter at a time, or — with
 * "Todos los capítulos" — only the blocks that already carry threads. Selecting a block opens its threads and the
 * composer in the review panel.
 */
export function ChapterReader({
  copy,
  outline,
  groups,
  chapter,
  onChapterChange,
  selectedBlockId,
  onSelectBlock,
  canComment,
  scrollToBlockId,
}: {
  copy: Copy;
  outline: OutlineChapterView[];
  groups: ChapterCommentGroup[];
  chapter: ChapterFilter;
  onChapterChange: (chapter: ChapterFilter) => void;
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string | null) => void;
  canComment: boolean;
  /** Set by "Ver en capítulo": scrolls the block into view once. */
  scrollToBlockId: string | null;
}) {
  const options = chapterOptions(outline, groups);
  const summary = blockThreadSummary(groups);
  const counts = threadCounts(groups, chapter);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollToBlockId) return;
    const id = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(scrollToBlockId) : scrollToBlockId;
    rootRef.current?.querySelector(`[data-block-id="${id}"]`)?.scrollIntoView?.({ block: 'center' });
  }, [scrollToBlockId, chapter]);

  const sections = (chapter === 'all' ? outline : outline.filter((item) => item.index === chapter)).map((item) => ({
    ...item,
    blocks: chapter === 'all' ? item.blocks.filter((block) => summary.has(block.blockId)) : item.blocks,
  })).filter((item) => item.blocks.length > 0);

  const chapterLabel = (index: number, title: string) => title || copy.frontMatterChapter || String(index);

  return (
    <div className="cw-reader" data-testid="chapter-reader">
      <header className="cw-panel-header cw-reader__header">
        <label className="cw-chapter-select">
          <span className="cw-visually-hidden">{copy.wsChapterFilter}</span>
          <select
            data-testid="chapter-filter"
            className="cw-select"
            value={String(chapter)}
            onChange={(event) => onChapterChange(event.target.value === 'all' ? 'all' : Number(event.target.value))}
          >
            <option value="all">{copy.wsAllChapters}</option>
            {options.map((option) => (
              <option key={option.index} value={option.index}>
                {chapterLabel(option.index, option.title)}
                {option.openThreads ? ` (${option.openThreads})` : ''}
              </option>
            ))}
          </select>
        </label>
        <p className="cw-panel-meta" data-testid="reader-counts">
          {interpolate(copy.wsOpenThreads, { count: counts.open })} · {counts.resolved} {copy.wsFilterResolved.toLocaleLowerCase()}
        </p>
      </header>

      <div className="cw-reader__scroll" ref={rootRef}>
        {chapter === 'all' ? <p className="cw-hint cw-reader__note">{copy.wsReaderAllNote}</p> : <p className="cw-hint cw-reader__note">{copy.wsReaderHint}</p>}
        {sections.length === 0 ? <p className="cw-empty-line" data-testid="reader-empty">{copy.wsReaderEmpty}</p> : null}
        {sections.map((section) => (
          <section key={section.index} className="cw-reader__chapter" aria-label={chapterLabel(section.index, section.title)}>
            {chapter === 'all' ? <h3 className="cw-subtitle">{chapterLabel(section.index, section.title)}</h3> : null}
            {section.blocks.map((block) => {
              const threads = summary.get(block.blockId);
              const selected = selectedBlockId === block.blockId;
              const total = (threads?.open ?? 0) + (threads?.resolved ?? 0);
              const isHeading = block.kind === 'heading';
              return (
                <div
                  key={block.blockId}
                  className={`cw-block${isHeading ? ' cw-block--heading' : ''}`}
                  data-testid="reader-block"
                  data-block-id={block.blockId}
                  data-selected={selected}
                  data-has-threads={total > 0}
                >
                  <button
                    type="button"
                    className="cw-block__text"
                    data-testid="reader-block-button"
                    aria-pressed={selected}
                    onClick={() => onSelectBlock(selected ? null : block.blockId)}
                  >
                    {block.text}
                  </button>
                  {total > 0 ? (
                    <span className="cw-block__marker" data-testid="block-thread-marker" data-open={(threads?.open ?? 0) > 0}>
                      {(threads?.open ?? 0) > 0 ? <MessageSquare className="h-3 w-3" aria-hidden="true" /> : <CheckCircle2 className="h-3 w-3" aria-hidden="true" />}
                      <span>{total}</span>
                      <span className="cw-visually-hidden">{interpolate(copy.wsBlockComments, { count: total })}</span>
                    </span>
                  ) : canComment ? (
                    <button
                      type="button"
                      className="cw-block__add"
                      data-testid="block-comment-button"
                      aria-label={copy.wsCommentOnBlock}
                      title={copy.wsCommentOnBlock}
                      onClick={() => onSelectBlock(block.blockId)}
                    >
                      <MessageSquarePlus className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}
