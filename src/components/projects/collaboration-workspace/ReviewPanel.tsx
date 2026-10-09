'use client';

import { useState } from 'react';
import { Check, CheckCircle2, CircleDot, Loader2, Send, Wand2, X, AlertTriangle } from 'lucide-react';
import type { ThreadEntry } from '@/lib/collaboration/workspace-model';
import type { BlockCommentView, EditorSuggestionView, OutlineBlockView } from '@/lib/collaboration/model';
import { filterSuggestions, relativeTime, type RoleCapabilities, type SuggestionFilter, type ThreadStatusFilter } from '@/lib/collaboration/workspace-model';
import { Avatar, RoleChip, interpolate, type Copy } from './shared';

export type ReviewTab = 'comments' | 'suggestions';

export interface ReviewHandlers {
  onAddComment: (blockId: string, body: string) => Promise<boolean>;
  onReply: (threadRootId: string, body: string) => Promise<boolean>;
  onResolve: (threadRootId: string) => void;
  onPropose: (blockId: string, summary: string, text: string) => Promise<boolean>;
  onDecide: (suggestionId: string, decision: 'accept' | 'reject') => void;
  onViewInChapter: (blockId: string, chapterIndex: number) => void;
}

function CommentBody({ comment, copy, locale, nested }: { comment: BlockCommentView; copy: Copy; locale: string; nested?: boolean }) {
  return (
    <div className={nested ? 'cw-comment cw-comment--reply' : 'cw-comment'} data-testid={nested ? 'comment-reply' : 'comment-root'}>
      <Avatar name={comment.authorName} size="sm" />
      <div className="cw-comment__main">
        <div className="cw-comment__meta">
          <strong>{comment.authorName}</strong>
          <RoleChip role={comment.authorRole} copy={copy} />
          <time dateTime={comment.createdAt} title={new Date(comment.createdAt).toLocaleString(locale)}>{relativeTime(comment.createdAt, locale)}</time>
        </div>
        <p className="cw-comment__body">{comment.body}</p>
      </div>
    </div>
  );
}

function Composer({
  placeholder,
  submitLabel,
  busy,
  testPrefix,
  onSubmit,
  compact,
}: {
  placeholder: string;
  submitLabel: string;
  busy: boolean;
  testPrefix: 'comment' | 'reply';
  onSubmit: (body: string) => Promise<boolean>;
  compact?: boolean;
}) {
  const [draft, setDraft] = useState('');
  const submit = async () => {
    if (!draft.trim()) return;
    if (await onSubmit(draft)) setDraft('');
  };
  return (
    <div className={compact ? 'cw-composer cw-composer--compact' : 'cw-composer'}>
      <textarea
        data-testid={`${testPrefix}-input`}
        className="cw-textarea"
        rows={compact ? 1 : 2}
        placeholder={placeholder}
        aria-label={placeholder}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') void submit(); }}
      />
      <button type="button" className="cw-button cw-button--primary" data-testid={`${testPrefix}-submit`} disabled={busy || !draft.trim()} onClick={() => void submit()}>
        <Send className="h-3.5 w-3.5" />
        <span>{submitLabel}</span>
      </button>
    </div>
  );
}

