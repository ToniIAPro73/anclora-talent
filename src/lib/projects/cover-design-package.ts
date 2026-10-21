import type { DesignSurface } from './design-surface';
import { designSurfaceSchema } from './design-surface-schema';

export const COVER_DESIGN_PACKAGE_FORMAT = 'anclora-talent-cover-design';
export const COVER_DESIGN_PACKAGE_VERSION = 1;
export const MAX_COVER_DESIGN_PACKAGE_BYTES = 32 * 1024 * 1024;
const MAX_EMBEDDED_ASSET_BYTES = 20 * 1024 * 1024;

export interface CoverDesignPackageV1 {
  format: typeof COVER_DESIGN_PACKAGE_FORMAT;
  schemaVersion: typeof COVER_DESIGN_PACKAGE_VERSION;
  surfaces: {
    cover: DesignSurface;
    'back-cover': DesignSurface;
  };
}

function assertNoUnknownFields(input: unknown, parsed: unknown, path = 'package'): void {
  if (Array.isArray(input)) {
    if (!Array.isArray(parsed)) return;
    input.forEach((value, index) => assertNoUnknownFields(value, parsed[index], `${path}[${index}]`));
    return;
  }
  if (!input || typeof input !== 'object' || !parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;
  const inputObject = input as Record<string, unknown>;
  const parsedObject = parsed as Record<string, unknown>;
  for (const key of Object.keys(inputObject)) {
    if (!Object.prototype.hasOwnProperty.call(parsedObject, key)) {
      throw new Error(`Unsupported field at ${path}.${key}; the file was not imported.`);
    }
    assertNoUnknownFields(inputObject[key], parsedObject[key], `${path}.${key}`);
  }
}

function assertUniqueIds(surface: DesignSurface, path: string): void {
  const layerIds = surface.layers.map((layer) => layer.id);
  if (new Set(layerIds).size !== layerIds.length) throw new Error(`Duplicate layer IDs in ${path}.`);
  const guideIds = (surface.guides ?? []).map((guide) => guide.id);
  if (new Set(guideIds).size !== guideIds.length) throw new Error(`Duplicate guide IDs in ${path}.`);
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

async function makeAssetPortable(src: string): Promise<string> {
  if (!src) return src;
  if (src.startsWith('blob:')) throw new Error('A temporary blob URL cannot be exported. Save or replace that image, then export again.');
  if (src.startsWith('data:image/')) {
    const match = src.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) throw new Error('An image data URL is malformed and cannot be exported.');
    const estimatedBytes = Math.floor((match[2].length * 3) / 4);
    if (estimatedBytes > MAX_EMBEDDED_ASSET_BYTES) throw new Error('An embedded image exceeds the 20 MB per-image export limit.');
    return src;
  }

  let url: URL;
  try {
    url = new URL(src, window.location.origin);
  } catch {
    throw new Error('An image source is not a portable URL and cannot be exported.');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Only HTTP(S) images or embedded image data can be exported.');
  }

  let response: Response;
  try {
    response = await fetch(url.href, { credentials: url.origin === window.location.origin ? 'same-origin' : 'omit' });
  } catch {
    throw new Error('An image could not be downloaded for the portable JSON file. Check its access and try again.');
  }
  if (!response.ok) throw new Error(`An image could not be downloaded (HTTP ${response.status}).`);
  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) throw new Error('An image URL returned a non-image file and was not exported.');
  if (blob.size > MAX_EMBEDDED_ASSET_BYTES) throw new Error('An image exceeds the 20 MB per-image export limit.');
  return `data:${blob.type};base64,${encodeBase64(new Uint8Array(await blob.arrayBuffer()))}`;
}

async function makeSurfaceAssetsPortable(surface: DesignSurface): Promise<DesignSurface> {
  const background = surface.background.kind === 'image'
    ? { ...surface.background, src: await makeAssetPortable(surface.background.src) }
    : surface.background;
  const layers = await Promise.all(surface.layers.map(async (layer) =>
    layer.type === 'image' ? { ...layer, src: await makeAssetPortable(layer.src) } : layer,
  ));
  return { ...surface, background, layers };
}

