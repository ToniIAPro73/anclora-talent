/**
 * FileStudio client wiring — Talent server side.
 *
 * Mode 2 (service) authenticates with the service token
 * (`FILESTUDIO_SERVICE_TOKEN`); Mode 1 (local) with the device credentials
 * issued at pairing, stored AES-256-GCM encrypted (pairing.ts).
 *
 * Documented gap: the device access token is used as-is; the refresh flow
 * (`refreshToken`) lands with the versioned contract — an expired device
 * token surfaces as AUTH_EXPIRED_TOKEN and maps to a transparent retry once
 * the refresh is wired.
 */

import 'server-only';
import { getDb } from '@/lib/db';
import { FileStudioClient, type ProcessingMode } from './client';
import type { FileStudioConfig } from './config';
import { readDecryptedCredentials } from './pairing';

export async function buildServiceClient(config: FileStudioConfig): Promise<FileStudioClient> {
  if (!config.serviceToken) {
    throw new Error('FILESTUDIO_SERVICE_TOKEN is required for service-mode jobs');
  }
  const token = config.serviceToken;
  return new FileStudioClient({ baseUrl: config.apiUrl, tokenProvider: async () => token });
}

export async function buildAgentClient(
  config: FileStudioConfig,
  userId: string,
): Promise<FileStudioClient> {
  if (!config.credentialsKey) {
    throw new Error('FILESTUDIO_CREDENTIALS_KEY is required to read device credentials');
  }
  const credentials = await readDecryptedCredentials(getDb(), config.credentialsKey, userId);
  if (!credentials) {
    throw new Error('No paired device credentials for this user');
  }
  const token = credentials.accessToken;
  return new FileStudioClient({ baseUrl: config.apiUrl, tokenProvider: async () => token });
}

/** Builds the client for the mode a job was emitted in. */
export async function buildClientForMode(
  config: FileStudioConfig,
  userId: string,
  mode: ProcessingMode,
): Promise<FileStudioClient> {
  return mode === 'local' ? buildAgentClient(config, userId) : buildServiceClient(config);
}
