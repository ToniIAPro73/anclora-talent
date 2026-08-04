/**
 * AI operations registry (F3, Capa 2 — governance).
 *
 * Append-only audit trail of ACCEPTED AI proposals: who accepted, when, the
 * proposal kind and summary, the processing mode (cloud/local) and the
 * affected blocks. It feeds two consumers:
 * - auditability of every AI write over the manuscript;
 * - the KDP AI-content disclosure (`kdp-disclosure.ts`), which summarizes
 *   which AI operations were accepted.
 *
 * Persistence reuses the existing `activity_log` table (eventType
 * `ai_operation.accepted`, full record as jsonb payload) — no schema change.
 * Same dual-path pattern as the other repositories: Neon/Drizzle when
 * DATABASE_URL is set, in-memory store otherwise (dev/tests).
 */

import 'server-only';
import { and, asc, eq } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/lib/db';
import { activityLog } from '@/lib/db/schema';
import type { AiProposalKind } from './ast-diff-proposal';
import type { AiProcessingMode } from './structural-assistant';

export const AI_OPERATION_EVENT = 'ai_operation.accepted';

export interface AiOperationRecord {
  id: string;
  projectId: string;
  userId: string;
  /** Id of the accepted AiProposal. */
  proposalId: string;
  kind: AiProposalKind;
  /** Human-readable one-liner (localized at proposal time). */
  summary: string;
  /** Processing mode declared by the UI when the proposal was generated. */
  mode: AiProcessingMode;
  affectedBlockIds: string[];
  createdAt: string;
}

export type RecordAiOperationInput = Omit<AiOperationRecord, 'id' | 'projectId' | 'userId' | 'createdAt'>;

type MemoryStore = Map<string, AiOperationRecord[]>;

declare global {
  var __ancloraAiOperationsStore: MemoryStore | undefined;
}

function getMemoryStore(): MemoryStore {
  if (!globalThis.__ancloraAiOperationsStore) {
    globalThis.__ancloraAiOperationsStore = new Map();
  }
  return globalThis.__ancloraAiOperationsStore;
}

function buildRecord(
  userId: string,
  projectId: string,
  input: RecordAiOperationInput,
  id: string = crypto.randomUUID(),
  now: string = new Date().toISOString(),
): AiOperationRecord {
  return { id, projectId, userId, createdAt: now, ...input };
}

async function recordInDb(
  userId: string,
  projectId: string,
  input: RecordAiOperationInput,
): Promise<AiOperationRecord> {
  const db = getDb();
  const record = buildRecord(userId, projectId, input);
  await db.insert(activityLog).values({
    id: record.id,
    userId,
    projectId,
    eventType: AI_OPERATION_EVENT,
    payload: record,
    createdAt: new Date(record.createdAt),
  });
  return record;
}

async function recordInMemory(
  userId: string,
  projectId: string,
  input: RecordAiOperationInput,
): Promise<AiOperationRecord> {
  const record = buildRecord(userId, projectId, input);
  const store = getMemoryStore();
  store.set(projectId, [...(store.get(projectId) ?? []), record]);
  return record;
}

async function listFromDb(userId: string, projectId: string): Promise<AiOperationRecord[]> {
  const db = getDb();
  const rows = await db
    .select({ payload: activityLog.payload })
    .from(activityLog)
    .where(
      and(
        eq(activityLog.userId, userId),
        eq(activityLog.projectId, projectId),
        eq(activityLog.eventType, AI_OPERATION_EVENT),
      ),
    )
    .orderBy(asc(activityLog.createdAt));
  return rows
    .map((row) => row.payload as AiOperationRecord)
    .filter((record) => record && typeof record.proposalId === 'string');
}

async function listFromMemory(userId: string, projectId: string): Promise<AiOperationRecord[]> {
  return (getMemoryStore().get(projectId) ?? []).filter((record) => record.userId === userId);
}

export const aiOperationsLog = {
  record(userId: string, projectId: string, input: RecordAiOperationInput) {
    return hasDatabase() ? recordInDb(userId, projectId, input) : recordInMemory(userId, projectId, input);
  },
  list(userId: string, projectId: string) {
    return hasDatabase() ? listFromDb(userId, projectId) : listFromMemory(userId, projectId);
  },
};
