'use client';

/**
 * Publish to sales channels panel (F4) — workspace export step, below the
 * launch pack.
 *
 * - Kit preview: product sheet + landing copy generated from the AST on
 *   demand (never invented text — derived descriptions carry a draft badge).
 * - Gumroad (mode badge "API · borrador"): connect the user token (verified
 *   server-side before storing), set a price and create the DRAFT product.
 * - Hotmart (mode badge "Export manual"): downloads a .zip with the sheet,
 *   the landing copy, the structured JSON and the AI disclosure — Hotmart
 *   has no public product-creation API (see sales/channels/hotmart.ts).
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Download, Loader2, Store, Unplug } from 'lucide-react';
import JSZip from 'jszip';
import type { AppMessages } from '@/lib/i18n/messages';
import type { LaunchKit } from '@/lib/sales/launch-kit';
import {
  exportHotmartAction,
  getLaunchKitAction,
  pushToGumroadAction,
  removeGumroadTokenAction,
  saveGumroadTokenAction,
  type SalesActionError,
} from '@/lib/sales/actions';

type Copy = AppMessages['publishChannels'];

function sheetToPlainText(kit: LaunchKit): string {
  const { sheet } = kit;
  const lines = [sheet.title];
  if (sheet.subtitle) lines.push(sheet.subtitle);
  lines.push('', sheet.longDescription, '');
  for (const bullet of sheet.bullets) lines.push(`- ${bullet}`);
  return lines.join('\n');
}

function landingToPlainText(kit: LaunchKit): string {
  const { landing } = kit;
  const lines = [landing.headline, ''];
  if (landing.subheadline) lines.push(landing.subheadline, '');
  for (const bullet of landing.benefitBullets) lines.push(`- ${bullet}`);
  lines.push('', landing.cta);
  return lines.join('\n');
}

export function PublishChannelsPanel({
  copy,
  projectId,
  gumroadEnabled,
  gumroadConnected,
}: {
  copy: Copy;
  projectId: string;
  /** Deployment flag (GUMROAD_ENABLED); the section shows with a token too. */
  gumroadEnabled: boolean;
  /** Whether the user already stored a Gumroad token (server-provided). */
  gumroadConnected: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorKey, setErrorKey] = useState<SalesActionError | null>(null);
  const [connected, setConnected] = useState(gumroadConnected);
  const [token, setToken] = useState('');
  const [priceCents, setPriceCents] = useState('');
  const [kit, setKit] = useState<LaunchKit | null>(null);
  const [tab, setTab] = useState<'sheet' | 'landing'>('sheet');
  const [copied, setCopied] = useState(false);
  const [pushResult, setPushResult] = useState<{ shortUrl: string | null } | null>(null);

  const showGumroad = gumroadEnabled || connected;

  const run = (action: () => Promise<boolean>) => {
    setErrorKey(null);
    startTransition(async () => {
      const okResult = await action();
      if (okResult) router.refresh();
    });
  };

  const handleGenerateKit = () =>
    run(async () => {
      const result = await getLaunchKitAction({ projectId });
      if (!result.ok) {
        setErrorKey(result.error);
        return false;
      }
      setKit(result.data);
      return false; // the kit lives in local state; no server refresh needed
    });

  const handleSaveToken = () =>
    run(async () => {
      const result = await saveGumroadTokenAction({ token });
      if (!result.ok) {
        setErrorKey(result.error);
        return false;
      }
      setConnected(true);
      setToken('');
      return true;
    });

  const handleRemoveToken = () =>
    run(async () => {
      const result = await removeGumroadTokenAction();
      if (!result.ok) {
        setErrorKey(result.error);
        return false;
      }
      setConnected(false);
      setPushResult(null);
      return true;
    });

  const handlePush = () =>
    run(async () => {
      const result = await pushToGumroadAction({ projectId, priceCents: Number(priceCents) });
      if (!result.ok) {
        setErrorKey(result.error);
        return false;
      }
      setPushResult({ shortUrl: result.data.shortUrl });
      return false;
    });

  const handleExportHotmart = () =>
    run(async () => {
      const result = await exportHotmartAction({ projectId });
      if (!result.ok) {
        setErrorKey(result.error);
        return false;
      }
      const zip = new JSZip();
      for (const file of result.data.files) zip.file(file.filename, file.content);
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'hotmart-export.zip';
      anchor.click();
      URL.revokeObjectURL(url);
      return false;
    });

  const handleCopy = async () => {
    if (!kit) return;
    const text = tab === 'sheet' ? sheetToPlainText(kit) : landingToPlainText(kit);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section
      aria-label={copy.title}
      data-testid="publish-channels-panel"
      className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Store className="mt-0.5 h-5 w-5 text-[var(--accent)]" />
          <div>
            <h4 className="text-sm font-semibold text-[var(--foreground)]">{copy.title}</h4>
            <p className="mt-1 text-xs text-[var(--muted)]">{copy.description}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleGenerateKit}
          disabled={isPending}
          className="ac-button ac-button--secondary inline-flex items-center gap-2"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPending ? copy.generatingKit : copy.generateKitButton}
        </button>
      </div>

      {errorKey && (
        <p role="alert" className="mt-3 text-sm font-semibold text-red-600">
          {copy.errors[errorKey]}
        </p>
      )}

      {kit && (
        <div className="mt-4 rounded-lg border border-[var(--border)] p-4" data-testid="launch-kit-preview">
          <div className="flex items-center justify-between gap-3">
            <h5 className="text-sm font-semibold text-[var(--foreground)]">{copy.kitTitle}</h5>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTab('sheet')}
                aria-pressed={tab === 'sheet'}
                className="ac-button ac-button--secondary text-xs"
              >
                {copy.sheetTab}
              </button>
              <button
                type="button"
                onClick={() => setTab('landing')}
                aria-pressed={tab === 'landing'}
                className="ac-button ac-button--secondary text-xs"
              >
                {copy.landingTab}
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="ac-button ac-button--secondary inline-flex items-center gap-1 text-xs"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? copy.copiedBadge : copy.copyButton}
              </button>
            </div>
          </div>

          {tab === 'sheet' ? (
            <div data-testid="kit-sheet" className="mt-3 space-y-1 text-sm">
              <p className="font-semibold">{kit.sheet.title}</p>
              {kit.sheet.subtitle && <p className="text-[var(--muted)]">{kit.sheet.subtitle}</p>}
              {kit.sheet.descriptionIsDraft && (
                <p
                  data-testid="kit-description-draft"
                  className="mt-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800"
                >
                  {copy.draftDescriptionBadge}
                </p>
              )}
              <p className="mt-2 whitespace-pre-line">{kit.sheet.longDescription}</p>
              <ul className="mt-2 list-disc pl-5">
                {kit.sheet.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div data-testid="kit-landing" className="mt-3 space-y-1 text-sm">
              <p className="font-semibold">{kit.landing.headline}</p>
              {kit.landing.subheadline && <p className="text-[var(--muted)]">{kit.landing.subheadline}</p>}
              <ul className="mt-2 list-disc pl-5">
                {kit.landing.benefitBullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
              <p className="mt-2 font-semibold text-[var(--accent)]">{kit.landing.cta}</p>
            </div>
          )}

          {kit.assets.length > 0 && (
            <p className="mt-3 text-xs text-[var(--muted)]" data-testid="kit-assets">
              {copy.assetsLabel}:{' '}
              {kit.assets.map((asset) => asset.kind.toUpperCase()).join(' · ')}
            </p>
          )}
          {kit.aiDisclosure && (
            <p className="mt-2 rounded-lg bg-violet-50 p-2 text-xs text-violet-900" data-testid="kit-disclosure">
              <strong>{copy.disclosureLabel}:</strong> {kit.aiDisclosure}
            </p>
          )}
        </div>
      )}

      {showGumroad ? (
        <div className="mt-4 rounded-lg border border-[var(--border)] p-4" data-testid="gumroad-section">
          <div className="flex items-center gap-2">
            <h5 className="text-sm font-semibold text-[var(--foreground)]">{copy.gumroadTitle}</h5>
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800">
              {copy.modeApiBadge}
            </span>
            {connected && (
              <span
                data-testid="gumroad-connected"
                className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800"
              >
                {copy.connectedBadge}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">{copy.gumroadDescription}</p>

          {!connected ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label htmlFor="gumroad-token" className="sr-only">
                {copy.tokenLabel}
              </label>
              <input
                id="gumroad-token"
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder={copy.tokenPlaceholder}
                className="min-w-64 flex-1 rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={handleSaveToken}
                disabled={isPending || !token.trim()}
                className="ac-button ac-button--primary inline-flex items-center gap-2"
              >
                {isPending ? copy.savingToken : copy.saveTokenButton}
              </button>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label htmlFor="gumroad-price" className="text-xs text-[var(--muted)]">
                {copy.priceLabel}
              </label>
              <input
                id="gumroad-price"
                type="number"
                min={0}
                value={priceCents}
                onChange={(event) => setPriceCents(event.target.value)}
                placeholder={copy.pricePlaceholder}
                className="w-28 rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={handlePush}
                disabled={isPending || !priceCents}
                className="ac-button ac-button--primary inline-flex items-center gap-2"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isPending ? copy.pushing : copy.pushButton}
              </button>
              <button
                type="button"
                onClick={handleRemoveToken}
                disabled={isPending}
                className="ac-button ac-button--secondary inline-flex items-center gap-1"
              >
                <Unplug className="h-3 w-3" />
                {copy.removeTokenButton}
              </button>
            </div>
          )}

          {pushResult && (
            <p className="mt-3 text-sm font-semibold text-emerald-700" data-testid="gumroad-push-success">
              {copy.pushSuccessLabel}
              {pushResult.shortUrl && (
                <>
                  {' · '}
                  <a href={pushResult.shortUrl} target="_blank" rel="noreferrer" className="underline">
                    {pushResult.shortUrl}
                  </a>
                </>
              )}
            </p>
          )}
        </div>
      ) : (
        <p className="mt-4 text-xs text-[var(--muted)]" data-testid="gumroad-disabled">
          {copy.gumroadTitle}: {copy.gumroadDisabled}
        </p>
      )}

      <div className="mt-4 rounded-lg border border-[var(--border)] p-4" data-testid="hotmart-section">
        <div className="flex items-center gap-2">
          <h5 className="text-sm font-semibold text-[var(--foreground)]">{copy.hotmartTitle}</h5>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600">
            {copy.modeExportBadge}
          </span>
        </div>
        <p className="mt-1 text-xs text-[var(--muted)]">{copy.hotmartDescription}</p>
        <button
          type="button"
          onClick={handleExportHotmart}
          disabled={isPending}
          className="ac-button ac-button--secondary mt-3 inline-flex items-center gap-2"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {isPending ? copy.exporting : copy.exportButton}
        </button>
      </div>
    </section>
  );
}
