'use client';

import { useEffect, useRef, useState } from 'react';
import { MoreVertical, UserPlus, X } from 'lucide-react';
import type { CollaboratorSummary, InvitationSummary, OwnerSummary } from '@/lib/collaboration/model';
import { Avatar, RoleChip, formatDate, interpolate, plural, type Copy } from './shared';

/**
 * "Equipo": owner + collaborators with initials, a compact role chip and — for the author only — a row menu with
 * the revoke action, plus the pending invitations. Visibility of management controls mirrors the server matrix;
 * the actions themselves are re-checked on the server.
 */
export function TeamPanel({
  copy,
  locale,
  owner,
  collaborators,
  invitations,
  canManage,
  busy,
  onInvite,
  onRevoke,
  onCancelInvitation,
}: {
  copy: Copy;
  locale: string;
  owner: OwnerSummary;
  collaborators: CollaboratorSummary[];
  invitations: InvitationSummary[];
  canManage: boolean;
  busy: boolean;
  onInvite: () => void;
  onRevoke: (collaboratorId: string) => void;
  onCancelInvitation: (invitationId: string) => void;
}) {
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuFor) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuFor(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuFor]);

  const alone = collaborators.length === 0 && invitations.length === 0;
  const members = 1 + collaborators.length;

  return (
    <div className="cw-team" data-testid="team-section">
      <header className="cw-panel-header">
        <div>
          <h2 className="cw-panel-title">{copy.wsTeamTitle}</h2>
          <p className="cw-panel-meta" data-testid="team-count">{plural(members, copy.wsMembersOne, copy.wsMembers)}</p>
        </div>
        {canManage ? (
          <button type="button" className="cw-button cw-button--accent" data-testid="invite-open-button" onClick={onInvite}>
            <UserPlus className="h-3.5 w-3.5" />
            <span>{copy.wsInviteCta}</span>
          </button>
        ) : null}
      </header>

      <ul className="cw-members" aria-label={copy.wsTeamTitle}>
        <li className="cw-member" data-testid="collaborator-row" data-member-role="author">
          <Avatar name={owner.fullName || owner.email} />
          <div className="cw-member__text">
            <span className="cw-member__name">{owner.fullName || owner.email}</span>
            {owner.fullName ? <span className="cw-member__email">{owner.email}</span> : null}
          </div>
          <RoleChip role="author" copy={copy} />
        </li>
        {collaborators.map((member) => (
          <li key={member.id} className="cw-member" data-testid="collaborator-row" data-member-role={member.role}>
            <Avatar name={member.fullName || member.email} />
            <div className="cw-member__text">
              <span className="cw-member__name">{member.fullName || member.email}</span>
              <span className="cw-member__email">{member.email}</span>
            </div>
            <RoleChip role={member.role} copy={copy} />
            {canManage ? (
              <div className="cw-menu" ref={menuFor === member.id ? menuRef : undefined}>
                <button
                  type="button"
                  className="cw-icon-button"
                  data-testid="member-menu-button"
                  aria-haspopup="menu"
                  aria-expanded={menuFor === member.id}
                  aria-label={interpolate(copy.wsMemberMenu, { name: member.fullName || member.email })}
                  onClick={() => setMenuFor((current) => (current === member.id ? null : member.id))}
                  onKeyDown={(event) => { if (event.key === 'Escape') setMenuFor(null); }}
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {menuFor === member.id ? (
                  <div className="cw-menu__list" role="menu">
                    <button
                      type="button"
                      role="menuitem"
                      className="cw-menu__item cw-menu__item--danger"
                      data-testid="revoke-button"
                      disabled={busy}
                      autoFocus
                      onKeyDown={(event) => { if (event.key === 'Escape') setMenuFor(null); }}
                      onClick={() => { setMenuFor(null); onRevoke(member.id); }}
                    >
                      {copy.revokeButton}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {alone ? (
        <div className="cw-empty" data-testid="team-empty">
          <p>{copy.wsSoloTeam}</p>
          {canManage ? (
            <button type="button" className="cw-button cw-button--accent" data-testid="invite-open-empty" onClick={onInvite}>
              <UserPlus className="h-3.5 w-3.5" />
              {copy.wsInviteCta}
            </button>
          ) : null}
        </div>
      ) : null}

      {canManage && invitations.length > 0 ? (
        <section className="cw-invitations" data-testid="invitations-section" aria-labelledby="cw-invitations-title">
          <h3 id="cw-invitations-title" className="cw-subtitle">{copy.pendingInvitationsTitle}</h3>
          <ul className="cw-members">
            {invitations.map((invitation) => (
              <li key={invitation.id} className="cw-member cw-member--invitation" data-testid="invitation-row">
                <div className="cw-member__text">
                  <span className="cw-member__name" title={invitation.email}>{invitation.email}</span>
                  <span className="cw-member__meta">
                    <RoleChip role={invitation.role} copy={copy} />
                    <span className="cw-member__email">{interpolate(copy.invitationExpiresLabel, { date: formatDate(invitation.expiresAt, locale) })}</span>
                  </span>
                </div>
                <button
                  type="button"
                  className="cw-icon-button"
                  data-testid="cancel-invitation-button"
                  aria-label={`${copy.cancelInvitationButton}: ${invitation.email}`}
                  title={copy.cancelInvitationButton}
                  disabled={busy}
                  onClick={() => onCancelInvitation(invitation.id)}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
