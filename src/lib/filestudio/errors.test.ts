import { describe, expect, test } from 'vitest';
import {
  AGENT_OFFLINE_CODE,
  CONSENT_REJECTED_CODE,
  mapFileStudioError,
} from './errors';

describe('mapFileStudioError (sdd/integrations/filestudio/error-mapping.md)', () => {
  test('auth token errors are transparent: refresh-and-retry with no user message', () => {
    for (const code of ['AUTH_INVALID_TOKEN', 'AUTH_EXPIRED_TOKEN']) {
      const mapped = mapFileStudioError(code);
      expect(mapped.action).toBe('refresh-and-retry');
      expect(mapped.messageKey).toBeNull();
      expect(mapped.retryable).toBe(true);
    }
  });

  test('insufficient scope is an internal alert with a generic user message', () => {
    const mapped = mapFileStudioError('AUTH_INSUFFICIENT_SCOPE');
    expect(mapped.action).toBe('internal-alert');
    expect(mapped.messageKey).toBe('unavailable');
    expect(mapped.retryable).toBe(false);
  });

  test('pairing code errors ask to re-enter or restart pairing', () => {
    expect(mapFileStudioError('PAIRING_CODE_INVALID')).toMatchObject({
      action: 'reenter-pairing-code',
      messageKey: 'pairingCodeInvalid',
    });
    for (const code of ['PAIRING_TOO_MANY_ATTEMPTS', 'PAIRING_EXPIRED']) {
      expect(mapFileStudioError(code)).toMatchObject({
        action: 'restart-pairing',
        messageKey: 'pairingExpired',
      });
    }
  });

  test('device revocation and refresh reuse offer re-pairing', () => {
    for (const code of ['AGENT_DEVICE_REVOKED', 'AUTH_REFRESH_REUSE_DETECTED']) {
      expect(mapFileStudioError(code)).toMatchObject({
        action: 'repair-device',
        messageKey: 'deviceRevoked',
      });
    }
    expect(mapFileStudioError('AGENT_REPAIR_REQUIRED')).toMatchObject({
      action: 'repair-device',
      messageKey: 'repairRequired',
    });
  });

  test('routing errors re-run the routing policy', () => {
    expect(mapFileStudioError('OPERATION_UNAVAILABLE')).toMatchObject({
      action: 'reroute',
      messageKey: 'operationUnavailable',
    });
    expect(mapFileStudioError('UPLOAD_TOO_LARGE')).toMatchObject({
      action: 'reroute',
      messageKey: 'uploadTooLarge',
    });
  });

  test('integrity mismatch fails without blind retry', () => {
    expect(mapFileStudioError('OUTPUT_HASH_MISMATCH')).toMatchObject({
      action: 'fail-no-retry',
      messageKey: 'integrityFailed',
      retryable: false,
    });
  });

  test('emitter bugs stop retrying and stay invisible to the user', () => {
    for (const code of ['IDEMPOTENCY_CONFLICT', 'VALIDATION_FAILED']) {
      const mapped = mapFileStudioError(code);
      expect(mapped.action).toBe('stop-and-log');
      expect(mapped.messageKey).toBeNull();
      expect(mapped.retryable).toBe(false);
    }
  });

  test('consent rejection and offline agent are user-recoverable failures', () => {
    expect(mapFileStudioError(CONSENT_REJECTED_CODE)).toMatchObject({
      action: 'user-recoverable',
      messageKey: 'consentRejected',
      retryable: true,
    });
    expect(mapFileStudioError(AGENT_OFFLINE_CODE)).toMatchObject({
      action: 'user-recoverable',
      messageKey: 'agentOffline',
      retryable: true,
    });
  });

  test('unknown codes fall back to an internal alert with a generic message', () => {
    const mapped = mapFileStudioError('SOME_FUTURE_CODE');
    expect(mapped.action).toBe('internal-alert');
    expect(mapped.messageKey).toBe('unavailable');
    expect(mapped.retryable).toBe(false);
    expect(mapped.code).toBe('SOME_FUTURE_CODE');
  });
});
