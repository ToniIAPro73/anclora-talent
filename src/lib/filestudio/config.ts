import 'server-only';

/**
 * FileStudio integration configuration.
 *
 * The integration is feature-flagged by `FILESTUDIO_API_URL`: when it is not
 * set, every FileStudio surface (routes, settings UI, job emission) stays
 * hidden/disabled and the app behaves exactly as if the integration did not
 * exist.
 */
export interface FileStudioConfig {
  /** Base URL of the FileStudio Service API (e.g. https://filestudio.example.com). */
  apiUrl: string;
  /** Service JWT with the `filestudio:*` scopes declared in sdd/integrations/filestudio/authentication.md. */
  serviceToken: string | null;
  /** HMAC-SHA256 secret of the webhook endpoint registered in FileStudio. */
  webhookSecret: string | null;
  /** 64-char hex key (32 bytes) used to AES-256-GCM-encrypt pairing credentials at rest. */
  credentialsKey: string | null;
}

export function isFileStudioEnabled(): boolean {
  return Boolean(process.env.FILESTUDIO_API_URL);
}

export function getFileStudioConfig(): FileStudioConfig | null {
  const apiUrl = process.env.FILESTUDIO_API_URL;
  if (!apiUrl) return null;

  return {
    apiUrl: apiUrl.replace(/\/+$/, ''),
    serviceToken: process.env.FILESTUDIO_SERVICE_TOKEN ?? null,
    webhookSecret: process.env.FILESTUDIO_WEBHOOK_SECRET ?? null,
    credentialsKey: process.env.FILESTUDIO_CREDENTIALS_KEY ?? null,
  };
}
