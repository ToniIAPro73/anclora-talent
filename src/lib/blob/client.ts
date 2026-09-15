import 'server-only';
import { get, put } from '@vercel/blob';
import type { SourceDocumentAccessLevel } from '@/lib/projects/types';

export async function uploadProjectBlob(projectId: string, file: File) {
  if (!process.env.BLOB_READ_WRITE_TOKEN || file.size === 0) {
    return null;
  }

  const safeName = `${projectId}/${Date.now()}-${file.name.replace(/\s+/g, '-').toLowerCase()}`;

  return put(safeName, file, {
    access: 'public',
    addRandomSuffix: true,
  });
}

/**
 * Fixed-PDF document mode: the original uploaded PDF is user content, not a
 * cover/render asset, so it is stored with `access: 'private'` instead of
 * `uploadProjectBlob`'s public default — the returned URL is never sent to
 * the browser directly; only `fetchPrivateProjectDocument` (server-side)
 * resolves it back into bytes, behind the project's own auth/ownership
 * check.
 *
 * Documented infra gap: this repo's Blob store, at least as provisioned
 * today, rejects `access: 'private'` outright ("Cannot use private access
 * on a public store. The store must be configured with private access." —
 * confirmed via a real upload attempt, not assumed). Rather than fail
 * fixed-pdf mode entirely, this falls back to public storage as the
 * mission-sanctioned minimum viable secure option — the URL still never
 * reaches any client, only server code with an ownership check ever reads
 * it. This is NOT a silent downgrade: it is logged, and the resulting
 * `accessLevel` is persisted on `document.source` so every later read knows
 * which strategy to use without re-probing. See
 * sdd/features/feature-fixed-pdf-document-mode for the full writeup.
 */
export async function uploadPrivateProjectDocument(keyPrefix: string, file: File) {
  if (!process.env.BLOB_READ_WRITE_TOKEN || file.size === 0) {
    return null;
  }

  const safeName = `${keyPrefix}/source/${Date.now()}-${file.name.replace(/\s+/g, '-').toLowerCase()}`;

  try {
    const result = await put(safeName, file, { access: 'private', addRandomSuffix: true });
    return { url: result.url, accessLevel: 'private' as const };
  } catch (error) {
    console.error(
      '[blob] private access unavailable on this store; falling back to public+proxy-only storage for the source PDF',
      error,
    );
    const result = await put(safeName, file, { access: 'public', addRandomSuffix: true });
    return { url: result.url, accessLevel: 'public-proxy-only' as const };
  }
}

/**
 * Server-side only: streams a source document back by its stored URL.
 * `accessLevel` must match what `uploadPrivateProjectDocument` actually
 * used (persisted on `document.source.sourceAccessLevel`) — a private blob
 * needs the SDK's authenticated `get()`; a public-proxy-only fallback blob
 * is fetched directly, since the store never issued it a private handle.
 */
export async function fetchPrivateProjectDocument(url: string, accessLevel: SourceDocumentAccessLevel) {
  if (accessLevel === 'private') {
    return get(url, { access: 'private' });
  }

  const response = await fetch(url);
  if (!response.ok || !response.body) {
    return null;
  }
  return { statusCode: 200 as const, stream: response.body };
}
