/**
 * Launch kit (F4) — product sheet + landing copy derived from the AST.
 *
 * Everything in the kit is EXTRACTED from the document AST / metadata or
 * referenced from the asset manifest; nothing is invented:
 * - title / subtitle / author / isbn / keywords / language come from
 *   `DocumentMetadata` verbatim;
 * - benefit bullets are the chapter headings (H2, H3 fallback) verbatim;
 * - the long description is `metadata.description` when present; when it is
 *   missing, it is derived from the first chapter's paragraphs and flagged
 *   `descriptionIsDraft` so the UI forces human review before publishing;
 * - the CTA is a fixed localized string (never generated content);
 * - assets are URL references to the manifest's EPUB/PDF deliverables;
 * - the AI disclosure is the KDP declaration built by
 *   `ai/kdp-disclosure.ts`, embedded only when it is required.
 *
 * Pure module: no server-only, no I/O — unit-tested against the real
 * `exito_sin_compania.docx` fixture through the production import pipeline.
 */

import type {
  DocumentBlock,
  InlineNode,
  SemanticDocument,
} from '@/lib/document/model';
import { inlineToPlainText } from '@/lib/document/model';
import type { ProjectAssetManifestItem } from '@/lib/manifest/model';

export type KitLocale = 'es' | 'en';

export interface ProductSheet {
  title: string;
  subtitle: string | null;
  /** Long sales description (plain text with paragraph breaks). */
  longDescription: string;
  /**
   * Where the long description came from. `first-chapter` and `title-only`
   * are derivations, not authored copy: `descriptionIsDraft` flags them.
   */
  descriptionSource: 'metadata' | 'first-chapter' | 'title-only';
  /** True when the description was derived (human review required). */
  descriptionIsDraft: boolean;
  /** Chapter headings (H2, H3 fallback) — the product benefit bullets. */
  bullets: string[];
  author: string | null;
  isbn: string | null;
  keywords: string[];
  language: string | null;
}

export interface LandingCopy {
  headline: string;
  subheadline: string | null;
  benefitBullets: string[];
  cta: string;
}

/** Manifest deliverable referenced by the kit (the files the seller uploads). */
export interface LaunchKitAssetRef {
  kind: 'epub' | 'pdf';
  url: string;
}

export interface LaunchKit {
  sheet: ProductSheet;
  landing: LandingCopy;
  /** Ebook deliverables (EPUB/PDF) with a materialized URL. */
  assets: LaunchKitAssetRef[];
  /** KDP AI-content declaration text, only when disclosure is required. */
  aiDisclosure: string | null;
}

export interface BuildLaunchKitOptions {
  /** Latest asset-manifest items (only epub/pdf with url are referenced). */
  manifestItems?: ProjectAssetManifestItem[];
  /** KDP disclosure text; pass null/undefined when disclosure is exempt. */
  aiDisclosure?: string | null;
  /** UI/copy locale; defaults to the document language, then 'es'. */
  locale?: KitLocale;
}

const CTA_BY_LOCALE: Record<KitLocale, string> = {
  es: 'Consigue tu copia',
  en: 'Get your copy',
};

/** Max characters of the first-chapter derivation (keeps the sheet readable). */
const DERIVED_DESCRIPTION_MAX_CHARS = 600;

function blockText(block: DocumentBlock): string {
  if ('content' in block && Array.isArray(block.content)) {
    return inlineToPlainText(block.content as InlineNode[]);
  }
  return '';
}

/**
 * Front-matter headings that must never become sales bullets (an index is
 * apparatus, not a benefit). Matched case-insensitively against the exact
 * heading text, ES + EN.
 */
const FRONT_MATTER_HEADINGS = new Set([
  'índice',
  'índice de contenidos',
  'tabla de contenidos',
  'index',
  'contents',
  'table of contents',
]);

/**
 * Benefit bullets: chapter headings verbatim. H2 is the chapter level of the
 * product templates; when the document has no H2 (flat structure), H3
 * subsections are the next honest source. H1 is the part level — too coarse
 * to sell benefits — so it is never used.
 */
export function extractBenefitBullets(blocks: DocumentBlock[]): string[] {
  const byLevel = (level: 2 | 3) =>
    blocks
      .filter(
        (block): block is Extract<DocumentBlock, { type: 'heading' }> =>
          block.type === 'heading' && block.level === level,
      )
      .map((block) => blockText(block))
      .filter((text) => text.length > 0 && !FRONT_MATTER_HEADINGS.has(text.toLowerCase()));

  const h2 = byLevel(2);
  return h2.length > 0 ? h2 : byLevel(3);
}

