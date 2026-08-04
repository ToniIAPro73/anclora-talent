/**
 * Brand manual extractor (FASE 2): reads an identity-manual PDF and produces
 * a BrandProfile draft. Heuristic and honest — every extracted field carries
 * a confidence level, mirroring the structural profile contract:
 *
 * - Palette: `#RRGGBB` occurrences paired with the declared name (line above)
 *   and the role/usage line below ("Color de autoridad · 55 % de la pieza").
 *   Role keywords win ('high'); appearance order is the fallback ('low').
 * - Typography: declared editorial/functional voices ("X porta la voz
 *   editorial/funcional" — 'high'), with the governance fallback
 *   ("Titulares en X, cuerpo en Y" — 'medium').
 * - Proportions: per-color usage percent; the global "55 · 30 · 10 · 5"
 *   quartet is the fallback in canonical role order.
 * - Governance rules and voice contrast pairs ("así suena"/"así no suena")
 *   are captured as raw few-shot material (voice pairs are stored for F3 and
 *   not consumed yet).
 *
 * The extractor NEVER captures document hierarchy (G3): no headings outline,
 * no chapter structure — only the visual/verbal theme.
 */

import {
  BRAND_COLOR_ROLES,
  normalizeHexColor,
  type BrandColorRole,
  type BrandConfidence,
  type BrandPaletteColor,
  type BrandUsageProportions,
  type BrandVoicePair,
  type CreateBrandProfileInput,
} from './brand-profile';

export interface BrandExtractionResult {
  /** Ready-to-persist draft input (createBrandProfileRecord). */
  profile: CreateBrandProfileInput;
  /** Human-readable gaps found during extraction. */
  warnings: string[];
}

const ROLE_KEYWORDS: Array<{ role: BrandColorRole; pattern: RegExp }> = [
  // Order matters: 'mitigado'/'apoyo' must win over generic 'oro'/'metálico'.
  { role: 'accentMuted', pattern: /mitigado|apoyo|muted/i },
  { role: 'paper', pattern: /papel|crema|lectura|paper/i },
  { role: 'ink', pattern: /tinta|negro|autoridad|ink/i },
  { role: 'accent', pattern: /oro|met[aá]lico|jerarqu[ií]a|acento|accent|gold/i },
];

const HEX_RE = /#([0-9a-fA-F]{6})\b/g;

interface ColorCandidate {
  hex: string;
  /** Previous non-empty line (declared name candidate). */
  nameLine: string | null;
  /** Up to 4 lines after the hex line (role/usage candidates). */
  followingLines: string[];
  index: number;
}

function findColorCandidates(text: string): ColorCandidate[] {
  const lines = text.split('\n');
  const candidates: ColorCandidate[] = [];
  for (const match of text.matchAll(HEX_RE)) {
    const hex = normalizeHexColor(match[1]);
    if (!hex) continue;
    const lineIndex = text.slice(0, match.index).split('\n').length - 1;
    let nameLine: string | null = null;
    for (let i = lineIndex - 1; i >= 0 && i >= lineIndex - 3; i -= 1) {
      const candidate = lines[i].trim();
      if (!candidate || HEX_RE.test(candidate) || /RGB/i.test(candidate)) continue;
      nameLine = candidate.length <= 60 ? candidate : null;
      break;
    }
    candidates.push({
      hex,
      nameLine,
      followingLines: lines.slice(lineIndex + 1, lineIndex + 5).map((line) => line.trim()),
      index: match.index ?? 0,
    });
  }
  // Deduplicate repeated swatches of the same color, keeping the first.
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    if (seen.has(candidate.hex)) return false;
    seen.add(candidate.hex);
    return true;
  });
}

