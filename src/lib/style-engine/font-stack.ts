import { resolveFont } from './font-registry';

function quoteIfNeeded(fontFamily: string): string {
  return /\s/.test(fontFamily) ? `"${fontFamily}"` : fontFamily;
}

/** Builds a CSS stack from the controlled resolved family, never the source name. */
export function buildFontFamilyStack(fontFamily: string | undefined | null): string {
  const resolution = resolveFont(fontFamily);
  if (resolution.status === 'exact') return resolution.resolvedFamily;
  const categoryFallback = resolution.category === 'monospace'
    ? 'monospace'
    : resolution.category === 'sans-serif'
      ? 'sans-serif'
      : 'serif';
  return `${quoteIfNeeded(resolution.resolvedFamily)}, ${categoryFallback}`;
}

/** True when a source family is not an exact controlled Talent family. */
export function isLocallySubstitutedFont(fontFamily: string | undefined | null): boolean {
  return resolveFont(fontFamily).status !== 'exact';
}
