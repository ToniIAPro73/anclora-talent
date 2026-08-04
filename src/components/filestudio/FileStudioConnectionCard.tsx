'use client';

import { useState } from 'react';
import type { AppMessages } from '@/lib/i18n/messages';
import type { PairingStatus } from '@/lib/filestudio/pairing';
import type { ProcessingMode } from '@/lib/filestudio/client';
import { ProcessingModeBadge } from './ProcessingModeBadge';

type Copy = AppMessages['filestudio'];

export interface FileStudioConnectionState {
  status: PairingStatus;
  deviceId: string | null;
  preferredMode: ProcessingMode;
}

/**
 * FileStudio connection card (dashboard settings section): connection
 * status, "pair local agent" form (request id + 6-digit code shown by the
 * Local Agent) and the processing mode indicator.
 */
export function FileStudioConnectionCard({
  copy,
  initialConnection,
}: {
  copy: Copy;
  initialConnection: FileStudioConnectionState | null;
}) {
  const [connection, setConnection] = useState<FileStudioConnectionState>(
    initialConnection ?? { status: 'pending', deviceId: null, preferredMode: 'local' },
  );
  const [requestId, setRequestId] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const statusText = {
    paired: copy.statusPaired,
    pending: initialConnection ? copy.statusPending : copy.statusNone,
    revoked: copy.statusNone,
  }[connection.status];

  async function handleConfirm(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const response = await fetch('/api/integrations/filestudio/pairing/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: requestId.trim(), code: code.trim() }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string; deviceId?: string };
      if (!response.ok) {
        const errorKey = body.error as keyof Copy['errors'] | undefined;
        const message =
          (errorKey && copy.errors[errorKey]) || copy.errors.unavailable || copy.pairError;
        setFeedback({ kind: 'error', text: message });
        return;
      }
      setConnection({ status: 'paired', deviceId: body.deviceId ?? null, preferredMode: 'local' });
      setRequestId('');
      setCode('');
      setFeedback({ kind: 'ok', text: copy.pairSuccess });
    } catch {
      setFeedback({ kind: 'error', text: copy.errors.unavailable });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="ac-surface-panel overflow-hidden p-8 text-[var(--text-primary)]">
      <p className="ac-surface-panel__eyebrow">{copy.settingsEyebrow}</p>
      <h3 className="mt-3 text-2xl font-black tracking-tight">{copy.settingsTitle}</h3>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
        {copy.settingsDescription}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
          {copy.statusLabel}
        </span>
        <span className="text-sm font-semibold">{statusText}</span>
        <ProcessingModeBadge
          mode={connection.preferredMode}
          labels={{ local: copy.badgeLocal, service: copy.badgeService, browser: copy.badgeBrowser }}
        />
      </div>

      <form onSubmit={handleConfirm} className="mt-6 space-y-4">
        <p className="text-sm font-bold">{copy.pairTitle}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              {copy.pairRequestIdLabel}
            </span>
            <input
              className="field-input placeholder-[var(--text-tertiary)]"
              value={requestId}
              onChange={(event) => setRequestId(event.target.value)}
              placeholder="apr_…"
              required
            />
            <span className="block text-xs text-[var(--text-tertiary)]">{copy.pairRequestIdHint}</span>
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              {copy.pairCodeLabel}
            </span>
            <input
              className="field-input placeholder-[var(--text-tertiary)]"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              placeholder="123456"
              required
            />
          </label>
        </div>
        <button type="submit" className="ac-button ac-button--primary" disabled={submitting}>
          {submitting ? copy.pairSubmitting : copy.pairSubmit}
        </button>
        {feedback && (
          <p
            role={feedback.kind === 'error' ? 'alert' : 'status'}
            className={`text-sm font-semibold ${feedback.kind === 'error' ? 'text-red-500' : 'text-emerald-500'}`}
          >
            {feedback.text}
          </p>
        )}
      </form>
    </div>
  );
}