function extractPalette(text: string): BrandPaletteColor[] {
  const candidates = findColorCandidates(text);
  const assignedRoles = new Set<BrandColorRole>();
  const palette: Array<BrandPaletteColor & { order: number }> = [];

  for (const candidate of candidates) {
    const context = [candidate.nameLine ?? '', ...candidate.followingLines].join('\n');
    let role: BrandColorRole | null = null;
    for (const { role: candidateRole, pattern } of ROLE_KEYWORDS) {
      if (!assignedRoles.has(candidateRole) && pattern.test(context)) {
        role = candidateRole;
        break;
      }
    }
    const confidence: BrandConfidence = role ? 'high' : 'low';
    palette.push({
      role: role ?? 'ink', // placeholder, resolved below when unknown
      hex: candidate.hex,
      name: candidate.nameLine,
      usagePercent: null,
      confidence,
      order: candidate.index,
    });
    if (role) assignedRoles.add(role);
  }

  // Fallback: unknown roles are assigned in appearance order to the remaining
  // canonical roles (confidence already 'low').
  const remaining = BRAND_COLOR_ROLES.filter((role) => !assignedRoles.has(role));
  let remainingIndex = 0;
  for (const entry of palette) {
    if (entry.confidence === 'low' && remainingIndex < remaining.length) {
      entry.role = remaining[remainingIndex];
      remainingIndex += 1;
    }
  }

  // Usage percent from the role/usage lines ("· 55 % de la pieza").
  for (const [i, entry] of palette.entries()) {
    const candidate = candidates[i];
    for (const line of candidate.followingLines) {
      const percent = line.match(/(\d+)\s*%/);
      if (percent) {
        entry.usagePercent = Number(percent[1]);
        break;
      }
    }
  }

  return palette
    .map(({ order: _order, ...color }) => color)
    .sort((a, b) => BRAND_COLOR_ROLES.indexOf(a.role) - BRAND_COLOR_ROLES.indexOf(b.role));
}

function extractUsageProportions(
  text: string,
  palette: BrandPaletteColor[],
): BrandUsageProportions | null {
  const proportions = {} as BrandUsageProportions;
  let complete = true;
  for (const role of BRAND_COLOR_ROLES) {
    const percent = palette.find((color) => color.role === role)?.usagePercent;
    if (percent === null || percent === undefined) {
      complete = false;
      break;
    }
    proportions[role] = percent;
  }
  if (complete) return proportions;

  // Fallback: global quartet ("55 · 30 · 10 · 5") in canonical role order.
  const quartet = text.match(/(\d{1,3})\s*·\s*(\d{1,3})\s*·\s*(\d{1,3})\s*·\s*(\d{1,3})/);
  if (!quartet) return null;
  return {
    ink: Number(quartet[1]),
    paper: Number(quartet[2]),
    accent: Number(quartet[3]),
    accentMuted: Number(quartet[4]),
  };
}

function extractTypography(text: string): CreateBrandProfileInput['typography'] {
  const displayVoice = text.match(/([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]*?)\s+porta la voz\s+editorial/i);
  const bodyVoice = text.match(/([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]*?)\s+porta la voz\s+funcional/i);
  if (displayVoice || bodyVoice) {
    return {
      display: displayVoice
        ? { family: displayVoice[1].trim(), confidence: 'high' as const }
        : null,
      body: bodyVoice ? { family: bodyVoice[1].trim(), confidence: 'high' as const } : null,
    };
  }

  // Governance fallback: "Titulares en X, cuerpo en Y".
  const governance = text.match(/Titulares en ([^.,\n]+),\s*cuerpo en ([^.,\n]+)/i);
  if (governance) {
    return {
      display: { family: governance[1].trim(), confidence: 'medium' },
      body: { family: governance[2].trim(), confidence: 'medium' },
    };
  }

  return { display: null, body: null };
}

function extractGovernanceRules(text: string): string[] {
  const rules = new Set<string>();
  for (const match of text.matchAll(/(?:Nunca|No se\b|Siempre)[^.]*\./g)) {
    const rule = match[0].replace(/\s+/g, ' ').trim();
    if (rule.length >= 12 && rule.length <= 220) rules.add(rule);
    if (rules.size >= 12) break;
  }
  return [...rules];
}

/**
 * Voice-section markers tolerate the spaced-caps typesetting of manuals
 * ("A S Í S U E N A") as well as plain text ("Así suena").
 */
