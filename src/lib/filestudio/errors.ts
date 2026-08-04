/**
 * Error mapping — FileStudio → Talent UX.
 *
 * Implements sdd/integrations/filestudio/error-mapping.md: the user never sees
 * FileStudio codes; each code maps to a product action plus a message key in
 * the `filestudio.errors` i18n section (`null` when the failure is internal
 * and must stay invisible).
 */

export type FileStudioErrorAction =
  /** Transparent for the user: refresh the service token and retry once. */
  | 'refresh-and-retry'
  /** Integration misconfiguration: raise an internal alert. */
  | 'internal-alert'
  /** Ask the admin to re-enter the 6-digit pairing code. */
  | 'reenter-pairing-code'
  /** Restart the pairing flow from scratch. */
  | 'restart-pairing'
  /** Mark the device as disconnected and offer re-pairing. */
  | 'repair-device'
  /** Re-run the routing policy in another processing mode. */
  | 'reroute'
  /** Result treated as failed; internal alert, no blind retry. */
  | 'fail-no-retry'
  /** Emitter bug: stop retrying and log. */
  | 'stop-and-log'
  /** Recoverable by the user (consent rejection, offline device). */
  | 'user-recoverable';

export interface MappedFileStudioError {
  code: string;
  action: FileStudioErrorAction;
  /** Key inside `filestudio.errors` in src/lib/i18n/messages.ts, or null when internal-only. */
  messageKey: string | null;
  retryable: boolean;
}

/** Special code used when the Local Agent rejects a job via ask-always consent. */
export const CONSENT_REJECTED_CODE = 'AGENT_CONSENT_REJECTED';
/** Special code used when the Local Agent is offline / the queue TTL expired. */
export const AGENT_OFFLINE_CODE = 'AGENT_OFFLINE';

const ERROR_MAP: Record<string, Omit<MappedFileStudioError, 'code'>> = {
  AUTH_INVALID_TOKEN: { action: 'refresh-and-retry', messageKey: null, retryable: true },
  AUTH_EXPIRED_TOKEN: { action: 'refresh-and-retry', messageKey: null, retryable: true },
  AUTH_INSUFFICIENT_SCOPE: { action: 'internal-alert', messageKey: 'unavailable', retryable: false },
  PAIRING_CODE_INVALID: { action: 'reenter-pairing-code', messageKey: 'pairingCodeInvalid', retryable: false },
  PAIRING_TOO_MANY_ATTEMPTS: { action: 'restart-pairing', messageKey: 'pairingExpired', retryable: false },
  PAIRING_EXPIRED: { action: 'restart-pairing', messageKey: 'pairingExpired', retryable: false },
  AGENT_DEVICE_REVOKED: { action: 'repair-device', messageKey: 'deviceRevoked', retryable: false },
  AUTH_REFRESH_REUSE_DETECTED: { action: 'repair-device', messageKey: 'deviceRevoked', retryable: false },
  AGENT_REPAIR_REQUIRED: { action: 'repair-device', messageKey: 'repairRequired', retryable: false },
  OPERATION_UNAVAILABLE: { action: 'reroute', messageKey: 'operationUnavailable', retryable: false },
  UPLOAD_TOO_LARGE: { action: 'reroute', messageKey: 'uploadTooLarge', retryable: false },
  OUTPUT_HASH_MISMATCH: { action: 'fail-no-retry', messageKey: 'integrityFailed', retryable: false },
  IDEMPOTENCY_CONFLICT: { action: 'stop-and-log', messageKey: null, retryable: false },
  VALIDATION_FAILED: { action: 'stop-and-log', messageKey: null, retryable: false },
  [CONSENT_REJECTED_CODE]: { action: 'user-recoverable', messageKey: 'consentRejected', retryable: true },
  [AGENT_OFFLINE_CODE]: { action: 'user-recoverable', messageKey: 'agentOffline', retryable: true },
};

const FALLBACK: Omit<MappedFileStudioError, 'code'> = {
  action: 'internal-alert',
  messageKey: 'unavailable',
  retryable: false,
};

export function mapFileStudioError(code: string): MappedFileStudioError {
  const mapped = ERROR_MAP[code] ?? FALLBACK;
  return { code, ...mapped };
}
