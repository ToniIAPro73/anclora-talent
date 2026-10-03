import { createHash } from 'node:crypto';
import JSZip from 'jszip';

export type ProjectFontVariant = 'regular' | 'bold' | 'italic' | 'bold-italic';
export type FontEmbeddingPermission = 'installable' | 'editable' | 'preview-print' | 'restricted' | 'unknown';
export type ProjectFontValidation = 'valid' | 'invalid';

export interface ProjectFontAsset {
  id: string;
  sourceFamily: string;
  variant: ProjectFontVariant;
  sha256: string;
  format: 'ttf' | 'otf' | 'woff' | 'woff2';
  origin: 'docx-embedded' | 'odt-embedded';
  sourcePath: string;
  embedding: 'embedded';
  permission: FontEmbeddingPermission;
  validation: ProjectFontValidation;
  usable: boolean;
  /** Serialized project-scoped payload. Never added to the global catalog. */
  dataBase64?: string;
}

const MAX_FONT_BYTES = 4 * 1024 * 1024;
const MAX_FONT_ASSETS = 8;

function familyKey(value: string) {
  return value.trim().replace(/^['"]|['"]$/g, '').toLowerCase();
}

function safeName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'font';
}

function detectFormat(path: string, bytes: Uint8Array): ProjectFontAsset['format'] | null {
  const lower = path.toLowerCase();
  if (bytes.length >= 4 && bytes[0] === 0x77 && bytes[1] === 0x4f && bytes[2] === 0x46 && bytes[3] === 0x46) return 'woff';
  if (bytes.length >= 4 && bytes[0] === 0x77 && bytes[1] === 0x4f && bytes[2] === 0x46 && bytes[3] === 0x32) return 'woff2';
  if (bytes.length >= 4 && ((bytes[0] === 0x4f && bytes[1] === 0x54 && bytes[2] === 0x54 && bytes[3] === 0x4f) || (bytes[0] === 0x00 && bytes[1] === 0x01 && bytes[2] === 0x00 && bytes[3] === 0x00))) return lower.endsWith('.otf') ? 'otf' : 'ttf';
  return null;
}

function permissionFromFsType(bytes: Uint8Array): FontEmbeddingPermission {
  if (bytes.length < 12 || bytes[0] !== 0 || bytes[1] !== 1) return 'unknown';
  const numTables = (bytes[4] << 8) | bytes[5];
  let offset = 12;
  for (let i = 0; i < numTables; i += 1) {
    if (offset + 16 > bytes.length) return 'unknown';
    const tag = String.fromCharCode(...bytes.slice(offset, offset + 4));
    const tableOffset = bytes[offset + 8] * 0x1000000 + (bytes[offset + 9] << 16) + (bytes[offset + 10] << 8) + bytes[offset + 11];
    if (tag === 'OS/2') {
      if (tableOffset + 10 > bytes.length) return 'unknown';
      const fsType = (bytes[tableOffset + 8] << 8) | bytes[tableOffset + 9];
      if (fsType === 0) return 'installable';
      if (fsType & 0x0002) return 'restricted';
      if (fsType & 0x0008) return 'editable';
      if (fsType & 0x0004) return 'preview-print';
      return 'unknown';
    }
    offset += 16;
  }
  return 'unknown';
}

function deobfuscateOoXmlFont(bytes: Uint8Array, key: string | undefined) {
  if (!key || bytes.length < 32) return bytes;
  const hex = key.replace(/[{}-]/g, '');
  if (!/^[0-9a-f]{32}$/i.test(hex)) return bytes;
  // ECMA-376 Part 1: reverse the first three GUID fields, then XOR 32 bytes.
  const guid = Buffer.from(hex, 'hex');
  const first = Buffer.from([...guid.subarray(0, 4)].reverse());
  const second = Buffer.from([...guid.subarray(4, 6)].reverse());
  const third = Buffer.from([...guid.subarray(6, 8)].reverse());
  const keyBytes = Buffer.concat([first, second, third, guid.subarray(8)]);
  const result = new Uint8Array(bytes);
  for (let i = 0; i < 32; i += 1) result[i] ^= keyBytes[i];
  return result;
}

function makeAsset(input: { family: string; variant: ProjectFontVariant; path: string; bytes: Uint8Array; origin: ProjectFontAsset['origin']; key?: string }): ProjectFontAsset | null {
  if (!input.family.trim() || input.bytes.byteLength === 0 || input.bytes.byteLength > MAX_FONT_BYTES) return null;
  const bytes = input.origin === 'docx-embedded' ? deobfuscateOoXmlFont(input.bytes, input.key) : input.bytes;
  const format = detectFormat(input.path, bytes);
  const permission = format === 'ttf' || format === 'otf' ? permissionFromFsType(bytes) : 'unknown';
  const validation = format ? 'valid' : 'invalid';
  const usable = validation === 'valid' && (permission === 'installable' || permission === 'editable');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  return {
    id: `project-font-${sha256.slice(0, 16)}`,
    sourceFamily: input.family.trim(),
    variant: input.variant,
    sha256,
    format: format ?? 'ttf',
    origin: input.origin,
    sourcePath: safeName(input.path),
    embedding: 'embedded',
    permission,
    validation,
    usable,
    ...(usable ? { dataBase64: Buffer.from(bytes).toString('base64') } : {}),
  };
}

const VARIANT_BY_ELEMENT: Record<string, ProjectFontVariant> = {
  embedRegular: 'regular', embedBold: 'bold', embedItalic: 'italic', embedBoldItalic: 'bold-italic',
};

export async function extractDocxProjectFontAssets(buffer: Buffer): Promise<ProjectFontAsset[]> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    return [];
  }
  const table = await zip.file('word/fontTable.xml')?.async('text');
  if (!table) return [];
  const rels = await zip.file('word/_rels/fontTable.xml.rels')?.async('text');
  if (!rels) return [];
  const relationshipMap = new Map<string, string>();
  for (const match of rels.matchAll(/<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bTarget="([^"]+)"/g)) relationshipMap.set(match[1], `word/${match[2].replace(/^\//, '').replace(/^word\//, '')}`);
  const assets: ProjectFontAsset[] = [];
  for (const fontMatch of table.matchAll(/<w:font\b[^>]*\bw:name="([^"]+)"[\s\S]*?<\/w:font>/g)) {
    const family = fontMatch[1];
    for (const variantMatch of fontMatch[0].matchAll(/<w:(embedRegular|embedBold|embedItalic|embedBoldItalic)\b[^>]*\br:id="([^"]+)"[^>]*\/?\s*>/g)) {
      const path = relationshipMap.get(variantMatch[2]);
      const file = path ? zip.file(path) : null;
      if (!path || !file) continue;
      const bytes = await file.async('uint8array');
      const asset = makeAsset({ family, variant: VARIANT_BY_ELEMENT[variantMatch[1]], path, bytes, origin: 'docx-embedded', key: fontMatch[0].match(/<w:fontKey\b[^>]*\bw:val="([^"]+)"/)?.[1] });
      if (asset) assets.push(asset);
      if (assets.length >= MAX_FONT_ASSETS) return assets;
    }
  }
  return assets;
}

