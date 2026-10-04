import { findProjectFontAsset, type ProjectFontAsset } from './project-font-assets';

export type FontCategory = 'serif' | 'sans-serif' | 'monospace' | 'display';
export type FontLoadingStrategy = 'google-webfont' | 'bundled' | 'system';
export type FontResolutionStatus = 'exact' | 'embedded-exact' | 'embedded-restricted' | 'embedded-invalid' | 'compatible-substitute' | 'fallback' | 'talent-default';

export interface BundledFontFile {
  weight: '400' | '700';
  style: 'normal' | 'italic';
  url: string;
}

export interface FontCatalogEntry {
  family: string;
  aliases?: string[];
  category: FontCategory;
  variants: string[];
  kind: 'webfont' | 'system';
  loadingStrategy: FontLoadingStrategy;
  selectable: boolean;
  license: string;
  upstream: string;
  bundledFiles?: BundledFontFile[];
}

export interface FontResolution {
  sourceFamily: string;
  resolvedFamily: string;
  status: FontResolutionStatus;
  available: boolean;
  category: FontCategory;
  reason: string;
  delivery?: FontLoadingStrategy;
  projectFontAssetId?: string;
}

const OFL = 'SIL-OFL-1.1';
const googleUpstream = (family: string) => `https://fonts.google.com/specimen/${family.replace(/ /g, '+')}`;
const LIBERATION_UPSTREAM = 'https://github.com/liberationfonts/liberation-fonts/releases/tag/2.1.5';

function googleEntry(
  family: string,
  category: FontCategory,
  variants: string[] = ['400', '700'],
  aliases?: string[],
): FontCatalogEntry {
  return { family, aliases, category, variants, kind: 'webfont', loadingStrategy: 'google-webfont', selectable: true, license: OFL, upstream: googleUpstream(family) };
}

function liberationEntry(family: string, category: FontCategory, base: string): FontCatalogEntry {
  const files: BundledFontFile[] = [
    { weight: '400', style: 'normal', url: `/fonts/liberation/${base}-Regular.woff2` },
    { weight: '400', style: 'italic', url: `/fonts/liberation/${base}-Italic.woff2` },
    { weight: '700', style: 'normal', url: `/fonts/liberation/${base}-Bold.woff2` },
    { weight: '700', style: 'italic', url: `/fonts/liberation/${base}-BoldItalic.woff2` },
  ];
  return { family, category, variants: ['400', '700'], kind: 'webfont', loadingStrategy: 'bundled', selectable: true, license: OFL, upstream: LIBERATION_UPSTREAM, bundledFiles: files };
}

/** The single controlled catalog shared by the editor, selector, normalization, resolver and export classification. */
export const CONTROLLED_FONT_CATALOG: FontCatalogEntry[] = [
  // Serif
  googleEntry('Libre Baskerville', 'serif'),
  googleEntry('EB Garamond', 'serif'),
  googleEntry('Crimson Pro', 'serif'),
  googleEntry('Crimson Text', 'serif'),
  googleEntry('Cormorant Garamond', 'serif'),
  googleEntry('Lora', 'serif'),
  googleEntry('Merriweather', 'serif'),
  googleEntry('Bitter', 'serif'),
  googleEntry('Vollkorn', 'serif'),
  googleEntry('Literata', 'serif'),
  googleEntry('Alegreya', 'serif'),
  googleEntry('Spectral', 'serif'),
  googleEntry('Gentium Plus', 'serif'),
  googleEntry('Charis SIL', 'serif'),
  googleEntry('PT Serif', 'serif'),
  googleEntry('Noto Serif', 'serif'),
  googleEntry('Source Serif 4', 'serif'),
  googleEntry('Playfair Display', 'serif'),
  googleEntry('DM Serif Display', 'serif', ['400']),
  googleEntry('Fraunces', 'serif', ['400', '600', '700']),
  googleEntry('Caladea', 'serif'),
  liberationEntry('Liberation Serif', 'serif', 'LiberationSerif'),
  // Sans serif
  googleEntry('Inter', 'sans-serif', ['400', '500', '600', '700']),
  googleEntry('DM Sans', 'sans-serif', ['400', '500', '600', '700']),
  googleEntry('Noto Sans', 'sans-serif'),
  googleEntry('Roboto', 'sans-serif'),
  googleEntry('Open Sans', 'sans-serif'),
  googleEntry('Lato', 'sans-serif'),
  googleEntry('Montserrat', 'sans-serif'),
  googleEntry('Poppins', 'sans-serif'),
  googleEntry('Carlito', 'sans-serif'),
  googleEntry('Manrope', 'sans-serif'),
  googleEntry('IBM Plex Sans', 'sans-serif'),
  googleEntry('Fira Sans', 'sans-serif'),
  googleEntry('Source Sans 3', 'sans-serif'),
  googleEntry('Alegreya Sans', 'sans-serif'),
  googleEntry('PT Sans', 'sans-serif'),
  googleEntry('Arimo', 'sans-serif'),
  liberationEntry('Liberation Sans', 'sans-serif', 'LiberationSans'),
  // Monospace
  googleEntry('JetBrains Mono', 'monospace'),
  googleEntry('IBM Plex Mono', 'monospace'),
  googleEntry('Roboto Mono', 'monospace'),
  googleEntry('Noto Sans Mono', 'monospace'),
  googleEntry('Source Code Pro', 'monospace'),
  googleEntry('Fira Mono', 'monospace'),
  googleEntry('Cousine', 'monospace'),
  liberationEntry('Liberation Mono', 'monospace', 'LiberationMono'),
  // Display
  googleEntry('Bebas Neue', 'display', ['400']),
  googleEntry('Cinzel', 'display'),
  // System
  { family: 'Georgia', category: 'serif', variants: ['400', '700'], kind: 'system', loadingStrategy: 'system', selectable: true, license: 'proprietary-microsoft', upstream: 'system-installed; not distributed by Talent' },
];

