'use client';

/**
 * "Colaborar" workspace panel — Anclora Talent (F4, entregable 2).
 *
 * Role-driven UI over the server-loaded CollaborationView:
 * - author: invite/revoke/cancel + comment + reply + resolve + decide suggestions;
 * - editor (corrector): comment + reply + propose corrections (never direct edits);
 * - designer (maquetador): comment + reply (design lives in the cover/rules panels).
 * Every write goes through the server actions, which re-check the matrix
 * server-side (R5) — these guards only shape what is rendered.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Loader2, MessageSquare, Shield, UserPlus, Wand2 } from 'lucide-react';
import {
  addBlockCommentAction,
  cancelInvitationAction,
  inviteCollaboratorAction,
  replyBlockCommentAction,
  resolveBlockCommentThreadAction,
  revokeCollaboratorAction,
} from '@/lib/collaboration/actions';
import {
  decideEditorSuggestionAction,
  proposeEditorSuggestionAction,
} from '@/lib/collaboration/suggestion-actions';
import { canPerform } from '@/lib/collaboration/permissions';
import type {
  BlockCommentView,
  CollaboratorRole,
  InvitableRole,
} from '@/lib/collaboration/model';
import type { CollaborationView } from '@/lib/collaboration/view';
import type { AppMessages } from '@/lib/i18n/messages';

type Copy = AppMessages['collaboration'];

type ErrorKey = keyof Copy['errors'];

function interpolate(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, value),
    template,
  );
}

function RoleBadge({ role, copy }: { role: CollaboratorRole; copy: Copy }) {
  return (
    <span
      data-testid={`role-badge-${role}`}
      className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]"
    >
      {copy.roleBadges[role]}
    </span>
  );
}

function formatDate(iso: string, locale: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString(locale);
}

export function CollaborationPanel({
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
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<ErrorKey | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<InvitableRole>('editor');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [proposals, setProposals] = useState<Record<string, { summary: string; text: string } | null>>({});

  const role = view.viewerRole;
  const canManage = canPerform(role, 'manage-collaborators');
  const canComment = canPerform(role, 'comment');
  const canResolve = canPerform(role, 'resolve-comment');
  const canPropose = canPerform(role, 'propose-suggestion');
  const canDecide = canPerform(role, 'decide-suggestion');

  const showError = (key: string | undefined) =>
    setError(key && key in copy.errors ? (key as ErrorKey) : 'unavailable');

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        showError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const handleInvite = () => {
    setError(null);
    startTransition(async () => {
      const result = await inviteCollaboratorAction({
        projectId,
        email: inviteEmail,
        role: inviteRole,
      });
      if (!result.ok) {
        showError(result.error);
        return;
      }
      setInviteUrl(`${window.location.origin}${result.inviteUrl}`);
      setInviteEmail('');
      router.refresh();
    });
  };

  const handleCopyInvite = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable: the link stays visible for manual copy.
    }
  };

  const draftKey = (prefix: string, id: string) => `${prefix}:${id}`;
  const setDraft = (key: string, value: string) =>
    setDrafts((current) => ({ ...current, [key]: value }));

  const renderComment = (comment: BlockCommentView, isReply: boolean) => (
    <div
      key={comment.id}
      data-testid={isReply ? 'comment-reply' : 'comment-root'}
      className={isReply ? 'ml-6 border-l-2 border-[var(--border-subtle)] pl-4' : ''}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-[var(--text-primary)]">{comment.authorName}</span>
        <RoleBadge role={comment.authorRole} copy={copy} />
        <span className="text-[10px] text-[var(--text-tertiary)]">
          {formatDate(comment.createdAt, locale)}
        </span>
      </div>
      <p className="mt-1 whitespace-pre-line text-sm text-[var(--text-secondary)]">{comment.body}</p>
    </div>
  );

  return (
    <div className="space-y-8" data-testid="collaboration-panel">
      <div className="ac-section-heading place-items-center text-center">
        <h3 className="ac-section-heading__title max-w-none text-2xl">{copy.title}</h3>
        <p className="ac-section-heading__summary mt-2 text-sm">{copy.description}</p>
        <div className="mt-3 flex items-center justify-center gap-3">
          <span
            data-testid="open-threads-badge"
            className="ac-button ac-button--ghost ac-button--sm pointer-events-none"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {interpolate(copy.openThreadsBadge, { count: String(view.openThreadCount) })}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
            {copy.viewerRoleLabel}: <RoleBadge role={role} copy={copy} />
          </span>
        </div>
      </div>

      {error && (
        <p role="alert" data-testid="collaboration-error" className="text-center text-sm font-semibold text-red-600">
          {copy.errors[error]}
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          {/* Comments grouped by chapter → block (stable AST anchors) */}
          <section className="ac-surface-panel p-6" data-testid="comments-section">
            <h4 className="mb-4 text-sm font-bold uppercase tracking-widest text-[var(--text-primary)]">
              {copy.commentsTitle}
            </h4>
            {view.commentGroups.length === 0 && (
              <p className="text-sm text-[var(--text-tertiary)]">{copy.emptyComments}</p>
            )}
            <div className="space-y-6">
              {view.commentGroups.map((chapter) => (
                <div key={chapter.chapterIndex} data-testid="comment-chapter-group">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">
                    {chapter.chapterTitle || copy.frontMatterChapter}
                  </p>
                  <div className="space-y-4">
                    {chapter.blocks.map((block) => (
                      <div
                        key={block.blockId}
                        data-testid="comment-block-group"
                        className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-4"
                      >
                        <p className="mb-3 line-clamp-2 text-xs italic text-[var(--text-tertiary)]">
                          {block.blockPreview || block.blockId}
                        </p>
                        <div className="space-y-4">
                          {block.threads.map((thread) => {
                            const replyKey = draftKey('reply', thread.root.id);
                            return (
                              <div key={thread.root.id} data-testid="comment-thread" className="space-y-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                                      thread.root.status === 'open'
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-emerald-100 text-emerald-700'
                                    }`}
                                  >
                                    {thread.root.status === 'open' ? copy.openBadge : copy.resolvedBadge}
                                  </span>
                                  {thread.root.resolvedByName && (
                                    <span className="text-[10px] text-[var(--text-tertiary)]">
                                      {interpolate(copy.resolvedByLabel, { name: thread.root.resolvedByName })}
                                    </span>
                                  )}
                                </div>
                                {renderComment(thread.root, false)}
                                {thread.replies.map((reply) => renderComment(reply, true))}
                                <div className="flex flex-wrap items-center gap-2">
                                  {canComment && thread.root.status === 'open' && (
                                    <>
                                      <input
                                        data-testid="reply-input"
                                        value={drafts[replyKey] ?? ''}
                                        onChange={(event) => setDraft(replyKey, event.target.value)}
                                        placeholder={copy.replyPlaceholder}
                                        className="field-input min-w-0 flex-1"
                                      />
                                      <button
                                        type="button"
                                        data-testid="reply-submit"
                                        disabled={isPending || !(drafts[replyKey] ?? '').trim()}
                                        onClick={() =>
                                          run(async () => {
                                            const result = await replyBlockCommentAction({
                                              projectId,
                                              threadRootId: thread.root.id,
                                              body: drafts[replyKey] ?? '',
                                            });
                                            if (result.ok) setDraft(replyKey, '');
                                            return result;
                                          })
                                        }
                                        className="ac-button ac-button--secondary ac-button--sm"
                                      >
                                        {copy.replyButton}
                                      </button>
                                    </>
                                  )}
                                  {canResolve && thread.root.status === 'open' && (
                                    <button
                                      type="button"
                                      data-testid="resolve-thread-button"
                                      disabled={isPending}
                                      onClick={() =>
                                        run(() =>
                                          resolveBlockCommentThreadAction({
                                            projectId,
                                            threadRootId: thread.root.id,
                                          }),
                                        )
                                      }
                                      className="ac-button ac-button--ghost ac-button--sm"
                                    >
                                      {copy.resolveButton}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {canComment && (
                          <div className="mt-4 flex items-center gap-2 border-t border-[var(--border-subtle)] pt-3">
                            <input
                              data-testid="comment-input"
                              value={drafts[draftKey('new', block.blockId)] ?? ''}
                              onChange={(event) => setDraft(draftKey('new', block.blockId), event.target.value)}
                              placeholder={copy.commentPlaceholder}
                              className="field-input min-w-0 flex-1"
                            />
                            <button
                              type="button"
                              data-testid="comment-submit"
                              disabled={isPending || !(drafts[draftKey('new', block.blockId)] ?? '').trim()}
                              onClick={() =>
                                run(async () => {
                                  const key = draftKey('new', block.blockId);
                                  const result = await addBlockCommentAction({
                                    projectId,
                                    blockId: block.blockId,
                                    body: drafts[key] ?? '',
                                  });
                                  if (result.ok) setDraft(key, '');
                                  return result;
                                })
                              }
                              className="ac-button ac-button--secondary ac-button--sm"
                            >
                              {copy.commentButton}
                            </button>
                          </div>
                        )}
                        {canPropose && (
                          <div className="mt-3" data-testid="propose-area">
                            {proposals[block.blockId] == null ? (
                              <button
                                type="button"
                                data-testid="propose-open-button"
                                onClick={() =>
                                  setProposals((current) => ({
                                    ...current,
                                    [block.blockId]: { summary: '', text: '' },
                                  }))
                                }
                                className="ac-button ac-button--ghost ac-button--sm"
                              >
                                <Wand2 className="h-3.5 w-3.5" />
                                {copy.proposeButton}
                              </button>
                            ) : (
                              <div className="space-y-2 rounded-xl border border-[var(--border-subtle)] p-3">
                                <input
                                  data-testid="propose-summary-input"
                                  value={proposals[block.blockId]?.summary ?? ''}
                                  onChange={(event) =>
                                    setProposals((current) => ({
                                      ...current,
                                      [block.blockId]: {
                                        summary: event.target.value,
                                        text: current[block.blockId]?.text ?? '',
                                      },
                                    }))
                                  }
                                  placeholder={copy.proposeSummaryPlaceholder}
                                  className="field-input"
                                />
                                <textarea
                                  data-testid="propose-text-input"
                                  value={proposals[block.blockId]?.text ?? ''}
                                  onChange={(event) =>
                                    setProposals((current) => ({
                                      ...current,
                                      [block.blockId]: {
                                        summary: current[block.blockId]?.summary ?? '',
                                        text: event.target.value,
                                      },
                                    }))
                                  }
                                  placeholder={copy.proposeTextPlaceholder}
                                  className="field-input min-h-20"
                                />
                                <button
                                  type="button"
                                  data-testid="propose-submit"
                                  disabled={
                                    isPending ||
                                    !(proposals[block.blockId]?.summary ?? '').trim() ||
                                    !(proposals[block.blockId]?.text ?? '').trim()
                                  }
                                  onClick={() =>
                                    run(async () => {
                                      const draft = proposals[block.blockId];
                                      const result = await proposeEditorSuggestionAction({
                                        projectId,
                                        blockId: block.blockId,
                                        summary: draft?.summary ?? '',
                                        replacementText: draft?.text ?? '',
                                      });
                                      if (result.ok) {
                                        setProposals((current) => ({ ...current, [block.blockId]: null }));
                                      }
                                      return result;
                                    })
                                  }
                                  className="ac-button ac-button--primary ac-button--sm"
                                >
                                  {isPending ? copy.proposingButton : copy.proposeSubmitButton}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Editor suggestions — only the author decides */}
          <section className="ac-surface-panel p-6" data-testid="suggestions-section">
            <h4 className="mb-4 text-sm font-bold uppercase tracking-widest text-[var(--text-primary)]">
              {copy.suggestionsTitle}
            </h4>
            {view.suggestions.length === 0 && (
              <p className="text-sm text-[var(--text-tertiary)]">{copy.emptySuggestions}</p>
            )}
            <div className="space-y-3">
              {view.suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  data-testid="suggestion-row"
                  className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        {suggestion.authorName}
                      </span>
                      <span
                        data-testid={`suggestion-status-${suggestion.status}`}
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                          suggestion.status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : suggestion.status === 'accepted'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {copy.suggestionStatusBadges[suggestion.status]}
                      </span>
                    </div>
                    {suggestion.decidedByName && (
                      <span className="text-[10px] text-[var(--text-tertiary)]">
                        {interpolate(copy.decidedByLabel, { name: suggestion.decidedByName })}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{suggestion.summary}</p>
                  {canDecide && suggestion.status === 'pending' && (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        data-testid="suggestion-accept-button"
                        disabled={isPending}
                        onClick={() =>
                          run(() =>
                            decideEditorSuggestionAction({
                              projectId,
                              suggestionId: suggestion.id,
                              decision: 'accept',
                            }),
                          )
                        }
                        className="ac-button ac-button--primary ac-button--sm"
                      >
                        {copy.acceptButton}
                      </button>
                      <button
                        type="button"
                        data-testid="suggestion-reject-button"
                        disabled={isPending}
                        onClick={() =>
                          run(() =>
                            decideEditorSuggestionAction({
                              projectId,
                              suggestionId: suggestion.id,
                              decision: 'reject',
                            }),
                          )
                        }
                        className="ac-button ac-button--secondary ac-button--sm"
                      >
                        {copy.rejectButton}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          {/* Team */}
          <section className="ac-surface-panel p-6" data-testid="team-section">
            <h4 className="mb-4 text-sm font-bold uppercase tracking-widest text-[var(--text-primary)]">
              {copy.teamTitle}
            </h4>
            {view.collaborators.length === 0 && (
              <p className="text-xs leading-5 text-[var(--text-tertiary)]">{copy.emptyTeam}</p>
            )}
            <div className="divide-y divide-[var(--border-subtle)]">
              {view.collaborators.map((member) => (
                <div key={member.id} data-testid="collaborator-row" className="flex items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[var(--text-primary)]">{member.fullName}</p>
                    <p className="truncate text-xs text-[var(--text-tertiary)]">{member.email}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <RoleBadge role={member.role} copy={copy} />
                    {canManage && (
                      <button
                        type="button"
                        data-testid="revoke-button"
                        disabled={isPending}
                        onClick={() =>
                          run(() => revokeCollaboratorAction({ projectId, collaboratorId: member.id }))
                        }
                        className="ac-button ac-button--ghost ac-button--sm"
                      >
                        {copy.revokeButton}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Pending invitations (author only) */}
          {canManage && view.invitations.length > 0 && (
            <section className="ac-surface-panel p-6" data-testid="invitations-section">
              <h4 className="mb-4 text-sm font-bold uppercase tracking-widest text-[var(--text-primary)]">
                {copy.pendingInvitationsTitle}
              </h4>
              <div className="divide-y divide-[var(--border-subtle)]">
                {view.invitations.map((invitation) => (
                  <div key={invitation.id} data-testid="invitation-row" className="flex items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[var(--text-primary)]">{invitation.email}</p>
                      <p className="text-[10px] text-[var(--text-tertiary)]">
                        {interpolate(copy.invitationExpiresLabel, {
                          date: formatDate(invitation.expiresAt, locale),
                        })}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <RoleBadge role={invitation.role} copy={copy} />
                      <button
                        type="button"
                        data-testid="cancel-invitation-button"
                        disabled={isPending}
                        onClick={() =>
                          run(() => cancelInvitationAction({ projectId, invitationId: invitation.id }))
                        }
                        className="ac-button ac-button--ghost ac-button--sm"
                      >
                        {copy.cancelInvitationButton}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Invite (author only) */}
          {canManage && (
            <div className="ac-surface-panel ac-surface-panel--subtle p-6" data-testid="invite-form">
              <UserPlus className="mb-4 h-6 w-6 text-[var(--accent)]" />
              <h4 className="text-sm font-bold text-[var(--text-primary)]">{copy.inviteTitle}</h4>
              <p className="mt-2 text-xs leading-5 text-[var(--text-tertiary)]">{copy.inviteDescription}</p>
              <div className="mt-4 space-y-3">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">{copy.inviteEmailLabel}</span>
                  <input
                    type="email"
                    data-testid="invite-email-input"
                    placeholder={copy.inviteEmailPlaceholder}
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    className="field-input"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">{copy.inviteRoleLabel}</span>
                  <select
                    data-testid="invite-role-select"
                    value={inviteRole}
                    onChange={(event) => setInviteRole(event.target.value as InvitableRole)}
                    className="field-input"
                  >
                    <option value="editor">{copy.roleBadges.editor}</option>
                    <option value="designer">{copy.roleBadges.designer}</option>
                  </select>
                </label>
                <button
                  type="button"
                  data-testid="invite-submit"
                  disabled={isPending || !inviteEmail.trim()}
                  onClick={handleInvite}
                  className="ac-button ac-button--primary w-full"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isPending ? copy.invitingButton : copy.inviteButton}
                </button>
                {inviteUrl && (
                  <div className="space-y-2" data-testid="invite-link-box">
                    <p className="text-[10px] font-semibold text-[var(--text-tertiary)]">
                      {copy.inviteLinkLabel}
                    </p>
                    <div className="flex items-center gap-2">
                      <input readOnly data-testid="invite-url-input" value={inviteUrl} className="field-input min-w-0 flex-1 text-xs" />
                      <button
                        type="button"
                        data-testid="invite-copy-button"
                        onClick={handleCopyInvite}
                        className="ac-button ac-button--secondary ac-button--sm"
                      >
                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? copy.copiedBadge : copy.copyButton}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="ac-empty-state min-h-0 p-6">
            <Shield className="mb-3 h-5 w-5 text-[var(--text-muted)]" />
            <p className="text-[10px] leading-4 text-[var(--text-muted)]">{copy.noSeatTollNote}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
