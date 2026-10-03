export type FontCategory = 'serif' | 'sans-serif' | 'monospace' | 'display';
export type FontLoadingStrategy = 'bundled' | 'google-webfont' | 'system';
export type FontResolutionStatus = 'exact' | 'compatible-substitute' | 'fallback' | 'talent-default';

export interface FontCatalogEntry {
  family: string;
  aliases?: string[];
  category: FontCategory;
  variants: string[];
  kind: 'webfont' | 'system';
  loadingStrategy: FontLoadingStrategy;
  selectable: boolean;
}

export interface FontResolution {
  sourceFamily: string;
  resolvedFamily: string;
  status: FontResolutionStatus;
  available: boolean;
  category: FontCategory;
  reason: string;
}

/** The single controlled catalog shared by the editor and document resolver. */
export const CONTROLLED_FONT_CATALOG: FontCatalogEntry[] = [
  { family: 'Inter', variants: ['400', '500', '600', '700'], category: 'sans-serif', kind: 'webfont', loadingStrategy: 'bundled', selectable: true },
  { family: 'DM Sans', variants: ['400', '500', '600', '700'], category: 'sans-serif', kind: 'webfont', loadingStrategy: 'google-webfont', selectable: true },
  { family: 'Fraunces', variants: ['400', '600', '700'], category: 'serif', kind: 'webfont', loadingStrategy: 'bundled', selectable: true },
  { family: 'Noto Sans', variants: ['400', '700'], category: 'sans-serif', kind: 'webfont', loadingStrategy: 'google-webfont', selectable: true },
  { family: 'Noto Serif', variants: ['400', '700'], category: 'serif', kind: 'webfont', loadingStrategy: 'google-webfont', selectable: true },
  { family: 'Libre Baskerville', variants: ['400', '700'], category: 'serif', kind: 'webfont', loadingStrategy: 'google-webfont', selectable: true },
  { family: 'EB Garamond', variants: ['400', '700'], category: 'serif', kind: 'webfont', loadingStrategy: 'google-webfont', selectable: true },
  { family: 'Playfair Display', variants: ['400', '700', '900'], category: 'serif', kind: 'webfont', loadingStrategy: 'google-webfont', selectable: true },
  { family: 'Lora', variants: ['400', '700'], category: 'serif', kind: 'webfont', loadingStrategy: 'google-webfont', selectable: true },
  { family: 'Merriweather', variants: ['400', '700'], category: 'serif', kind: 'webfont', loadingStrategy: 'google-webfont', selectable: true },
  { family: 'Crimson Text', variants: ['400', '700'], category: 'serif', kind: 'webfont', loadingStrategy: 'google-webfont', selectable: true },
  { family: 'Cormorant Garamond', variants: ['400', '700'], category: 'serif', kind: 'webfont', loadingStrategy: 'google-webfont', selectable: true },
  { family: 'Carlito', aliases: ['Calibri'], variants: ['400', '700'], category: 'sans-serif', kind: 'webfont', loadingStrategy: 'google-webfont', selectable: true },
  { family: 'Caladea', aliases: ['Cambria'], variants: ['400', '700'], category: 'serif', kind: 'webfont', loadingStrategy: 'google-webfont', selectable: true },
  { family: 'Roboto', variants: ['400', '700'], category: 'sans-serif', kind: 'webfont', loadingStrategy: 'google-webfont', selectable: true },
  { family: 'Open Sans', variants: ['400', '700'], category: 'sans-serif', kind: 'webfont', loadingStrategy: 'google-webfont', selectable: true },
  { family: 'Lato', variants: ['400', '700'], category: 'sans-serif', kind: 'webfont', loadingStrategy: 'google-webfont', selectable: true },
  { family: 'Montserrat', variants: ['400', '700'], category: 'sans-serif', kind: 'webfont', loadingStrategy: 'google-webfont', selectable: true },
  { family: 'Poppins', variants: ['400', '700'], category: 'sans-serif', kind: 'webfont', loadingStrategy: 'google-webfont', selectable: true },
  { family: 'JetBrains Mono', variants: ['400', '700'], category: 'monospace', kind: 'webfont', loadingStrategy: 'google-webfont', selectable: true },
  { family: 'IBM Plex Mono', variants: ['400', '700'], category: 'monospace', kind: 'webfont', loadingStrategy: 'google-webfont', selectable: true },
  { family: 'Roboto Mono', variants: ['400', '700'], category: 'monospace', kind: 'webfont', loadingStrategy: 'google-webfont', selectable: true },
  { family: 'Bebas Neue', variants: ['400'], category: 'display', kind: 'webfont', loadingStrategy: 'google-webfont', selectable: true },
  { family: 'Cinzel', variants: ['400', '700'], category: 'display', kind: 'webfont', loadingStrategy: 'google-webfont', selectable: true },
  { family: 'Georgia', variants: ['400', '700'], category: 'serif', kind: 'system', loadingStrategy: 'system', selectable: true },
];

const COMPATIBLE_SUBSTITUTES: Record<string, string> = {
  calibri: 'Carlito',
  cambria: 'Caladea',
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

export function getSelectableFontCatalog(): FontCatalogEntry[] {
  return CONTROLLED_FONT_CATALOG.filter((entry) => entry.selectable);
}

export function resolveFont(sourceFontFamily: string | null | undefined): FontResolution {
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

  const entry = catalogEntry(sourceFamily);
  if (entry && normalizeFamily(entry.family) === normalizeFamily(sourceFamily)) {
    return {
      sourceFamily,
      resolvedFamily: entry.family,
      status: 'exact',
      available: true,
      category: entry.category,
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
