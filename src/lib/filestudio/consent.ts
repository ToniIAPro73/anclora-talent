/**
 * Ask-always consent registry — Talent side.
 *
 * sdd/integrations/filestudio/routing-policy.md: the routing policy rejects
 * an operation when there is no user consent, and no silent mode degradation
 * is allowed. Every decision (grant or deny) is recorded per user, operation
 * and processing mode so the product can audit who consented to what.
 *
 * Ask-always means the decision is taken per job emission: callers must ask
 * the user, then `recordConsent...` before emitting the job. A consent is
 * valid for a single job (`jobId`); a `null` jobId records the answer to a
 * prompt that never reached emission.
 */

import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { filestudioConsents } from '@/lib/db/schema';
import type { ProcessingMode } from './client';

export type ConsentDecision = 'granted' | 'denied';

export interface ConsentRecord {
  userId: string;
  operation: string;
  mode: ProcessingMode;
  decision: ConsentDecision;
  jobId: string | null;
}

type ConsentsStore = Pick<ReturnType<typeof getDb>, 'insert' | 'select'>;

/** Records an explicit consent decision for a user/operation/mode. */
export async function recordConsentForUser(
  db: ConsentsStore,
  record: ConsentRecord,
): Promise<void> {
  await db.insert(filestudioConsents).values({
    userId: record.userId,
    operation: record.operation,
    mode: record.mode,
    decision: record.decision,
    jobId: record.jobId,
  });
}

/**
 * Returns the most recent decision for a user/operation/mode, or null when
 * the user was never asked. The routing policy treats `null` and `denied`
 * the same way: the operation is rejected until the user consents.
 */
export async function latestConsentForUser(
  db: ConsentsStore,
  input: { userId: string; operation: string; mode: ProcessingMode },
): Promise<ConsentDecision | null> {
  const rows = await db
    .select({ decision: filestudioConsents.decision })
    .from(filestudioConsents)
    .where(
      and(
        eq(filestudioConsents.userId, input.userId),
        eq(filestudioConsents.operation, input.operation),
        eq(filestudioConsents.mode, input.mode),
      ),
    )
    .orderBy(desc(filestudioConsents.createdAt))
    .limit(1);

  return (rows[0] as { decision: ConsentDecision } | undefined)?.decision ?? null;
}

// ── Server wrappers (lazy DB) ───────────────────────────────────────────────

export async function recordConsent(record: ConsentRecord) {
  return recordConsentForUser(getDb(), record);
}

export async function latestConsent(input: {
  userId: string;
  operation: string;
  mode: ProcessingMode;
}) {
  return latestConsentForUser(getDb(), input);
}
