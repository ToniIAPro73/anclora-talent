'use client';

/**
 * Launch pack panel (F2) — workspace export step.
 *
 * Lists the latest asset-manifest version: every asset with its kind, a
 * provenance badge (compositor / FileStudio mode), a stale badge when the
 * document changed after the asset was generated, and a pending badge for
 * delegated assets still in flight at FileStudio. The generate/regenerate
 * button runs the coordinated pack server action and refreshes the page
 * data (the server reloads the manifest with fresh stale flags).
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Package, RefreshCw } from 'lucide-react';
import { generateLaunchPackAction } from '@/lib/manifest/actions';
import type { LaunchPackView } from '@/lib/manifest/view';
import type { ManifestProvenance } from '@/lib/manifest/model';
import type { AppMessages } from '@/lib/i18n/messages';

type Copy = AppMessages['launchPack'];

const PROVENANCE_LABEL: Record<ManifestProvenance, keyof Pick<Copy, 'provenanceCompositor' | 'provenanceService' | 'provenanceLocal'>> = {
  compositor: 'provenanceCompositor',
  'filestudio-service': 'provenanceService',
  'filestudio-local': 'provenanceLocal',
};

const PROVENANCE_CLASSES: Record<ManifestProvenance, string> = {
  compositor: 'bg-violet-100 text-violet-800',
  'filestudio-service': 'bg-sky-100 text-sky-800',
  'filestudio-local': 'bg-emerald-100 text-emerald-800',
};

export function LaunchPackPanel({
  copy,
  projectId,
  view,
}: {
  copy: Copy;
  projectId: string;
  /** Latest manifest with stale flags; null when no pack was generated yet. */
  view: LaunchPackView | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorKey, setErrorKey] = useState<keyof Copy['errors'] | null>(null);

  const handleGenerate = () => {
    setErrorKey(null);
    startTransition(async () => {
      const result = await generateLaunchPackAction({ projectId });
      if (!result.ok) {
        setErrorKey(result.error === 'notFound' ? 'notFound' : 'unavailable');
        return;
      }
      router.refresh();
    });
  };

  return (
    <section
      aria-label={copy.title}
      data-testid="launch-pack-panel"
      className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Package className="mt-0.5 h-5 w-5 text-[var(--accent)]" />
          <div>
            <h4 className="text-sm font-semibold text-[var(--foreground)]">{copy.title}</h4>
            <p className="mt-1 text-xs text-[var(--muted)]">{copy.description}</p>
            {view && (
              <p className="mt-1 text-xs font-medium text-[var(--muted)]" data-testid="launch-pack-version">
                {copy.versionLabel.replace('{version}', String(view.version))}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          data-testid="launch-pack-generate-button"
          onClick={handleGenerate}
          disabled={isPending}
          className="ac-button ac-button--primary inline-flex items-center gap-2"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {isPending ? copy.generating : view ? copy.regenerateButton : copy.generateButton}
        </button>
      </div>

      {errorKey && (
        <p role="alert" className="mt-3 text-sm font-semibold text-red-600">
          {copy.errors[errorKey]}
        </p>
      )}

      {!view && <p className="mt-4 text-sm text-[var(--muted)]">{copy.empty}</p>}

      {view && (
        <ul className="mt-4 space-y-2" data-testid="launch-pack-assets">
          {view.items.map((item) => (
            <li
              key={item.assetId}
              data-testid={`launch-pack-asset-${item.assetId}`}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            >
              <span className="font-medium text-[var(--foreground)]">{copy.kinds[item.kind]}</span>
              <span
                data-testid={`provenance-${item.provenance}`}
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PROVENANCE_CLASSES[item.provenance]}`}
              >
                {copy[PROVENANCE_LABEL[item.provenance]]}
              </span>
              {item.stale && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  {copy.staleBadge}
                </span>
              )}
              {!item.url && (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600">
                  {copy.pendingBadge}
                </span>
              )}
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto text-xs font-semibold text-[var(--accent)] underline"
                >
                  {copy.viewAsset}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
