/**
 * StructureProfile repository (FASE 3): versioned structural profiles per
 * user. Neon/Drizzle when DATABASE_URL is set, in-memory store otherwise
 * (dev/tests) — same dual-path pattern as `brandProfileRepository`.
 */

import 'server-only';
import { and, desc, eq, ne } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/lib/db';
import { structureProfiles } from '@/lib/db/schema';
import {
  createStructureProfileRecord,
  type CreateStructureProfileInput,
  type StructureProfile,
  type StructureProfileStatus,
} from './model';

type MemoryStructureStore = Map<string, StructureProfile>;

declare global {
  var __ancloraStructureProfileStore: MemoryStructureStore | undefined;
}

function getMemoryStore(): MemoryStructureStore {
  if (!globalThis.__ancloraStructureProfileStore) {
    globalThis.__ancloraStructureProfileStore = new Map();
  }
  return globalThis.__ancloraStructureProfileStore;
}

function mapRow(row: typeof structureProfiles.$inferSelect): StructureProfile {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    version: row.version,
    status: row.status as StructureProfileStatus,
    schema: row.schema as StructureProfile['schema'],
    sourceFileName: row.sourceFileName,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function listFromDb(userId: string): Promise<StructureProfile[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(structureProfiles)
    .where(eq(structureProfiles.userId, userId))
    .orderBy(desc(structureProfiles.updatedAt));
  return rows.map(mapRow);
}

async function listFromMemory(userId: string): Promise<StructureProfile[]> {
  return [...getMemoryStore().values()]
    .filter((profile) => profile.userId === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function getByIdFromDb(userId: string, profileId: string): Promise<StructureProfile | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(structureProfiles)
    .where(and(eq(structureProfiles.id, profileId), eq(structureProfiles.userId, userId)))
    .limit(1);
  return row ? mapRow(row) : null;
}

async function getByIdFromMemory(userId: string, profileId: string): Promise<StructureProfile | null> {
  const profile = getMemoryStore().get(profileId);
  return profile && profile.userId === userId ? profile : null;
}

async function createInDb(userId: string, input: CreateStructureProfileInput): Promise<StructureProfile> {
  const db = getDb();
  const profile = createStructureProfileRecord(userId, input);
  await db.insert(structureProfiles).values({
    id: profile.id,
    userId: profile.userId,
    name: profile.name,
    version: profile.version,
    status: profile.status,
    schema: profile.schema,
    sourceFileName: profile.sourceFileName,
    createdAt: new Date(profile.createdAt),
    updatedAt: new Date(profile.updatedAt),
  });
  return profile;
}

async function createInMemory(userId: string, input: CreateStructureProfileInput): Promise<StructureProfile> {
  const profile = createStructureProfileRecord(userId, input);
  getMemoryStore().set(profile.id, profile);
  return profile;
}

/**
 * Status transition (G4). Activating a profile deprecates every other
 * version of the same structure name owned by the user: at most one active
 * version per name.
 */
async function setStatusInDb(
  userId: string,
  profileId: string,
  status: StructureProfileStatus,
): Promise<StructureProfile | null> {
  const db = getDb();
  const current = await getByIdFromDb(userId, profileId);
  if (!current) return null;

  const now = new Date();
  if (status === 'active') {
    await db
      .update(structureProfiles)
      .set({ status: 'deprecated', updatedAt: now })
      .where(
        and(
          eq(structureProfiles.userId, userId),
          eq(structureProfiles.name, current.name),
          ne(structureProfiles.id, profileId),
        ),
      );
  }
  await db
    .update(structureProfiles)
    .set({ status, updatedAt: now })
    .where(and(eq(structureProfiles.id, profileId), eq(structureProfiles.userId, userId)));

  return { ...current, status, updatedAt: now.toISOString() };
}

async function setStatusInMemory(
  userId: string,
  profileId: string,
  status: StructureProfileStatus,
): Promise<StructureProfile | null> {
  const store = getMemoryStore();
  const current = store.get(profileId);
  if (!current || current.userId !== userId) return null;

  const now = new Date().toISOString();
  if (status === 'active') {
    for (const [id, profile] of store) {
      if (profile.userId === userId && profile.name === current.name && id !== profileId) {
        store.set(id, { ...profile, status: 'deprecated', updatedAt: now });
      }
    }
  }
  const next = { ...current, status, updatedAt: now };
  store.set(profileId, next);
  return next;
}

export const structureProfileRepository = {
  listStructureProfilesForUser(userId: string) {
    return hasDatabase() ? listFromDb(userId) : listFromMemory(userId);
  },
  getStructureProfileById(userId: string, profileId: string) {
    return hasDatabase() ? getByIdFromDb(userId, profileId) : getByIdFromMemory(userId, profileId);
  },
  createStructureProfile(userId: string, input: CreateStructureProfileInput) {
    return hasDatabase() ? createInDb(userId, input) : createInMemory(userId, input);
  },
  setStructureProfileStatus(userId: string, profileId: string, status: StructureProfileStatus) {
    return hasDatabase()
      ? setStatusInDb(userId, profileId, status)
      : setStatusInMemory(userId, profileId, status);
  },
};
