import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, eq, gt, lt } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/lib/db';
import { importSessions } from '@/lib/db/schema';
import type { DocumentMode, SourceDocumentAccessLevel } from './types';
import type { CompositionSettings } from './composition';
import type { ImportedDocumentSeed } from './types';

export interface CreateImportSessionInput {
  sourceFileName: string;
  sourceMimeType: string;
  sourceBlobUrl?: string | null;
  sourceAccessLevel?: SourceDocumentAccessLevel | null;
  sourceSha256?: string | null;
  sourceSizeBytes?: number | null;
  documentMode?: DocumentMode;
  extractedSeed: ImportedDocumentSeed;
  composition?: CompositionSettings | null;
  expiresInMs?: number;
}

export interface ImportSessionRecord {
  id: string;
  userId: string;
  sourceFileName: string;
  sourceMimeType: string;
  sourceBlobUrl: string | null;
  sourceAccessLevel: SourceDocumentAccessLevel | null;
  sourceSha256: string | null;
  sourceSizeBytes: number | null;
  documentMode: DocumentMode;
  extractedSeed: ImportedDocumentSeed;
  composition: CompositionSettings | null;
  status: 'ready' | 'consumed' | 'expired';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DEFAULT_SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const memorySessions = new Map<string, ImportSessionRecord>();

export const importSessionRepository = {
  async createImportSession(
    userId: string,
    input: CreateImportSessionInput,
  ): Promise<ImportSessionRecord> {
    const expiresAt = new Date(Date.now() + (input.expiresInMs ?? DEFAULT_SESSION_TTL_MS));

    if (!hasDatabase()) {
      const record: ImportSessionRecord = {
        id: randomUUID(),
        userId,
        sourceFileName: input.sourceFileName,
        sourceMimeType: input.sourceMimeType,
        sourceBlobUrl: input.sourceBlobUrl ?? null,
        sourceAccessLevel: input.sourceAccessLevel ?? null,
        sourceSha256: input.sourceSha256 ?? null,
        sourceSizeBytes: input.sourceSizeBytes ?? null,
        documentMode: input.documentMode ?? 'editable',
        extractedSeed: input.extractedSeed,
        composition: input.composition ?? null,
        status: 'ready',
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      memorySessions.set(record.id, record);
      return record;
    }

    const db = getDb();
    const [row] = await db
      .insert(importSessions)
      .values({
        userId,
        sourceFileName: input.sourceFileName,
        sourceMimeType: input.sourceMimeType,
        sourceBlobUrl: input.sourceBlobUrl ?? null,
        sourceAccessLevel: input.sourceAccessLevel ?? null,
        sourceSha256: input.sourceSha256 ?? null,
        sourceSizeBytes: input.sourceSizeBytes ?? null,
        documentMode: input.documentMode ?? 'editable',
        extractedSeed: input.extractedSeed as unknown as Record<string, unknown>,
        composition: (input.composition as unknown as Record<string, unknown>) ?? null,
        status: 'ready',
        expiresAt,
      })
      .returning();

    return row as unknown as ImportSessionRecord;
  },

  async getImportSession(
    userId: string,
    sessionId: string,
  ): Promise<ImportSessionRecord | null> {
    const now = new Date();

    if (!hasDatabase()) {
      const record = memorySessions.get(sessionId);
      if (!record || record.userId !== userId || record.status !== 'ready' || record.expiresAt <= now) {
        return null;
      }
      return record;
    }

    const db = getDb();
    const [row] = await db
      .select()
      .from(importSessions)
      .where(
        and(
          eq(importSessions.id, sessionId),
          eq(importSessions.userId, userId),
          eq(importSessions.status, 'ready'),
          gt(importSessions.expiresAt, now),
        ),
      )
      .limit(1);

    if (!row) return null;
    return row as unknown as ImportSessionRecord;
  },

  async consumeImportSession(
    userId: string,
    sessionId: string,
  ): Promise<ImportSessionRecord | null> {
    const now = new Date();

    if (!hasDatabase()) {
      const record = memorySessions.get(sessionId);
      if (!record || record.userId !== userId || record.status !== 'ready' || record.expiresAt <= now) {
        return null;
      }
      record.status = 'consumed';
      record.updatedAt = now;
      return record;
    }

    const db = getDb();
    const [row] = await db
      .update(importSessions)
      .set({
        status: 'consumed',
        updatedAt: now,
      })
      .where(
        and(
          eq(importSessions.id, sessionId),
          eq(importSessions.userId, userId),
          eq(importSessions.status, 'ready'),
          gt(importSessions.expiresAt, now),
        ),
      )
      .returning();

    if (!row) return null;
    return row as unknown as ImportSessionRecord;
  },

  async deleteImportSession(userId: string, sessionId: string): Promise<boolean> {
    if (!hasDatabase()) {
      const record = memorySessions.get(sessionId);
      if (record && record.userId === userId) {
        return memorySessions.delete(sessionId);
      }
      return false;
    }

    const db = getDb();
    const deleted = await db
      .delete(importSessions)
      .where(and(eq(importSessions.id, sessionId), eq(importSessions.userId, userId)))
      .returning({ id: importSessions.id });

    return deleted.length > 0;
  },

  async cleanupExpiredSessions(): Promise<number> {
    const now = new Date();

    if (!hasDatabase()) {
      let count = 0;
      for (const [id, session] of memorySessions.entries()) {
        if (session.status === 'ready' && session.expiresAt <= now) {
          memorySessions.delete(id);
          count++;
        }
      }
      return count;
    }

    const db = getDb();
    const deleted = await db
      .delete(importSessions)
      .where(and(eq(importSessions.status, 'ready'), lt(importSessions.expiresAt, now)))
      .returning({ id: importSessions.id });

    return deleted.length;
  },
};