/**
 * Long description without authored metadata: concatenates the first
 * chapter's paragraphs (from the first H2/H3 heading to the next heading of
 * the same or higher level), truncated to `DERIVED_DESCRIPTION_MAX_CHARS`.
 * The result is AST text verbatim — a derivation, flagged as draft.
 */
export function deriveDescriptionFromFirstChapter(blocks: DocumentBlock[]): string {
  const startIndex = blocks.findIndex(
    (block) => block.type === 'heading' && (block.level === 2 || block.level === 3),
  );
  if (startIndex === -1) return '';

  const start = blocks[startIndex];
  const startLevel = start.type === 'heading' ? start.level : 6;
  const paragraphs: string[] = [];
  for (const block of blocks.slice(startIndex + 1)) {
    if (block.type === 'heading' && block.level <= startLevel) break;
    if (block.type === 'paragraph') {
      const text = blockText(block);
      if (text) paragraphs.push(text);
    }
  }

  const joined = paragraphs.join('\n\n');
  if (joined.length <= DERIVED_DESCRIPTION_MAX_CHARS) return joined;
  const cut = joined.slice(0, DERIVED_DESCRIPTION_MAX_CHARS);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : cut.length)}…`;
}

function resolveLocale(document: SemanticDocument, locale?: KitLocale): KitLocale {
  if (locale) return locale;
  return document.metadata.language?.toLowerCase().startsWith('en') ? 'en' : 'es';
}

/**
 * Builds the launch kit from the canonical AST + metadata (+ manifest refs).
 */
export function buildLaunchKit(
  document: SemanticDocument,
  options: BuildLaunchKitOptions = {},
): LaunchKit {
  const { metadata } = document;
  const locale = resolveLocale(document, options.locale);

  const authoredDescription = metadata.description?.trim();
  const derived = authoredDescription ? null : deriveDescriptionFromFirstChapter(document.blocks);
  const longDescription = authoredDescription ?? (derived || metadata.title);
  const descriptionSource: ProductSheet['descriptionSource'] = authoredDescription
    ? 'metadata'
    : derived
      ? 'first-chapter'
      : 'title-only';

  const bullets = extractBenefitBullets(document.blocks);

  const sheet: ProductSheet = {
    title: metadata.title,
    subtitle: metadata.subtitle?.trim() || null,
    longDescription,
    descriptionSource,
    descriptionIsDraft: descriptionSource !== 'metadata',
    bullets,
    author: metadata.author?.trim() || null,
    isbn: metadata.isbn?.trim() || null,
    keywords: metadata.keywords ?? [],
    language: metadata.language ?? null,
  };

  const landing: LandingCopy = {
    headline: metadata.subtitle?.trim()
      ? `${metadata.title}: ${metadata.subtitle.trim()}`
      : metadata.title,
    subheadline: bullets[0] ?? null,
    benefitBullets: bullets,
    cta: CTA_BY_LOCALE[locale],
  };

  const assets = (options.manifestItems ?? [])
    .filter(
      (item): item is ProjectAssetManifestItem & { kind: 'epub' | 'pdf'; url: string } =>
        (item.kind === 'epub' || item.kind === 'pdf') && Boolean(item.url),
    )
    .map((item) => ({ kind: item.kind, url: item.url }));

  return {
    sheet,
    landing,
    assets,
    aiDisclosure: options.aiDisclosure ?? null,
  };
}

/**
 * HTML rendering of the product sheet for channel payloads (Gumroad takes an
 * HTML description; Hotmart's manual flow accepts the same markup). Only AST-
 * derived text is rendered — escaped, never interpolated raw HTML.
 */
export function buildProductDescriptionHtml(sheet: ProductSheet): string {
  const escape = (text: string) =>
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const parts: string[] = [];
  for (const paragraph of sheet.longDescription.split('\n\n')) {
    const text = paragraph.trim();
    if (text) parts.push(`<p>${escape(text)}</p>`);
  }
  if (sheet.bullets.length > 0) {
    parts.push(`<ul>${sheet.bullets.map((bullet) => `<li>${escape(bullet)}</li>`).join('')}</ul>`);
  }
  return parts.join('\n');
}