const VOICE_POSITIVE_RE = /A\s*S\s*Í\s*S\s*U\s*E\s*E?N\s*A|Así suena/i;
const VOICE_NEGATIVE_RE = /A\s*S\s*Í\s*N\s*O\s*S\s*U\s*E\s*E?N\s*A|Así no suena/i;

function extractVoicePairs(text: string): BrandVoicePair[] {
  const positiveMatch = text.match(VOICE_POSITIVE_RE);
  const negativeMatch = text.match(VOICE_NEGATIVE_RE);
  if (!positiveMatch || !negativeMatch) return [];
  const positiveMarker = positiveMatch.index ?? -1;
  const negativeMarker = negativeMatch.index ?? -1;
  if (positiveMarker === -1 || negativeMarker === -1 || negativeMarker <= positiveMarker) {
    return [];
  }

  const collect = (segment: string) =>
    [...segment.matchAll(/«([\s\S]*?)»/g)].map((match) =>
      match[1].replace(/\s+/g, ' ').trim(),
    );
  const soundsLike = collect(text.slice(positiveMarker, negativeMarker));
  const doesntSoundLike = collect(text.slice(negativeMarker));

  const pairs: BrandVoicePair[] = [];
  for (let i = 0; i < Math.min(soundsLike.length, doesntSoundLike.length); i += 1) {
    pairs.push({ soundsLike: soundsLike[i], doesntSoundLike: doesntSoundLike[i] });
  }
  return pairs;
}

function toTitleCase(value: string): string {
  return value.toLowerCase().replace(/(^|\s)\p{L}/gu, (letter) => letter.toUpperCase());
}

function extractBrandName(text: string, sourceFileName?: string): string {
  // Declarative identity statement: "Anclora Insights es el sello editorial…"
  const statement = text.match(
    /([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúüñ]+(?: [A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúüñ]+){1,3}) es el sello editorial/,
  );
  if (statement) return statement[1];

  // Plain multi-token caps masthead, most frequent wins ("ANCLORA GROUP").
  const capsRuns = new Map<string, number>();
  for (const match of text.matchAll(/\b([A-ZÁÉÍÓÚÑ]{2,}(?: [A-ZÁÉÍÓÚÑ]{2,})+)\b/g)) {
    capsRuns.set(match[1], (capsRuns.get(match[1]) ?? 0) + 1);
  }
  const topCaps = [...capsRuns.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topCaps) return toTitleCase(topCaps[0]);

  if (sourceFileName) {
    return toTitleCase(sourceFileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '));
  }
  return 'Perfil de marca';
}

/** Pure text-based extraction (deterministic: same text → same result). */
export function extractBrandProfileFromText(
  text: string,
  sourceFileName?: string,
): BrandExtractionResult {
  const warnings: string[] = [];
  const palette = extractPalette(text);
  const typography = extractTypography(text);
  const usageProportions = extractUsageProportions(text, palette);
  const governanceRules = extractGovernanceRules(text);
  const voicePairs = extractVoicePairs(text);

  if (palette.length === 0) warnings.push('No se detectaron colores hex en el manual.');
  if (palette.some((color) => color.confidence === 'low')) {
    warnings.push('Algún color se asignó a su rol por orden de aparición (confianza baja).');
  }
  if (!typography.display && !typography.body) {
    warnings.push('No se detectó la pareja tipográfica declarada.');
  }
  if (!usageProportions) warnings.push('No se detectaron proporciones de uso de la paleta.');

  return {
    profile: {
      name: extractBrandName(text, sourceFileName),
      palette,
      typography,
      usageProportions,
      governanceRules,
      voicePairs,
      sourceFileName: sourceFileName ?? null,
    },
    warnings,
  };
}

/** PDF extraction via the already-vendored `pdf-parse` (same lib as the import pipeline). */
export async function extractBrandProfileFromPdf(
  buffer: Buffer,
  sourceFileName?: string,
): Promise<BrandExtractionResult> {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: buffer });
  const parsed = await parser.getText();
  await parser.destroy();
  return extractBrandProfileFromText(parsed.text, sourceFileName);
}
