/**
 * BrandProfile repository (FASE 2): versioned theme packs per user.
 * Neon/Drizzle when DATABASE_URL is set, in-memory store otherwise (dev/tests)
 * — same dual-path pattern as `projectRepository`.
 */

import 'server-only';
import { and, desc, eq, ne } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/lib/db';
import { brandProfiles } from '@/lib/db/schema';
import {
  createBrandProfileRecord,
  type BrandProfile,
  type BrandProfileStatus,
  type CreateBrandProfileInput,
} from './brand-profile';

type MemoryBrandStore = Map<string, BrandProfile>;

declare global {
  var __ancloraBrandProfileStore: MemoryBrandStore | undefined;
}

function getMemoryStore(): MemoryBrandStore {
  if (!globalThis.__ancloraBrandProfileStore) {
    globalThis.__ancloraBrandProfileStore = new Map();
  }
  return globalThis.__ancloraBrandProfileStore;
}

function mapRow(row: typeof brandProfiles.$inferSelect): BrandProfile {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    version: row.version,
    status: row.status as BrandProfileStatus,
    palette: row.palette as BrandProfile['palette'],
    typography: row.typography as BrandProfile['typography'],
    usageProportions: (row.usageProportions ?? null) as BrandProfile['usageProportions'],
    governanceRules: (row.governanceRules ?? []) as string[],
    voicePairs: (row.voicePairs ?? []) as BrandProfile['voicePairs'],
    sourceFileName: row.sourceFileName,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function listFromDb(userId: string): Promise<BrandProfile[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(brandProfiles)
    .where(eq(brandProfiles.userId, userId))
    .orderBy(desc(brandProfiles.updatedAt));
  return rows.map(mapRow);
}

async function listFromMemory(userId: string): Promise<BrandProfile[]> {
  return [...getMemoryStore().values()]
    .filter((profile) => profile.userId === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function getByIdFromDb(userId: string, profileId: string): Promise<BrandProfile | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(brandProfiles)
    .where(and(eq(brandProfiles.id, profileId), eq(brandProfiles.userId, userId)))
    .limit(1);
  return row ? mapRow(row) : null;
}

async function getByIdFromMemory(userId: string, profileId: string): Promise<BrandProfile | null> {
  const profile = getMemoryStore().get(profileId);
  return profile && profile.userId === userId ? profile : null;
}

async function createInDb(userId: string, input: CreateBrandProfileInput): Promise<BrandProfile> {
  const db = getDb();
  const profile = createBrandProfileRecord(userId, input);
  await db.insert(brandProfiles).values({
    id: profile.id,
    userId: profile.userId,
    name: profile.name,
    version: profile.version,
    status: profile.status,
    palette: profile.palette,
    typography: profile.typography,
    usageProportions: profile.usageProportions,
    governanceRules: profile.governanceRules,
    voicePairs: profile.voicePairs,
    sourceFileName: profile.sourceFileName,
    createdAt: new Date(profile.createdAt),
    updatedAt: new Date(profile.updatedAt),
  });
  return profile;
}

async function createInMemory(userId: string, input: CreateBrandProfileInput): Promise<BrandProfile> {
  const profile = createBrandProfileRecord(userId, input);
  getMemoryStore().set(profile.id, profile);
  return profile;
}

/**
 * Status transition (G4). Activating a profile deprecates every other
 * version of the same brand name owned by the user: at most one active
 * version per name.
 */
async function setStatusInDb(
  userId: string,
  profileId: string,
  status: BrandProfileStatus,
): Promise<BrandProfile | null> {
  const db = getDb();
  const current = await getByIdFromDb(userId, profileId);
  if (!current) return null;

  const now = new Date();
  if (status === 'active') {
    await db
      .update(brandProfiles)
      .set({ status: 'deprecated', updatedAt: now })
      .where(
        and(
          eq(brandProfiles.userId, userId),
          eq(brandProfiles.name, current.name),
          ne(brandProfiles.id, profileId),
        ),
      );
  }
  await db
    .update(brandProfiles)
    .set({ status, updatedAt: now })
    .where(and(eq(brandProfiles.id, profileId), eq(brandProfiles.userId, userId)));

  return { ...current, status, updatedAt: now.toISOString() };
}

async function setStatusInMemory(
  userId: string,
  profileId: string,
  status: BrandProfileStatus,
): Promise<BrandProfile | null> {
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

export const brandProfileRepository = {
  listBrandProfilesForUser(userId: string) {
    return hasDatabase() ? listFromDb(userId) : listFromMemory(userId);
  },
  getBrandProfileById(userId: string, profileId: string) {
    return hasDatabase() ? getByIdFromDb(userId, profileId) : getByIdFromMemory(userId, profileId);
  },
  createBrandProfile(userId: string, input: CreateBrandProfileInput) {
    return hasDatabase() ? createInDb(userId, input) : createInMemory(userId, input);
  },
  setBrandProfileStatus(userId: string, profileId: string, status: BrandProfileStatus) {
    return hasDatabase()
      ? setStatusInDb(userId, profileId, status)
      : setStatusInMemory(userId, profileId, status);
  },
};