function ThreadCard({
  entry,
  copy,
  locale,
  caps,
  busy,
  handlers,
  showContext,
}: {
  entry: ThreadEntry;
  copy: Copy;
  locale: string;
  caps: RoleCapabilities;
  busy: boolean;
  handlers: ReviewHandlers;
  showContext: boolean;
}) {
  const { thread } = entry;
  const open = thread.root.status === 'open';
  return (
    <article className="cw-thread" data-testid="comment-thread" data-status={thread.root.status} data-block-id={entry.blockId}>
      <header className="cw-thread__header">
        <span className="cw-status" data-status={thread.root.status} data-testid={`thread-status-${thread.root.status}`}>
          {open ? <CircleDot className="h-3 w-3" aria-hidden="true" /> : <CheckCircle2 className="h-3 w-3" aria-hidden="true" />}
          {open ? copy.wsStatusOpen : copy.wsResolved}
        </span>
        {thread.replies.length > 0 ? <span className="cw-thread__count">{interpolate(copy.wsReplyCount, { count: thread.replies.length })}</span> : null}
        {thread.root.resolvedByName ? <span className="cw-thread__count">{interpolate(copy.resolvedByLabel, { name: thread.root.resolvedByName })}</span> : null}
      </header>
      {showContext && entry.blockPreview ? (
        <blockquote className="cw-excerpt" data-testid="thread-excerpt">
          {entry.blockPreview}
        </blockquote>
      ) : null}
      <CommentBody comment={thread.root} copy={copy} locale={locale} />
      {thread.replies.map((reply) => <CommentBody key={reply.id} comment={reply} copy={copy} locale={locale} nested />)}
      <div className="cw-thread__actions">
        {caps.comment && open ? (
          <Composer compact placeholder={copy.replyPlaceholder} submitLabel={copy.wsReply} busy={busy} testPrefix="reply" onSubmit={(body) => handlers.onReply(thread.root.id, body)} />
        ) : null}
        <div className="cw-thread__buttons">
          {showContext ? (
            <button type="button" className="cw-link" data-testid="view-in-chapter" onClick={() => handlers.onViewInChapter(entry.blockId, entry.chapterIndex)}>
              {copy.wsViewInChapter}
            </button>
          ) : null}
          {caps.resolve && open ? (
            <button type="button" className="cw-button" data-testid="resolve-thread-button" disabled={busy} onClick={() => handlers.onResolve(thread.root.id)}>
              <Check className="h-3.5 w-3.5" />
              {copy.resolveButton}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function SuggestionCard({
  suggestion,
  copy,
  locale,
  caps,
  busy,
  handlers,
  firstBlockId,
}: {
  suggestion: EditorSuggestionView;
  copy: Copy;
  locale: string;
  caps: RoleCapabilities;
  busy: boolean;
  handlers: ReviewHandlers;
  firstBlockId: string | undefined;
}) {
  const pending = suggestion.status === 'pending';
  return (
    <article className="cw-suggestion" data-testid="suggestion-row" data-status={suggestion.status} data-stale={suggestion.stale ? 'true' : 'false'}>
      <header className="cw-thread__header">
        <Avatar name={suggestion.authorName} size="sm" />
        <strong className="cw-suggestion__author">{suggestion.authorName}</strong>
        {suggestion.authorRole ? <RoleChip role={suggestion.authorRole} copy={copy} /> : null}
        <time className="cw-thread__count" dateTime={suggestion.createdAt}>{relativeTime(suggestion.createdAt, locale)}</time>
        <span className="cw-status" data-status={suggestion.status} data-testid={`suggestion-status-${suggestion.status}`}>
          {suggestion.status === 'accepted' ? <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> : suggestion.status === 'rejected' ? <X className="h-3 w-3" aria-hidden="true" /> : <CircleDot className="h-3 w-3" aria-hidden="true" />}
          {copy.suggestionStatusBadges[suggestion.status]}
        </span>
      </header>
      <p className="cw-suggestion__summary">{suggestion.summary}</p>
      {suggestion.chapterTitle !== undefined ? (
        <p className="cw-hint">{interpolate(copy.wsSuggestionIn, { chapter: suggestion.chapterTitle || copy.frontMatterChapter })}</p>
      ) : null}
      {(suggestion.changes ?? []).length > 0 ? (
        <div className="cw-diff" data-testid="suggestion-diff">
          {(suggestion.changes ?? []).map((change, index) => (
            <div key={`${change.blockId}-${index}`} className="cw-diff__pair">
              {change.before !== null ? (
                <div className="cw-diff__side cw-diff__side--before">
                  <span className="cw-diff__label">{copy.wsBefore}</span>
                  <p data-testid="diff-before">{change.before}</p>
                </div>
              ) : null}
              {change.after !== null ? (
                <div className="cw-diff__side cw-diff__side--after">
                  <span className="cw-diff__label">{copy.wsAfter}</span>
                  <p data-testid="diff-after">{change.after}</p>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="cw-hint">{copy.wsNoChangeDetail}</p>
      )}
      {pending && suggestion.stale ? (
        <p className="cw-stale" role="alert" data-testid="suggestion-stale">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          {copy.wsStaleNotice}
        </p>
      ) : null}
      {suggestion.decidedByName ? <p className="cw-hint">{interpolate(copy.decidedByLabel, { name: suggestion.decidedByName })}</p> : null}
      <div className="cw-thread__buttons">
        {firstBlockId ? (
          <button type="button" className="cw-link" data-testid="suggestion-view-in-chapter" onClick={() => handlers.onViewInChapter(firstBlockId, suggestion.chapterIndex ?? -1)}>
            {copy.wsViewInChapter}
          </button>
        ) : null}
        {caps.decide && pending ? (
          <>
            <button type="button" className="cw-button" data-testid="suggestion-reject-button" disabled={busy} onClick={() => handlers.onDecide(suggestion.id, 'reject')}>
              {copy.rejectButton}
            </button>
            <button type="button" className="cw-button cw-button--primary" data-testid="suggestion-accept-button" disabled={busy || suggestion.stale} onClick={() => handlers.onDecide(suggestion.id, 'accept')}>
              {copy.acceptButton}
            </button>
          </>
        ) : null}
      </div>
    </article>
  );
}

function ProposeForm({ copy, busy, block, onSubmit, onCancel }: { copy: Copy; busy: boolean; block: OutlineBlockView; onSubmit: (summary: string, text: string) => Promise<boolean>; onCancel: () => void }) {
  const [summary, setSummary] = useState('');
  const [text, setText] = useState(block.text);
  return (
    <div className="cw-propose" data-testid="propose-area">
      <input data-testid="propose-summary-input" className="cw-input" placeholder={copy.proposeSummaryPlaceholder} aria-label={copy.proposeSummaryPlaceholder} value={summary} onChange={(event) => setSummary(event.target.value)} />
      <textarea data-testid="propose-text-input" className="cw-textarea" rows={4} placeholder={copy.proposeTextPlaceholder} aria-label={copy.proposeTextPlaceholder} value={text} onChange={(event) => setText(event.target.value)} />
      <div className="cw-thread__buttons">
        <button type="button" className="cw-button" data-testid="propose-cancel" onClick={onCancel}>{copy.wsProposeCancel}</button>
        <button
          type="button"
          className="cw-button cw-button--primary"
          data-testid="propose-submit"
          disabled={busy || !summary.trim() || !text.trim() || text.trim() === block.text.trim()}
          onClick={async () => { if (await onSubmit(summary, text)) onCancel(); }}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
          {busy ? copy.proposingButton : copy.proposeSubmitButton}
        </button>
      </div>
    </div>
  );
}

export function ReviewPanel({
  copy,
  locale,
  caps,
  busy,
  tab,
  onTabChange,
  statusFilter,
  onStatusFilterChange,
  suggestionFilter,
  onSuggestionFilterChange,
  entries,
  suggestions,
  blockAnchoring,
  selectedBlock,
  onClearBlock,
  pendingCount,
  handlers,
}: {
  copy: Copy;
  locale: string;
  caps: RoleCapabilities;
  busy: boolean;
  tab: ReviewTab;
  onTabChange: (tab: ReviewTab) => void;
  statusFilter: ThreadStatusFilter;
  onStatusFilterChange: (status: ThreadStatusFilter) => void;
  suggestionFilter: SuggestionFilter;
  onSuggestionFilterChange: (filter: SuggestionFilter) => void;
  entries: ThreadEntry[];
  suggestions: EditorSuggestionView[];
  blockAnchoring: boolean;
  selectedBlock: OutlineBlockView | null;
  onClearBlock: () => void;
  pendingCount: number;
  handlers: ReviewHandlers;
}) {
  const [proposing, setProposing] = useState<string | null>(null);
  const visibleSuggestions = filterSuggestions(suggestions, suggestionFilter);
  const tabs: Array<{ id: ReviewTab; label: string; count: number }> = [
    { id: 'comments', label: copy.wsTabComments, count: entries.length },
    { id: 'suggestions', label: copy.wsTabSuggestions, count: pendingCount },
  ];

  const emptyComments = statusFilter === 'open' ? copy.wsNoOpenComments : statusFilter === 'resolved' ? copy.wsNoResolvedComments : copy.wsNoComments;

  return (
    <div className="cw-review" data-testid="review-panel">
      <div className="cw-tabs" role="tablist" aria-label={copy.wsReviewTabs}>
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`cw-tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={`cw-tabpanel-${item.id}`}
            tabIndex={tab === item.id ? 0 : -1}
            className="cw-tab"
            data-testid={`tab-${item.id}`}
            onClick={() => onTabChange(item.id)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                event.preventDefault();
                const next = item.id === 'comments' ? 'suggestions' : 'comments';
                onTabChange(next);
                document.getElementById(`cw-tab-${next}`)?.focus();
              }
            }}
          >
            {item.label}
            <span className="cw-tab__count" aria-hidden="true">{item.count}</span>
          </button>
        ))}
      </div>

      {tab === 'comments' ? (
        <div role="tabpanel" id="cw-tabpanel-comments" aria-labelledby="cw-tab-comments" className="cw-review__body" data-testid="comments-section">
          {!blockAnchoring ? (
            <p className="cw-notice" data-testid="fixed-pdf-notice">{copy.wsFixedPdfNotice}</p>
          ) : (
            <>
              <div className="cw-filters" role="group" aria-label={copy.commentsTitle}>
                {(['all', 'open', 'resolved'] as const).map((status) => (
                  <button key={status} type="button" className="cw-chip" data-testid={`filter-${status}`} aria-pressed={statusFilter === status} onClick={() => onStatusFilterChange(status)}>
                    {status === 'all' ? copy.wsFilterAll : status === 'open' ? copy.wsFilterOpen : copy.wsFilterResolved}
                  </button>
                ))}
              </div>

              {selectedBlock ? (
                <section className="cw-selected" data-testid="selected-block" aria-label={copy.wsBlockThreadsHeading}>
                  <header className="cw-thread__header">
                    <h3 className="cw-subtitle">{copy.wsBlockThreadsHeading}</h3>
                    <button type="button" className="cw-icon-button" aria-label={copy.wsCloseBlock} title={copy.wsCloseBlock} data-testid="clear-block" onClick={onClearBlock}>
                      <X className="h-4 w-4" />
                    </button>
                  </header>
                  <blockquote className="cw-excerpt cw-excerpt--full">{selectedBlock.text}</blockquote>
                  {caps.comment ? (
                    <Composer placeholder={copy.wsNewCommentPlaceholder} submitLabel={copy.wsSendComment} busy={busy} testPrefix="comment" onSubmit={(body) => handlers.onAddComment(selectedBlock.blockId, body)} />
                  ) : null}
                  {caps.propose ? (
                    proposing === selectedBlock.blockId ? (
                      <ProposeForm copy={copy} busy={busy} block={selectedBlock} onCancel={() => setProposing(null)} onSubmit={(summary, text) => handlers.onPropose(selectedBlock.blockId, summary, text)} />
                    ) : (
                      <button type="button" className="cw-button" data-testid="propose-open-button" onClick={() => setProposing(selectedBlock.blockId)}>
                        <Wand2 className="h-3.5 w-3.5" />
                        {copy.wsProposeCorrection}
                      </button>
                    )
                  ) : null}
                </section>
              ) : null}

              {entries.length === 0 ? (
                <p className="cw-empty-line" data-testid="comments-empty">{emptyComments}</p>
              ) : (
                <div className="cw-threads">
                  {entries.map((entry) => (
                    <ThreadCard key={entry.thread.root.id} entry={entry} copy={copy} locale={locale} caps={caps} busy={busy} handlers={handlers} showContext={!selectedBlock} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div role="tabpanel" id="cw-tabpanel-suggestions" aria-labelledby="cw-tab-suggestions" className="cw-review__body" data-testid="suggestions-section">
          {!blockAnchoring ? (
            <p className="cw-notice" data-testid="fixed-pdf-notice">{copy.wsFixedPdfNotice}</p>
          ) : (
            <>
              <div className="cw-filters" role="group" aria-label={copy.suggestionsTitle}>
                {(['pending', 'decided', 'all'] as const).map((filter) => (
                  <button key={filter} type="button" className="cw-chip" data-testid={`suggestion-filter-${filter}`} aria-pressed={suggestionFilter === filter} onClick={() => onSuggestionFilterChange(filter)}>
                    {filter === 'pending' ? copy.wsFilterPending : filter === 'decided' ? copy.wsFilterDecided : copy.wsFilterAll}
                  </button>
                ))}
              </div>
              {visibleSuggestions.length === 0 ? (
                <p className="cw-empty-line" data-testid="suggestions-empty">{suggestionFilter === 'pending' ? copy.wsNoPendingSuggestions : copy.wsNoSuggestions}</p>
              ) : (
                <div className="cw-threads">
                  {visibleSuggestions.map((suggestion) => (
                    <SuggestionCard key={suggestion.id} suggestion={suggestion} copy={copy} locale={locale} caps={caps} busy={busy} handlers={handlers} firstBlockId={suggestion.changes?.[0]?.blockId ?? suggestion.affectedBlockIds[0]} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}


