'use client';

/**
 * Step 6 — "Colaborar". Review workspace over the server-loaded `CollaborationView`:
 *   Equipo (left) · chapter reader with stable block anchors (center) · Comentarios | Sugerencias (right).
 *
 * Reuses the existing engine: server actions (which re-check the permission matrix — R5), AST block anchors,
 * the suggestion pipeline and `router.refresh()`. The role guards here only decide what is rendered; they are
 * not authorization.
 */

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import {
  addBlockCommentAction,
  cancelInvitationAction,
  replyBlockCommentAction,
  resolveBlockCommentThreadAction,
  revokeCollaboratorAction,
} from '@/lib/collaboration/actions';
import { decideEditorSuggestionAction, proposeEditorSuggestionAction } from '@/lib/collaboration/suggestion-actions';
import type { OutlineBlockView } from '@/lib/collaboration/model';
import type { CollaborationView } from '@/lib/collaboration/view';
import {
  chapterOptions,
  listThreadEntries,
  pendingSuggestionCount,
  roleCapabilities,
  threadCounts,
  type ChapterFilter,
  type SuggestionFilter,
  type ThreadStatusFilter,
} from '@/lib/collaboration/workspace-model';
import { ChapterReader } from './ChapterReader';
import { InviteDialog } from './InviteDialog';
import { ReviewPanel, type ReviewHandlers, type ReviewTab } from './ReviewPanel';
import { RoleChip, plural, type Copy, type ErrorKey } from './shared';
import { TeamPanel } from './TeamPanel';

function initialChapter(view: CollaborationView): ChapterFilter {
  const withOpen = view.commentGroups.find((group) =>
    group.blocks.some((block) => block.threads.some((thread) => thread.root.status === 'open')),
  );
  if (withOpen && view.outline.some((chapter) => chapter.index === withOpen.chapterIndex)) return withOpen.chapterIndex;
  return view.outline[0]?.index ?? 'all';
}