function utf8Size(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function validateSurface(input: unknown, key: 'cover' | 'back-cover'): DesignSurface {
  const result = designSurfaceSchema.safeParse(input);
  if (!result.success) {
    const detail = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    throw new Error(`Invalid ${key} surface: ${detail}`);
  }
  assertNoUnknownFields(input, result.data, `surfaces.${key}`);
  if (result.data.surface !== key) throw new Error(`Surface mismatch: ${key} contains ${result.data.surface}.`);
  const surface = result.data as DesignSurface;
  assertUniqueIds(surface, key);
  return surface;
}

export async function createCoverDesignPackage(surfaces: CoverDesignPackageV1['surfaces']): Promise<string> {
  const candidates = [surfaces.cover, surfaces['back-cover']].flatMap((surface) => [
    ...(surface.background.kind === 'image' ? [surface.background.src] : []),
    ...surface.layers.filter((layer) => layer.type === 'image').map((layer) => layer.src),
  ]);
  if (candidates.some((src) => src.startsWith('blob:'))) {
    throw new Error('A temporary blob URL cannot be exported. Save or replace that image, then export again.');
  }
  const cover = validateSurface(surfaces.cover, 'cover');
  const backCover = validateSurface(surfaces['back-cover'], 'back-cover');
  const portable = {
    format: COVER_DESIGN_PACKAGE_FORMAT,
    schemaVersion: COVER_DESIGN_PACKAGE_VERSION,
    surfaces: {
      cover: await makeSurfaceAssetsPortable(cover),
      'back-cover': await makeSurfaceAssetsPortable(backCover),
    },
  } satisfies CoverDesignPackageV1;
  const serialized = JSON.stringify(portable, null, 2);
  if (utf8Size(serialized) > MAX_COVER_DESIGN_PACKAGE_BYTES) {
    throw new Error('The editable JSON file exceeds the 32 MB package limit. Reduce image sizes and export again.');
  }
  return serialized;
}

export function parseCoverDesignPackage(serialized: string): CoverDesignPackageV1 {
  if (utf8Size(serialized) > MAX_COVER_DESIGN_PACKAGE_BYTES) throw new Error('The editable JSON file exceeds the 32 MB package limit.');
  let input: unknown;
  try {
    input = JSON.parse(serialized);
  } catch {
    throw new Error('The file is not valid JSON.');
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('The JSON file must contain an Anclora Talent cover design package.');
  const record = input as Record<string, unknown>;
  if (record.format !== COVER_DESIGN_PACKAGE_FORMAT) throw new Error('The JSON file format is not recognized as an Anclora Talent cover design.');
  if (record.schemaVersion !== COVER_DESIGN_PACKAGE_VERSION) throw new Error(`Unsupported editable JSON version: ${String(record.schemaVersion)}.`);
  const allowedRoot = new Set(['format', 'schemaVersion', 'surfaces']);
  const unknownRoot = Object.keys(record).find((key) => !allowedRoot.has(key));
  if (unknownRoot) throw new Error(`Unsupported package field: ${unknownRoot}.`);
  if (!record.surfaces || typeof record.surfaces !== 'object' || Array.isArray(record.surfaces)) throw new Error('The package must contain both cover and back-cover surfaces.');
  const surfaceRecord = record.surfaces as Record<string, unknown>;
  const unknownSurface = Object.keys(surfaceRecord).find((key) => key !== 'cover' && key !== 'back-cover');
  if (unknownSurface) throw new Error(`Unsupported surface: ${unknownSurface}.`);
  if (!('cover' in surfaceRecord) || !('back-cover' in surfaceRecord)) throw new Error('The package must contain both cover and back-cover surfaces.');
  const cover = validateSurface(surfaceRecord.cover, 'cover');
  const backCover = validateSurface(surfaceRecord['back-cover'], 'back-cover');
  for (const surface of [cover, backCover]) {
    const sources = [
      ...(surface.background.kind === 'image' ? [surface.background.src] : []),
      ...surface.layers.filter((layer) => layer.type === 'image').map((layer) => layer.src),
    ];
    if (sources.some((src) => src && !src.startsWith('data:image/'))) {
      throw new Error('This package contains a non-portable image reference. Import was stopped without changing the project.');
    }
  }
  return {
    format: COVER_DESIGN_PACKAGE_FORMAT,
    schemaVersion: COVER_DESIGN_PACKAGE_VERSION,
    surfaces: { cover, 'back-cover': backCover },
  };
}

/** Parse only the surface requested by the active editor; companion data is intentionally ignored. */
export function parseCoverDesignSurfacePackage(serialized: string, target: 'cover' | 'back-cover'): DesignSurface {
  if (utf8Size(serialized) > MAX_COVER_DESIGN_PACKAGE_BYTES) throw new Error('The editable JSON file exceeds the 32 MB package limit.');
  let input: unknown;
  try {
    input = JSON.parse(serialized);
  } catch {
    throw new Error('The file is not valid JSON.');
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('The JSON file must contain an Anclora Talent cover design package.');
  const record = input as Record<string, unknown>;
  if (record.format !== COVER_DESIGN_PACKAGE_FORMAT) throw new Error('The JSON file format is not recognized as an Anclora Talent cover design.');
  if (record.schemaVersion !== COVER_DESIGN_PACKAGE_VERSION) throw new Error(`Unsupported editable JSON version: ${String(record.schemaVersion)}.`);
  const allowedRoot = new Set(['format', 'schemaVersion', 'surfaces']);
  const unknownRoot = Object.keys(record).find((key) => !allowedRoot.has(key));
  if (unknownRoot) throw new Error(`Unsupported package field: ${unknownRoot}.`);
  if (!record.surfaces || typeof record.surfaces !== 'object' || Array.isArray(record.surfaces)) throw new Error('The package must contain the active surface.');
  const surfaceRecord = record.surfaces as Record<string, unknown>;
  const unknownSurface = Object.keys(surfaceRecord).find((key) => key !== 'cover' && key !== 'back-cover');
  if (unknownSurface) throw new Error(`Unsupported surface: ${unknownSurface}.`);
  if (!(target in surfaceRecord)) throw new Error(`The package does not contain the active ${target} surface.`);
  const surface = validateSurface(surfaceRecord[target], target);
  const sources = [
    ...(surface.background.kind === 'image' ? [surface.background.src] : []),
    ...surface.layers.filter((layer) => layer.type === 'image').map((layer) => layer.src),
  ];
  if (sources.some((src) => src && !src.startsWith('data:image/'))) {
    throw new Error('This package contains a non-portable image reference. Import was stopped without changing the project.');
  }
  return surface;
}
