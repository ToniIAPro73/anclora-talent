'use server';

/**
 * Server actions — sales channels (F4).
 *
 * Thin wrappers: auth + ownership + database gate here, product logic in
 * launch-kit.ts / channels/*. The Gumroad token is verified against the live
 * API before it is stored, it is only decrypted server-side to build the
 * push client, and it is never returned to the client (the UI only learns
 * "connected").
 */

import { buildKdpDisclosure } from '@/lib/ai/kdp-disclosure';
import { aiOperationsLog } from '@/lib/ai/operations-log';
import { requireUserId } from '@/lib/auth/guards';
import { projectToSemanticDocument } from '@/lib/compose/preview-adapter';
import { getDb, hasDatabase } from '@/lib/db';
import { projectRepository } from '@/lib/db/repositories';
import { getLatestManifest } from '@/lib/manifest/repository';
import type { ProjectRecord } from '@/lib/projects/types';
import { GumroadApiError, GumroadCircuitOpenError, GumroadClient } from './channels/gumroad';
import { buildHotmartExportPackage, type HotmartExportPackage } from './channels/hotmart';
import { getSalesCredentialsKey, isGumroadFlagEnabled } from './config';
import { deleteChannelToken, getChannelToken, hasChannelToken, saveChannelToken } from './credentials';
import { buildLaunchKit, buildProductDescriptionHtml, type LaunchKit } from './launch-kit';

export type SalesActionError =
  | 'unavailable'
  | 'notFound'
  | 'notConfigured'
  | 'auth'
  | 'validation'
  | 'circuitOpen';

export type SalesActionResult<T> = { ok: true; data: T } | { ok: false; error: SalesActionError };

export interface PublishChannelsState {
  gumroad: { enabled: boolean; connected: boolean };
  hotmart: { available: true };
}

function mapGumroadError(error: unknown): SalesActionError {
  if (error instanceof GumroadCircuitOpenError) return 'circuitOpen';
  if (error instanceof GumroadApiError) {
    return error.code === 'AUTH' ? 'auth' : error.code === 'VALIDATION' ? 'validation' : 'unavailable';
  }
  return 'unavailable';
}

/** Loads the project + builds the launch kit (AST + manifest + disclosure). */
async function buildKitForProject(userId: string, projectId: string): Promise<LaunchKit | null> {
  const project: ProjectRecord | null = await projectRepository.getProjectById(userId, projectId);
  if (!project) return null;

  const { document } = projectToSemanticDocument(project);
  const manifest = await getLatestManifest(getDb(), projectId);
  const disclosure = buildKdpDisclosure({
    provenance: project.document.provenance,
    operations: await aiOperationsLog.list(userId, projectId),
  });

  return buildLaunchKit(document, {
    manifestItems: manifest?.items ?? [],
    aiDisclosure: disclosure.required ? disclosure.text : null,
  });
}

/** Channel states for the publish panel (no secrets, booleans only). */
export async function getPublishChannelsStateAction(): Promise<SalesActionResult<PublishChannelsState>> {
  if (!hasDatabase()) return { ok: false, error: 'unavailable' };
  const userId = await requireUserId();

  const connected = await hasChannelToken(getDb(), { userId, channel: 'gumroad' });
  return {
    ok: true,
    data: {
      gumroad: { enabled: isGumroadFlagEnabled(), connected },
      hotmart: { available: true },
    },
  };
}

/** Launch kit preview (product sheet + landing copy + assets + disclosure). */
export async function getLaunchKitAction(input: {
  projectId: string;
}): Promise<SalesActionResult<LaunchKit>> {
  if (!hasDatabase()) return { ok: false, error: 'unavailable' };
  const userId = await requireUserId();

  const kit = await buildKitForProject(userId, input.projectId);
  if (!kit) return { ok: false, error: 'notFound' };
  return { ok: true, data: kit };
}

/**
 * Verifies the Gumroad token against the live API and stores it encrypted.
 * Verification first: a wrong/revoked token never reaches the table.
 */
export async function saveGumroadTokenAction(input: {
  token: string;
}): Promise<SalesActionResult<{ connected: true }>> {
  if (!hasDatabase()) return { ok: false, error: 'unavailable' };
  const userId = await requireUserId();

  const keyHex = getSalesCredentialsKey();
  if (!keyHex) return { ok: false, error: 'notConfigured' };

  const token = input.token.trim();
  if (!token) return { ok: false, error: 'validation' };

  try {
    const client = new GumroadClient({ tokenProvider: async () => token });
    await client.verifyToken();
  } catch (error) {
    return { ok: false, error: mapGumroadError(error) };
  }

  await saveChannelToken(getDb(), { userId, channel: 'gumroad', token, keyHex });
  return { ok: true, data: { connected: true } };
}

/** Disconnects Gumroad (drops the stored token). */
export async function removeGumroadTokenAction(): Promise<SalesActionResult<{ connected: false }>> {
  if (!hasDatabase()) return { ok: false, error: 'unavailable' };
  const userId = await requireUserId();
  await deleteChannelToken(getDb(), { userId, channel: 'gumroad' });
  return { ok: true, data: { connected: false } };
}

export interface GumroadPushResult {
  productId: string;
  shortUrl: string | null;
  published: boolean;
}

/**
 * Push: creates the Gumroad product as DRAFT from the current launch kit.
 * Gumroad itself forces draft state server-side (`draft=true`,
 * `purchase_disabled_at`) — the seller publishes from the dashboard.
 */
export async function pushToGumroadAction(input: {
  projectId: string;
  priceCents: number;
}): Promise<SalesActionResult<GumroadPushResult>> {
  if (!hasDatabase()) return { ok: false, error: 'unavailable' };
  const userId = await requireUserId();

  if (!Number.isInteger(input.priceCents) || input.priceCents < 0) {
    return { ok: false, error: 'validation' };
  }
  const keyHex = getSalesCredentialsKey();
  if (!keyHex) return { ok: false, error: 'notConfigured' };

  const kit = await buildKitForProject(userId, input.projectId);
  if (!kit) return { ok: false, error: 'notFound' };

  const token = await getChannelToken(getDb(), { userId, channel: 'gumroad', keyHex });
  if (!token) return { ok: false, error: 'auth' };

  try {
    const client = new GumroadClient({ tokenProvider: async () => token });
    const product = await client.createDraftProduct({
      name: kit.sheet.title,
      priceCents: input.priceCents,
      descriptionHtml: buildProductDescriptionHtml(kit.sheet),
      tags: kit.sheet.keywords,
      customSummary: kit.sheet.subtitle ?? undefined,
    });
    return {
      ok: true,
      data: { productId: product.id, shortUrl: product.shortUrl, published: product.published },
    };
  } catch (error) {
    return { ok: false, error: mapGumroadError(error) };
  }
}

/**
 * Hotmart export: the manual-upload package (sheet + landing copy +
 * structured JSON + disclosure). The client zips/downloads the files.
 */
export async function exportHotmartAction(input: {
  projectId: string;
  locale?: 'es' | 'en';
}): Promise<SalesActionResult<HotmartExportPackage>> {
  if (!hasDatabase()) return { ok: false, error: 'unavailable' };
  const userId = await requireUserId();

  const kit = await buildKitForProject(userId, input.projectId);
  if (!kit) return { ok: false, error: 'notFound' };
  return { ok: true, data: buildHotmartExportPackage(kit, { locale: input.locale }) };
}