export function CollaborationWorkspace({
  copy,
  projectId,
  view,
  locale = 'es',
}: {
  copy: Copy;
  projectId: string;
  view: CollaborationView;
  locale?: 'es' | 'en';
}) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);

  const [tab, setTab] = useState<ReviewTab>('comments');
  const [chapter, setChapter] = useState<ChapterFilter>(() => initialChapter(view));
  const [statusFilter, setStatusFilter] = useState<ThreadStatusFilter>('open');
  const [suggestionFilter, setSuggestionFilter] = useState<SuggestionFilter>('pending');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [scrollTo, setScrollTo] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);

  const caps = roleCapabilities(view.viewerRole);
  const busy = acting || isRefreshing;
  const pendingCount = pendingSuggestionCount(view.suggestions);
  const totals = threadCounts(view.commentGroups);

  const run = async (action: () => Promise<{ ok: boolean; error?: string }>): Promise<boolean> => {
    setError(null);
    setActing(true);
    try {
      const result = await action();
      if (!result.ok) {
        setError(result.error && result.error in copy.errors ? (result.error as ErrorKey) : 'unavailable');
        return false;
      }
      startRefresh(() => router.refresh());
      return true;
    } finally {
      setActing(false);
    }
  };

  const selectedBlock = useMemo<OutlineBlockView | null>(() => {
    if (!selectedBlockId) return null;
    for (const item of view.outline) {
      const found = item.blocks.find((block) => block.blockId === selectedBlockId);
      if (found) return found;
    }
    for (const group of view.commentGroups) {
      const found = group.blocks.find((block) => block.blockId === selectedBlockId);
      if (found) return { blockId: found.blockId, kind: 'paragraph', text: found.blockPreview };
    }
    return null;
  }, [selectedBlockId, view.commentGroups, view.outline]);

  const entries = useMemo(
    () => listThreadEntries(view.commentGroups, {
      chapter: selectedBlock ? 'all' : chapter,
      status: statusFilter,
      blockId: selectedBlock?.blockId ?? null,
    }),
    [chapter, selectedBlock, statusFilter, view.commentGroups],
  );

  const handlers: ReviewHandlers = {
    onAddComment: (blockId, body) => run(() => addBlockCommentAction({ projectId, blockId, body })),
    onReply: (threadRootId, body) => run(() => replyBlockCommentAction({ projectId, threadRootId, body })),
    onResolve: (threadRootId) => void run(() => resolveBlockCommentThreadAction({ projectId, threadRootId })),
    onPropose: (blockId, summary, text) => run(() => proposeEditorSuggestionAction({ projectId, blockId, summary, replacementText: text })),
    onDecide: (suggestionId, decision) => void run(() => decideEditorSuggestionAction({ projectId, suggestionId, decision })),
    onViewInChapter: (blockId, chapterIndex) => {
      const known = chapterOptions(view.outline, view.commentGroups).some((option) => option.index === chapterIndex);
      setChapter(known ? chapterIndex : 'all');
      setSelectedBlockId(blockId);
      setTab('comments');
      setScrollTo(blockId);
    },
  };

  const capability = view.viewerRole === 'author' ? copy.wsCapabilityAuthor : view.viewerRole === 'editor' ? copy.wsCapabilityEditor : copy.wsCapabilityDesigner;

  return (
    <div className="cw" data-testid="collaboration-panel" data-viewer-role={view.viewerRole} data-team-open={teamOpen}>
      <header className="cw-header" aria-label={copy.wsSummaryLabel}>
        <div className="cw-header__title">
          <h2>{copy.title}</h2>
          <p className="cw-capability" data-testid="viewer-capability">
            <span>{copy.wsYourRole}:</span> <RoleChip role={view.viewerRole} copy={copy} /> <span className="cw-capability__text">{capability}</span>
          </p>
        </div>
        <ul className="cw-stats">
          <li className="cw-stat" data-testid="stat-members">{plural(1 + view.collaborators.length, copy.wsMembersOne, copy.wsMembers)}</li>
          <li className="cw-stat" data-testid="open-threads-badge">{plural(totals.open, copy.wsOpenThreadsOne, copy.openThreadsBadge)}</li>
          {caps.decide || caps.propose || pendingCount > 0 ? (
            <li className="cw-stat" data-testid="stat-suggestions">{plural(pendingCount, copy.wsPendingSuggestionsOne, copy.wsPendingSuggestions)}</li>
          ) : null}
        </ul>
        <button type="button" className="cw-button cw-header__toggle" data-testid="team-toggle" aria-expanded={teamOpen} aria-controls="cw-team-column" onClick={() => setTeamOpen((value) => !value)}>
          <Users className="h-3.5 w-3.5" />
          {copy.wsTeamTitle}
        </button>
      </header>

      {error ? (
        <p role="alert" data-testid="collaboration-error" className="cw-error">
          {copy.errors[error]}
        </p>
      ) : null}

      <div className="cw-grid">
        <aside className="cw-col cw-col--team" id="cw-team-column" aria-label={copy.wsTeamTitle}>
          <TeamPanel
            copy={copy}
            locale={locale}
            owner={view.owner}
            collaborators={view.collaborators}
            invitations={view.invitations}
            canManage={caps.manage}
            busy={busy}
            onInvite={() => setInviteOpen(true)}
            onRevoke={(collaboratorId) => void run(() => revokeCollaboratorAction({ projectId, collaboratorId }))}
            onCancelInvitation={(invitationId) => void run(() => cancelInvitationAction({ projectId, invitationId }))}
          />
        </aside>

        <section className="cw-col cw-col--reader" aria-label={copy.wsReaderLabel}>
          {view.blockAnchoring ? (
            <ChapterReader
              copy={copy}
              outline={view.outline}
              groups={view.commentGroups}
              chapter={chapter}
              onChapterChange={(next) => { setChapter(next); setSelectedBlockId(null); }}
              selectedBlockId={selectedBlockId}
              onSelectBlock={(blockId) => { setSelectedBlockId(blockId); setTab('comments'); setScrollTo(null); }}
              canComment={caps.comment}
              scrollToBlockId={scrollTo}
            />
          ) : (
            <p className="cw-notice" data-testid="fixed-pdf-notice-reader">{copy.wsFixedPdfNotice}</p>
          )}
        </section>

        <section className="cw-col cw-col--review" aria-label={copy.wsReviewTabs}>
          {caps.decide && pendingCount > 0 ? (
            <button
              type="button"
              className="cw-decision"
              data-testid="decision-queue"
              onClick={() => { setTab('suggestions'); setSuggestionFilter('pending'); }}
            >
              <strong>{copy.wsDecisionQueue}</strong>
              <span>{pendingCount}</span>
            </button>
          ) : null}
          <ReviewPanel
            copy={copy}
            locale={locale}
            caps={caps}
            busy={busy}
            tab={tab}
            onTabChange={setTab}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            suggestionFilter={suggestionFilter}
            onSuggestionFilterChange={setSuggestionFilter}
            entries={entries}
            suggestions={view.suggestions}
            blockAnchoring={view.blockAnchoring}
            selectedBlock={selectedBlock}
            onClearBlock={() => setSelectedBlockId(null)}
            pendingCount={pendingCount}
            handlers={handlers}
          />
        </section>
      </div>

      {inviteOpen && caps.manage ? (
        <InviteDialog
          copy={copy}
          projectId={projectId}
          onClose={() => setInviteOpen(false)}
          onInvited={() => startRefresh(() => router.refresh())}
        />
      ) : null}
    </div>
  );
}
