import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const putMock = vi.fn();
const getMock = vi.fn();

vi.mock('@vercel/blob', () => ({
  put: putMock,
  get: getMock,
}));

const ORIGINAL_ENV = { ...process.env };

function pdfFile(bytes = [0x25, 0x50, 0x44, 0x46]) {
  return new File([new Uint8Array(bytes)], 'source.pdf', { type: 'application/pdf' });
}

describe('uploadPrivateProjectDocument — fail closed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  test('throws when SOURCE_DOCUMENT_READ_WRITE_TOKEN is not configured, and never calls put()', async () => {
    delete process.env.SOURCE_DOCUMENT_READ_WRITE_TOKEN;
    const { uploadPrivateProjectDocument } = await import('./client');

    await expect(uploadPrivateProjectDocument('key-1', pdfFile())).rejects.toThrow(
      /SOURCE_DOCUMENT_READ_WRITE_TOKEN/,
    );
    expect(putMock).not.toHaveBeenCalled();
  });

  test('throws for an empty file without calling put()', async () => {
    process.env.SOURCE_DOCUMENT_READ_WRITE_TOKEN = 'token-123';
    const { uploadPrivateProjectDocument } = await import('./client');

    await expect(uploadPrivateProjectDocument('key-1', pdfFile([]))).rejects.toThrow(/empty/i);
    expect(putMock).not.toHaveBeenCalled();
  });

  test('uploads with access:private and the dedicated token, never the shared public token', async () => {
    process.env.SOURCE_DOCUMENT_READ_WRITE_TOKEN = 'private-store-token';
    process.env.BLOB_READ_WRITE_TOKEN = 'public-store-token';
    putMock.mockResolvedValue({ url: 'https://x.private.blob.vercel-storage.com/key-1/source/1-file.pdf' });
    const { uploadPrivateProjectDocument } = await import('./client');

    const result = await uploadPrivateProjectDocument('key-1', pdfFile());

    expect(result).toEqual({
      url: 'https://x.private.blob.vercel-storage.com/key-1/source/1-file.pdf',
      accessLevel: 'private',
    });
    expect(putMock).toHaveBeenCalledTimes(1);
    const [, , options] = putMock.mock.calls[0];
    expect(options).toMatchObject({ access: 'private', token: 'private-store-token' });
    expect(options.token).not.toBe('public-store-token');
  });

  test('propagates a put() failure (e.g. misconfigured store) instead of swallowing or falling back', async () => {
    process.env.SOURCE_DOCUMENT_READ_WRITE_TOKEN = 'private-store-token';
    putMock.mockRejectedValue(new Error('Cannot use private access on a public store'));
    const { uploadPrivateProjectDocument } = await import('./client');

    await expect(uploadPrivateProjectDocument('key-1', pdfFile())).rejects.toThrow(
      'Cannot use private access on a public store',
    );
    expect(putMock).toHaveBeenCalledTimes(1);
  });
});

describe('fetchPrivateProjectDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
  });

  test('private access level uses get() with the dedicated token', async () => {
    process.env.SOURCE_DOCUMENT_READ_WRITE_TOKEN = 'private-store-token';
    getMock.mockResolvedValue({ statusCode: 200, stream: 'fake-stream' });
    const { fetchPrivateProjectDocument } = await import('./client');

    const result = await fetchPrivateProjectDocument('https://x.private.blob.vercel-storage.com/f.pdf', 'private');

    expect(result).toEqual({ statusCode: 200, stream: 'fake-stream' });
    expect(getMock).toHaveBeenCalledWith('https://x.private.blob.vercel-storage.com/f.pdf', {
      access: 'private',
      token: 'private-store-token',
    });
  });

  test('private access level with no token configured returns null rather than throwing', async () => {
    delete process.env.SOURCE_DOCUMENT_READ_WRITE_TOKEN;
    const { fetchPrivateProjectDocument } = await import('./client');

    const result = await fetchPrivateProjectDocument('https://x.private.blob.vercel-storage.com/f.pdf', 'private');

    expect(result).toBeNull();
    expect(getMock).not.toHaveBeenCalled();
  });

  test('legacy public-proxy-only access level fetches the URL directly, never via get()', async () => {
    const fakeResponse = {
      ok: true,
      body: 'fake-readable-stream',
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse));
    const { fetchPrivateProjectDocument } = await import('./client');

    const result = await fetchPrivateProjectDocument(
      'https://x.public.blob.vercel-storage.com/legacy.pdf',
      'public-proxy-only',
    );

    expect(result).toEqual({ statusCode: 200, stream: 'fake-readable-stream' });
    expect(getMock).not.toHaveBeenCalled();
  });

  test('legacy public-proxy-only access level returns null on a failed fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, body: null }));
    const { fetchPrivateProjectDocument } = await import('./client');

    const result = await fetchPrivateProjectDocument(
      'https://x.public.blob.vercel-storage.com/missing.pdf',
      'public-proxy-only',
    );

    expect(result).toBeNull();
  });
});
