/**
 * Local Agent pairing — Talent side.
 *
 * Implements sdd/integrations/filestudio/authentication.md against the real
 * FileStudio endpoints (apps/api/src/routes/agent.ts):
 *
 * 1. The Local Agent creates the pairing request itself
 *    (`POST /api/v1/agent-pairing-requests`) and shows the user a 6-digit
 *    code plus the request id.
 * 2. Talent registers the intent (`requestPairingForUser`) and, when the user
 *    submits the code, approves it with the `filestudio:admin` scope
 *    (`POST /api/v1/admin/agent-pairing-requests/:requestId/approve`).
 * 3. The approval response carries the device access/refresh tokens; Talent
 *    stores them AES-256-GCM encrypted (crypto.ts) and never logs them.
 *
 * Documented contract gaps (code wins over docs):
 * - FileStudio has no "approve by code" endpoint: the approval requires the
 *   request id, so the Talent UI asks for it next to the 6-digit code.
 * - The approval response does not include the device public key; the
 *   `filestudio_connections.public_key` column stays null until the
 *   versioned contract exposes it.
 */

import 'server-only';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { filestudioConnections } from '@/lib/db/schema';
import { FileStudioClient, type ProcessingMode } from './client';
import { getFileStudioConfig } from './config';
import { decryptCredentials, encryptCredentials } from './crypto';

export type PairingStatus = 'pending' | 'paired' | 'revoked';

export interface FileStudioConnection {
  userId: string;
  deviceId: string | null;
  deviceName: string | null;
  publicKey: string | null;
  status: PairingStatus;
  preferredMode: ProcessingMode;
}

type ConnectionsStore = Pick<ReturnType<typeof getDb>, 'insert' | 'update' | 'select'>;

interface ConnectionRow {
  userId: string;
  deviceId: string | null;
  deviceName: string | null;
  publicKey: string | null;
  encryptedCredentials: string | null;
  status: string;
  preferredMode: string;
}

function toConnection(row: ConnectionRow): FileStudioConnection {
  return {
    userId: row.userId,
    deviceId: row.deviceId,
    deviceName: row.deviceName,
    publicKey: row.publicKey,
    status: row.status as PairingStatus,
    preferredMode: row.preferredMode as ProcessingMode,
  };
}

/** Registers (or resets) the pairing intent for a user. */
export async function requestPairingForUser(
  db: ConnectionsStore,
  userId: string,
  deviceName?: string,
): Promise<FileStudioConnection> {
  const now = new Date();
  await db
    .insert(filestudioConnections)
    .values({
      userId,
      deviceName: deviceName ?? null,
      status: 'pending',
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: filestudioConnections.userId,
      set: { status: 'pending', deviceName: deviceName ?? null, updatedAt: now },
    });

  return {
    userId,
    deviceId: null,
    deviceName: deviceName ?? null,
    publicKey: null,
    status: 'pending',
    preferredMode: 'local',
  };
}

export async function getConnectionForUser(
  db: ConnectionsStore,
  userId: string,
): Promise<FileStudioConnection | null> {
  const rows = await db
    .select()
    .from(filestudioConnections)
    .where(eq(filestudioConnections.userId, userId))
    .limit(1);
  const row = rows[0] as ConnectionRow | undefined;
  return row ? toConnection(row) : null;
}

/**
 * Approves the pairing in FileStudio with the 6-digit code and persists the
 * issued credentials encrypted. Throws FileStudioApiError on FileStudio
 * rejections (PAIRING_CODE_INVALID, PAIRING_EXPIRED, ...).
 */
export async function confirmPairingForUser(
  db: ConnectionsStore,
  client: Pick<FileStudioClient, 'approvePairing'>,
  credentialsKey: string,
  userId: string,
  input: { requestId: string; code: string },
): Promise<FileStudioConnection> {
  const approval = await client.approvePairing(input.requestId, input.code);

  const encryptedCredentials = encryptCredentials(
    JSON.stringify({
      accessToken: approval.accessToken,
      refreshToken: approval.refreshToken,
      accessTokenExpiresAt: approval.accessTokenExpiresAt,
      refreshTokenExpiresAt: approval.refreshTokenExpiresAt,
    }),
    credentialsKey,
  );

  const now = new Date();
  await db
    .insert(filestudioConnections)
    .values({
      userId,
      deviceId: approval.deviceId,
      status: 'paired',
      encryptedCredentials,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: filestudioConnections.userId,
      set: { deviceId: approval.deviceId, status: 'paired', encryptedCredentials, updatedAt: now },
    });

  const connection = await getConnectionForUser(db, userId);
  return (
    connection ?? {
      userId,
      deviceId: approval.deviceId,
      deviceName: null,
      publicKey: null,
      status: 'paired',
      preferredMode: 'local',
    }
  );
}

/** Reads and decrypts the stored credentials (server-side jobs only). */
export async function readDecryptedCredentials(
  db: ConnectionsStore,
  credentialsKey: string,
  userId: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const rows = await db
    .select({ encryptedCredentials: filestudioConnections.encryptedCredentials })
    .from(filestudioConnections)
    .where(eq(filestudioConnections.userId, userId))
    .limit(1);
  const encrypted = (rows[0] as { encryptedCredentials: string | null } | undefined)
    ?.encryptedCredentials;
  if (!encrypted) return null;
  return JSON.parse(decryptCredentials(encrypted, credentialsKey)) as {
    accessToken: string;
    refreshToken: string;
  };
}

// ── Server wrappers (lazy DB + env config) ──────────────────────────────────

export async function requestPairing(userId: string, deviceName?: string) {
  return requestPairingForUser(getDb(), userId, deviceName);
}

export async function getConnection(userId: string) {
  return getConnectionForUser(getDb(), userId);
}

export async function confirmPairing(
  userId: string,
  input: { requestId: string; code: string },
) {
  const config = getFileStudioConfig();
  if (!config) {
    throw new Error('FileStudio integration is disabled (FILESTUDIO_API_URL is not set)');
  }
  if (!config.credentialsKey) {
    throw new Error('FILESTUDIO_CREDENTIALS_KEY is required to store pairing credentials');
  }

  const client = new FileStudioClient({
    baseUrl: config.apiUrl,
    tokenProvider: async () => {
      if (!config.serviceToken) {
        throw new Error('FILESTUDIO_SERVICE_TOKEN is required to approve pairings');
      }
      return config.serviceToken;
    },
  });

  return confirmPairingForUser(getDb(), client, config.credentialsKey, userId, input);
}