export async function extractOdtProjectFontAssets(buffer: Buffer): Promise<ProjectFontAsset[]> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    return [];
  }
  const styles = await zip.file('styles.xml')?.async('text');
  if (!styles) return [];
  const assets: ProjectFontAsset[] = [];
  for (const match of styles.matchAll(/<style:font-face\b([^>]*)\/?\s*>/g)) {
    const attrs = match[1];
    const family = attrs.match(/(?:svg:font-family|style:name)="([^"]+)"/)?.[1];
    const href = attrs.match(/(?:xlink:href|style:href)="([^"]+)"/)?.[1]?.replace(/^\.\//, '');
    if (!family || !href) continue;
    const file = zip.file(href) ?? zip.file(`Fonts/${href}`);
    if (!file) continue;
    const path = file.name;
    const asset = makeAsset({ family, variant: 'regular', path, bytes: await file.async('uint8array'), origin: 'odt-embedded' });
    if (asset) assets.push(asset);
    if (assets.length >= MAX_FONT_ASSETS) break;
  }
  return assets;
}

export async function extractProjectFontAssets(format: string | undefined, buffer: Buffer): Promise<ProjectFontAsset[]> {
  if (format === 'docx') return extractDocxProjectFontAssets(buffer);
  if (format === 'odt') return extractOdtProjectFontAssets(buffer);
  return [];
}

export function findProjectFontAsset(assets: ProjectFontAsset[] | undefined, sourceFamily: string | undefined, variant: ProjectFontVariant = 'regular') {
  const key = sourceFamily ? familyKey(sourceFamily) : '';
  return assets?.find((asset) => asset.usable && familyKey(asset.sourceFamily) === key && asset.variant === variant);
}