/** Proprietary source families resolved to an approved compatible family. Source name is always preserved. */
const COMPATIBLE_SUBSTITUTES: Record<string, string> = {
  calibri: 'Carlito',
  cambria: 'Caladea',
  arial: 'Arimo',
  'courier new': 'Cousine',
  'times new roman': 'Liberation Serif',
};

const normalizeFamily = (family: string) => family.trim().replace(/^['"]|['"]$/g, '').toLowerCase();

function categoryForFamily(family: string): FontCategory {
  const lower = normalizeFamily(family);
  if (/mono|code|courier|console/.test(lower)) return 'monospace';
  if (/sans|arial|helvetica|calibri|aptos|inter|roboto|lato|avenir/.test(lower)) return 'sans-serif';
  if (/display|bebas|pacifico|caveat/.test(lower)) return 'display';
  return 'serif';
}

function catalogEntry(family: string): FontCatalogEntry | undefined {
  const normalized = normalizeFamily(family);
  return CONTROLLED_FONT_CATALOG.find((entry) =>
    [entry.family, ...(entry.aliases ?? [])].some((candidate) => normalizeFamily(candidate) === normalized),
  );
}

/** Quoted CSS value: unquoted names containing digits (e.g. "Source Serif 4") are dropped by the browser. */
export function cssFontFamily(family: string): string {
  return `'${family.trim().replace(/^['"]|['"]$/g, '')}'`;
}

export function findCatalogEntry(family: string): FontCatalogEntry | undefined {
  return catalogEntry(family);
}

export function getSelectableFontCatalog(): FontCatalogEntry[] {
  return CONTROLLED_FONT_CATALOG.filter((entry) => entry.selectable);
}

export function exportCategoryForFamily(sourceFontFamily: string | null | undefined): FontCategory {
  return resolveFont(sourceFontFamily).category;
}

export function resolveFont(sourceFontFamily: string | null | undefined, projectFontAssets?: ProjectFontAsset[]): FontResolution {
  const sourceFamily = sourceFontFamily?.trim() || '';
  if (!sourceFamily) {
    return {
      sourceFamily: '',
      resolvedFamily: 'Georgia',
      status: 'talent-default',
      available: true,
      category: 'serif',
      reason: 'No source family was provided; Talent default applies.',
    };
  }

  const embedded = projectFontAssets?.find((asset) => normalizeFamily(asset.sourceFamily) === normalizeFamily(sourceFamily));
  if (embedded) {
    if (embedded.usable && findProjectFontAsset(projectFontAssets, sourceFamily)) {
      return { sourceFamily, resolvedFamily: embedded.sourceFamily, status: 'embedded-exact', available: true, category: categoryForFamily(sourceFamily), reason: 'The source font was validated and loaded from a project-scoped embedded asset.', projectFontAssetId: embedded.id };
    }
    return { sourceFamily, resolvedFamily: '', status: embedded.permission === 'restricted' ? 'embedded-restricted' : 'embedded-invalid', available: false, category: categoryForFamily(sourceFamily), reason: `The embedded source font is not usable (${embedded.permission}/${embedded.validation}).` };
  }

  const entry = catalogEntry(sourceFamily);
  if (entry && normalizeFamily(entry.family) === normalizeFamily(sourceFamily)) {
    return {
      sourceFamily,
      resolvedFamily: entry.family,
      status: 'exact',
      available: true,
      category: entry.category,
      delivery: entry.loadingStrategy,
      reason: `The family is present in Talent's controlled catalog (${entry.loadingStrategy}).`,
    };
  }

  const compatible = COMPATIBLE_SUBSTITUTES[normalizeFamily(sourceFamily)];
  if (compatible && catalogEntry(compatible)) {
    const compatibleEntry = catalogEntry(compatible)!;
    return {
      sourceFamily,
      resolvedFamily: compatibleEntry.family,
      status: 'compatible-substitute',
      available: false,
      category: compatibleEntry.category,
      delivery: compatibleEntry.loadingStrategy,
      reason: `The source family is not available; ${compatibleEntry.family} is the controlled compatible substitute.`,
    };
  }

  const category = categoryForFamily(sourceFamily);
  const fallback = category === 'monospace' ? 'JetBrains Mono' : category === 'sans-serif' ? 'Inter' : 'Georgia';
  return {
    sourceFamily,
    resolvedFamily: fallback,
    status: 'fallback',
    available: false,
    category,
    reason: `The source family is not available; Talent uses its controlled ${category} fallback.`,
  };
}
