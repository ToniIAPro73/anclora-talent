'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Check, Copy as CopyIcon, Loader2, X } from 'lucide-react';
import { inviteCollaboratorAction } from '@/lib/collaboration/actions';
import type { InvitableRole } from '@/lib/collaboration/model';
import { looksLikeEmail } from '@/lib/collaboration/workspace-model';
import type { Copy, ErrorKey } from './shared';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Invitation dialog: email + role (Corrector / Maquetador), sending / error / success states and the copyable link.
 * The server action stays authoritative (role, email validity, author-only); validation here is UX only.
 */
export function InviteDialog({
  copy,
  projectId,
  onClose,
  onInvited,
}: {
  copy: Copy;
  projectId: string;
  onClose: () => void;
  onInvited: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InvitableRole>('editor');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Focus management: move focus in, trap Tab, close on Escape, return focus to the opener on unmount.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    emailRef.current?.focus();
    return () => opener?.focus?.();
  }, []);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const nodes = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter((node) => node.offsetParent !== null || node === document.activeElement);
    if (nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const emailInvalid = touched && !looksLikeEmail(email);

  const submit = () => {
    setTouched(true);
    setError(null);
    if (!looksLikeEmail(email)) return;
    startTransition(async () => {
      const result = await inviteCollaboratorAction({ projectId, email, role });
      if (!result.ok) {
        setError(result.error in copy.errors ? (result.error as ErrorKey) : 'unavailable');
        return;
      }
      setInviteUrl(`${window.location.origin}${result.inviteUrl}`);
      setEmail('');
      setTouched(false);
      onInvited();
    });
  };

  const copyLink = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable: the link stays selectable in the field.
    }
  };

  const roles: Array<{ id: InvitableRole; label: string; hint: string }> = [
    { id: 'editor', label: copy.roleBadges.editor, hint: copy.wsRoleEditorHint },
    { id: 'designer', label: copy.roleBadges.designer, hint: copy.wsRoleDesignerHint },
  ];

  return (
    <div className="cw-dialog__backdrop" data-testid="invite-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div
        ref={dialogRef}
        className="cw-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cw-invite-title"
        data-testid="invite-form"
        onKeyDown={onKeyDown}
      >
        <header className="cw-dialog__header">
          <h2 id="cw-invite-title">{copy.wsInviteDialogTitle}</h2>
          <button type="button" className="cw-icon-button" aria-label={copy.wsInviteDialogClose} data-testid="invite-dialog-close" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="cw-dialog__body">
          <label className="cw-field">
            <span className="cw-field__label">{copy.inviteEmailLabel}</span>
            <input
              ref={emailRef}
              type="email"
              data-testid="invite-email-input"
              className="cw-input"
              placeholder={copy.inviteEmailPlaceholder}
              value={email}
              aria-invalid={emailInvalid}
              aria-describedby={emailInvalid ? 'cw-invite-email-error' : undefined}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setTouched(true)}
              onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); submit(); } }}
            />
            {emailInvalid ? <span id="cw-invite-email-error" className="cw-field__error" role="alert">{copy.wsInviteEmailInvalid}</span> : null}
          </label>

          <fieldset className="cw-field cw-roles" aria-label={copy.inviteRoleLabel}>
            <legend className="cw-field__label">{copy.inviteRoleLabel}</legend>
            {roles.map((item) => (
              <label key={item.id} className="cw-role-option" data-selected={role === item.id}>
                <input type="radio" name="cw-invite-role" value={item.id} checked={role === item.id} onChange={() => setRole(item.id)} data-testid={`invite-role-${item.id}`} />
                <span className="cw-role-option__text">
                  <strong>{item.label}</strong>
                  <span>{item.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {error ? <p role="alert" data-testid="invite-error" className="cw-field__error">{copy.errors[error]}</p> : null}

          {inviteUrl ? (
            <div className="cw-invite-link" data-testid="invite-link-box">
              <p role="status" className="cw-hint">{copy.wsInviteCreated}</p>
              <div className="cw-invite-link__row">
                <input readOnly data-testid="invite-url-input" aria-label={copy.inviteLinkLabel} value={inviteUrl} className="cw-input" onFocus={(event) => event.currentTarget.select()} />
                <button type="button" className="cw-button" data-testid="invite-copy-button" onClick={copyLink}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
                  {copied ? copy.wsLinkCopied : copy.wsCopyLink}
                </button>
              </div>
              <span className="cw-visually-hidden" role="status" aria-live="polite">{copied ? copy.wsLinkCopied : ''}</span>
            </div>
          ) : null}
        </div>

        <footer className="cw-dialog__footer">
          <button type="button" className="cw-button" data-testid="invite-cancel" onClick={onClose}>{copy.wsInviteCancel}</button>
          <button type="button" className="cw-button cw-button--primary" data-testid="invite-submit" disabled={isPending || !email.trim()} onClick={submit}>
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {isPending ? copy.invitingButton : copy.inviteButton}
          </button>
        </footer>
      </div>
    </div>
  );
}
