import 'server-only';
import { del, get, list, put } from '@vercel/blob';
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
 * Fixed-PDF document mode: the original uploaded PDF is stored in a
 * dedicated, private-access Blob store — completely separate from the
 * public store `uploadProjectBlob` uses for cover/back-cover/chapter
 * images (that store, and BLOB_READ_WRITE_TOKEN, are never touched here).
 * The returned URL is never sent to the browser directly; only
 * `fetchPrivateProjectDocument` (server-side) resolves it back into bytes,
 * behind the project's own auth/ownership check.
 *
 * FAIL CLOSED, by design: this store's token
 * (SOURCE_DOCUMENT_READ_WRITE_TOKEN) must be configured, and the upload
 * must succeed as private. There is no fallback to public storage and no
 * fallback to editable mode — a caller that gets a thrown error here MUST
 * surface a controlled failure and must NOT create a project of any kind.
 * (Earlier revisions of this feature fell back to a public store when the
 * default store rejected private access; that violated the contract that
 * choosing "keep original PDF" preserves the file, and has been removed.)
 * See sdd/features/feature-fixed-pdf-document-mode for the full writeup.
 */
export async function uploadPrivateProjectDocument(keyPrefix: string, file: File) {
  if (file.size === 0) {
    throw new Error('Cannot store an empty source document');
  }

  const token = process.env.SOURCE_DOCUMENT_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error('Private source-document storage is not configured (SOURCE_DOCUMENT_READ_WRITE_TOKEN missing)');
  }

  const safeName = `${keyPrefix}/source/${Date.now()}-${file.name.replace(/\s+/g, '-').toLowerCase()}`;
  const result = await put(safeName, file, { access: 'private', addRandomSuffix: true, token });
  return { url: result.url, accessLevel: 'private' as const };
}

function collectBlobUrls(value: unknown, urls: Set<string>): void {
  if (typeof value === 'string') {
    try {
      const url = new URL(value);
      if (
        url.hostname.endsWith('.public.blob.vercel-storage.com') ||
        url.hostname.endsWith('.private.blob.vercel-storage.com')
      ) {
        urls.add(url.toString());
      }
    } catch {
      // Non-URL strings are not Blob references.
    }
    return;
  }

  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item) => collectBlobUrls(item, urls));
    return;
  }

  Object.values(value).forEach((item) => collectBlobUrls(item, urls));
}

/** Deletes Vercel Blob URLs using the token for each store's access mode. */
export async function deleteBlobUrls(urls: string[]): Promise<void> {
  const uniqueUrls = [...new Set(urls)];
  const publicUrls = uniqueUrls.filter((url) => new URL(url).hostname.endsWith('.public.blob.vercel-storage.com'));
  const privateUrls = uniqueUrls.filter((url) => new URL(url).hostname.endsWith('.private.blob.vercel-storage.com'));

  if (publicUrls.length > 0) {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) throw new Error('Public Blob token is not configured');
    await del(publicUrls, { token });
  }

  if (privateUrls.length > 0) {
    const token = process.env.SOURCE_DOCUMENT_READ_WRITE_TOKEN;
    if (!token) throw new Error('Private Blob token is not configured');
    await del(privateUrls, { token });
  }
}

/** Removes all Vercel Blob objects still referenced by a deleted project. */
export async function deleteProjectBlobs(project: unknown): Promise<void> {
  const urls = new Set<string>();
  collectBlobUrls(project, urls);
  await deleteBlobUrls([...urls]);

  const publicToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (publicToken) {
    const projectId = (project as { id?: string }).id;
    if (!projectId) throw new Error('Project id is required to clean Blob assets');
    let cursor: string | undefined;
    do {
      const page = await list({ prefix: `${projectId}/`, limit: 1000, cursor, token: publicToken });
      if (page.blobs.length > 0) {
        await del(page.blobs.map((blob) => blob.url), { token: publicToken });
      }
      cursor = page.cursor;
    } while (cursor);
  }
}

/**
 * Server-side only: streams a source document back by its stored URL.
 * `accessLevel` must match how it was actually stored (persisted on
 * `document.source.sourceAccessLevel`): `'private'` reads through the
 * dedicated private store's token; `'public-proxy-only'` is a legacy value
 * from documents created before the private store existed — those remain
 * readable via a plain fetch against the (still never client-exposed)
 * public URL. No new document is ever written with `'public-proxy-only'`.
 */
export async function fetchPrivateProjectDocument(url: string, accessLevel: SourceDocumentAccessLevel) {
  if (accessLevel === 'private') {
    const token = process.env.SOURCE_DOCUMENT_READ_WRITE_TOKEN;
    if (!token) return null;
    return get(url, { access: 'private', token });
  }

  const response = await fetch(url);
  if (!response.ok || !response.body) {
    return null;
  }
  return { statusCode: 200 as const, stream: response.body };
}
