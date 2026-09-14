import type { ImportedDocumentSeed, ImportFieldConfidence } from './types';

const SUPPORTED_IMPORT_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'txt', 'md']);
const BLOCK_TAG_RE = /<(h[1-6]|p|ul|ol|blockquote|table)[^>]*>[\s\S]*?<\/\1>/gi;
const ALL_CAPS_RE = /^(?=.{40,})[^a-z]*[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9 .,·:;()\-–—]+$/;
const MAJOR_HEADING_RE = /^(?:cap[ií]tulo|chapter|introducci[oó]n|pr[oó]logo|prologo|[íi]ndice|indice|fase\s+\d+|parte\s+\d+|secci[oó]n|ep[ií]logo|cierre|despu[eé]s\s+de|recursos(?:\s+recomendados)?|anexos?|ap[eé]ndices?)(?:\b|:)/i;
const MINOR_HEADING_RE = /^(?:d[ií]a\s+\d+|tema\s+\d+|idea\s+clave|reto\s+de\s+acci[oó]n|preguntas?\s+de\s+reflexi[oó]n|ejercicio|caso|las\s+cinco\s+claves|cierre\s+de\s+fase)(?:\b|:)/i;

/**
 * A heading marker line that carries ONLY a section keyword + number, no
 * inline title text (e.g. "Capítulo 1", "Chapter 2", "Parte 3"). Distinct
 * from `MAJOR_HEADING_RE`, which also matches when the title is inline
 * ("Capítulo 3: El suelo financiero") — that case needs no lookahead.
 * Matched against the tracked-heading-normalized line (see
 * `normalizeTrackedHeading`).
 */
const CHAPTER_MARKER_RE = /^(?:cap[ií]tulo|chapter|parte|fase|secci[oó]n)\s*\d+[.:]?\s*$/i;

/** A page folio in "— N —" form (any dash style), always safe to strip. */
const STRICT_FOLIO_RE = /^[-–—―]\s*\d{1,4}\s*[-–—―]$/;
/** A page folio that is just a bare number; only stripped at a page boundary. */
const BARE_FOLIO_RE = /^\d{1,4}$/;

/** M5 — manuscript type, used only to preset chapter-splitting granularity. */
export type ManuscriptType = 'essay' | 'guide' | 'novel' | 'non-fiction';

const DIALOGUE_LINE_RE = /^[-—–]\s*\S|^["“][^"”]+["”]\s*(?:,|\.)?\s*(?:dijo|preguntó|respondió|murmuró|gritó)\b/im;
const IMPERATIVE_MARKER_RE = /\b(paso\s+\d+|ejercicio|checklist|reflexi[oó]n|reto\s+de\s+acci[oó]n)\b/gi;
const CITATION_MARKER_RE = /\b(seg[uú]n|estudios?\s+(?:muestran|indican)|\[\d+\])\b/gi;

/**
 * M5 — cheap, documented, non-AI heuristic for the manuscript's likely genre,
 * used only to preset the chapter-splitting granularity (see
 * `MANUSCRIPT_TYPE_CHAPTER_LEVEL`). Signals: dialogue-tag density → novel;
 * step/exercise markers → guide; citation/claim markers with long paragraphs
 * → essay; otherwise non-fiction (the safe default — same as auto-detection
 * with no preset applied).
 */
export function detectManuscriptType(text: string): ManuscriptType {
  const paragraphs = paragraphsFromText(text);
  if (paragraphs.length === 0) return 'non-fiction';

  const dialogueLines = paragraphs.filter((p) => DIALOGUE_LINE_RE.test(p)).length;
  if (dialogueLines / paragraphs.length > 0.15) return 'novel';

  // Density, not a raw count: a long non-fiction book easily accumulates a
  // handful of incidental "ejercicio"/"reflexión" mentions without being
  // structured as a step-by-step guide throughout (confirmed against a
  // 122-page real-world regression case: 23 hits over 121 paragraphs, a
  // ~19% ratio, is ordinary non-fiction vocabulary, not a guide).
  const imperativeHits = (text.match(IMPERATIVE_MARKER_RE) ?? []).length;
  if (imperativeHits / paragraphs.length >= 0.3) return 'guide';

  const citationHits = (text.match(CITATION_MARKER_RE) ?? []).length;
  const avgParagraphLength = text.length / paragraphs.length;
  if (citationHits / paragraphs.length >= 0.15 && avgParagraphLength > 400) return 'essay';

  return 'non-fiction';
}

/**
 * M5 — chapter-boundary heading level to force for a manuscript type, or
 * `null` to keep the existing auto-detection (`determineChapterBoundaryLevel`)
 * untouched. Only 'guide' gets a concrete preset: guides commonly nest many
 * numbered sub-sections that read better as their own chapters, so prefer
 * the finer (H2) boundary when one exists.
 */
const MANUSCRIPT_TYPE_CHAPTER_LEVEL: Record<ManuscriptType, 1 | 2 | null> = {
  guide: 2,
  novel: null,
  essay: null,
  'non-fiction': null,
};

function getExtension(fileName: string) {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? parts.pop()! : '';
}

type ParsedBlockKind = 'heading' | 'paragraph' | 'list' | 'quote' | 'rule';

type ParsedBlock = {
  kind: ParsedBlockKind;
  text: string;
  html: string;
  level: number | null;
  structural: boolean;
};

type ExtractedImportSource = {
  text: string;
  html: string | null;
  pageCount?: number;
};

type TextImportMode = 'default' | 'preserve-lines' | 'pdf';

type OutlineEntry = NonNullable<ImportedDocumentSeed['detectedOutline']>[number];

export function normalizeText(input: string) {
  return input
    .replace(/\r\n/g, '\n')
    .replace(/\u0000/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function paragraphsFromText(input: string) {
  return normalizeText(input)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function splitLines(input: string) {
  return input.replace(/\r\n/g, '\n').split('\n');
}

function inferTextImportMode(fileName: string, mimeType: string): TextImportMode {
  const extension = getExtension(fileName);

  if (mimeType === 'application/pdf' || extension === 'pdf') {
    return 'pdf';
  }

  if (
    mimeType.startsWith('text/') ||
    extension === 'md' ||
    extension === 'txt' ||
    extension === 'doc' ||
    extension === 'docx'
  ) {
    return 'preserve-lines';
  }

  return 'default';
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function shouldMergePdfLine(current: string, next: string) {
  const trimmedCurrent = current.trim();
  const trimmedNext = next.trim();

  if (!trimmedCurrent || !trimmedNext) return false;
  if (/[.!?:;"”]$/.test(trimmedCurrent)) return false;
  if (/^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]+$/.test(trimmedNext)) return false;

  return /^[a-záéíóúñ0-9(]/.test(trimmedNext);
}

function mergePdfWrappedLines(lines: string[]) {
  const merged: string[] = [];

  for (const line of lines.map((item) => item.trim()).filter(Boolean)) {
    const previous = merged.at(-1);
    if (previous && shouldMergePdfLine(previous, line)) {
      merged[merged.length - 1] = `${previous} ${line}`;
      continue;
    }

    merged.push(line);
  }

  return merged;
}

function buildParagraphContentFromLines(lines: string[], mode: TextImportMode) {
  const normalizedLines = lines.map((line) => line.trim()).filter(Boolean);
  if (normalizedLines.length === 0) {
    return null;
  }

  const effectiveLines =
    mode === 'pdf' ? mergePdfWrappedLines(normalizedLines) : normalizedLines;

  return {
    text: normalizeText(effectiveLines.join('\n')),
    html: `<p>${effectiveLines.map((line) => escapeHtml(line)).join('<br />')}</p>`,
  };
}

function decodeHtmlEntities(input: string) {
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)));
}

function stripTags(input: string) {
  return decodeHtmlEntities(
    input
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/blockquote>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  );
}

function normalizeHtmlFragment(input: string) {
  return input
    .replace(/\r\n/g, '\n')
    .replace(/\sstyle="[^"]*"/gi, '')
    .replace(/>\s+</g, '><')
    .trim();
}

function textFromHtml(input: string) {
  return normalizeText(stripTags(input));
}

function isDecorativeLine(input: string) {
  return /^[─—–_=*·.\s]+$/.test(input.trim());
}

function stripMarkdownInline(input: string): string {
  return input
    // Unescape markdown escape sequences (e.g. \. \! \, \- etc.)
    .replace(/\\([.!,;:()\[\]{}\-_*#`>|~\\])/g, '$1')
    // Remove bold markers (**text** or __text__)
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    // Remove italic markers (*text* or _text_)
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/_([^_\n]+)_/g, '$1')
    .trim();
}

function cleanHeadingText(input: string) {
  return stripMarkdownInline(
    input
      .replace(/^#{1,6}\s+/, '')
      .replace(/^\d+(?:\.\d+)*[.)]\s+/, '')
      .trim()
  );
}

/**
 * `cleanHeadingText` plus editorial title-casing for an ALL-CAPS result
 * ("PRÓLOGO" -> "Prólogo") — used wherever a heading's text becomes the
 * final, stored/displayed title. Kept separate from `cleanHeadingText`
 * itself: several classification call sites test `ALL_CAPS_RE` against
 * `cleanHeadingText`'s output, and pre-converting the case there would
 * make that check always fail.
 */
function finalizeHeadingText(input: string): string {
  const cleaned = cleanHeadingText(input);
  return isAllCapsText(cleaned) ? toEditorialTitleCase(cleaned) : cleaned;
}

function getHeadingLevel(input: string) {
  const markdownMatch = input.match(/^(#{1,6})\s+/);
  if (markdownMatch) {
    return markdownMatch[1].length;
  }

  // Requires an explicit "." or ")" after the number(s) — a bare leading
  // digit followed by whitespace ("15 o 25 años de carrera...") is
  // ordinary prose, not a numbered heading marker, and must not be
  // misread as one (PDF body text legitimately starts sentences with a
  // figure).
  const numericMatch = input.match(/^(\d+(?:\.\d+)*)[.)]\s+/);
  if (numericMatch) {
    return (numericMatch[1].match(/\./g)?.length ?? 0) + 1;
  }

  return null;
}

function inferHeadingLevel(input: string) {
  const trimmed = cleanHeadingText(input);
  if (!trimmed) return null;

  const markdownLevel = getHeadingLevel(input);
  if (markdownLevel !== null) {
    return markdownLevel;
  }

  if (MAJOR_HEADING_RE.test(trimmed)) return 1;
  if (MINOR_HEADING_RE.test(trimmed)) return 2;
  if (ALL_CAPS_RE.test(trimmed) && trimmed.length <= 100) return 1;
  if (trimmed.length <= 80 && !/[.!?]$/.test(trimmed)) return 2;

  return null;
}

/**
 * Detection-only normalization for letter-tracked/justified headings
 * (typographic convention in many editorial PDFs), e.g. "C A P Í T U L O 1"
 * -> "CAPÍTULO 1". Never applied to stored body content — only to the
 * candidate line used for heading classification. Conservative: requires
 * at least 4 whitespace-separated tokens with >=70% of them exactly one
 * character long, so ordinary prose with isolated short words ("y", "a",
 * "I") is left untouched. Consecutive single-letter tokens collapse into
 * one word; a numeral token stays separated by a space so the collapsed
 * result still satisfies heading regexes that require a word boundary
 * after the keyword (e.g. "CAPÍTULO 1", not "CAPÍTULO1").
 */
function normalizeTrackedHeading(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;

  const tokens = trimmed.split(/\s+/);
  if (tokens.length < 4) return trimmed;

  const singleCharTokens = tokens.filter((token) => [...token].length === 1);
  if (singleCharTokens.length / tokens.length < 0.7) return trimmed;

  const collapsed: string[] = [];
  let letterRun = '';

  for (const token of tokens) {
    const isSingleLetter = [...token].length === 1 && /\p{L}/u.test(token);
    if (isSingleLetter) {
      letterRun += token;
      continue;
    }
    if (letterRun) {
      collapsed.push(letterRun);
      letterRun = '';
    }
    collapsed.push(token);
  }
  if (letterRun) collapsed.push(letterRun);

  return collapsed.join(' ');
}

/**
 * A chapter-marker line ("Capítulo 1") carries no title of its own; the
 * real title lives on the next physical line(s). This does a bounded,
 * conservative lookahead: up to `maxLines` following non-blank lines, each
 * short (<= `maxWordsPerLine` words) and not itself ending in terminal
 * sentence punctuation, are merged into one title. The scan stops at the
 * first line that looks like the start of a body paragraph (too long, or
 * ends in `.`/`!`/`?`), at a blank line, or at another detected heading —
 * so it never swallows the chapter's actual opening prose.
 */
function consumeHeadingContinuationLines(
  lines: string[],
  startIndex: number,
  maxLines = 2,
  maxWordsPerLine = 8,
): { title: string; consumed: number } {
  const collected: string[] = [];
  let index = startIndex;

  while (index < lines.length && collected.length < maxLines) {
    const line = lines[index].trim();
    if (!line || isDecorativeLine(line)) break;
    if (getHeadingLevel(line) !== null) break;
    if (isStrongStandaloneHeadingSignal(normalizeTrackedHeading(line))) break;

    const words = line.split(/\s+/).filter(Boolean);
    if (words.length > maxWordsPerLine || /[.!?]$/.test(line)) break;

    collected.push(line);
    index += 1;
  }

  return { title: collected.join(' ').trim(), consumed: index - startIndex };
}

function isTopLevelChapterHeading(input: string) {
  const level = inferHeadingLevel(input.trim());
  return level !== null && level <= 1;
}

/**
 * `MAJOR_HEADING_RE.test` alone is not enough for its more generic-noun
 * alternatives ("después de ...", "recursos ...", "cierre ...", "sección
 * ..."): each is an ordinary Spanish word/phrase that can start any
 * sentence, not just a section marker, so a body-text line-wrap that
 * happens to start with one (e.g. "Un profesional de\nrecursos humanos que
 * además domina el análisis de datos...") would otherwise be misread as a
 * heading. Trusted only when short, the way a genuine "Recursos
 * recomendados" or "Después de la Fase 1"-style marker is; the other,
 * more distinctly structural alternatives (capítulo, chapter,
 * introducción, prólogo, índice, epílogo, anexos, apéndice, fase N, parte
 * N) are specific enough to trust outright.
 */
const AMBIGUOUS_MAJOR_HEADING_PREFIX_RE = /^(?:despu[eé]s\s+de|recursos|cierre|secci[oó]n)\b/i;

function matchesMajorHeadingKeyword(trimmed: string): boolean {
  if (!MAJOR_HEADING_RE.test(trimmed)) return false;
  if (AMBIGUOUS_MAJOR_HEADING_PREFIX_RE.test(trimmed)) {
    return trimmed.split(/\s+/).length <= 6;
  }
  return true;
}

function isLikelyStandaloneHeading(input: string) {
  const trimmed = cleanHeadingText(input);

  if (!trimmed || trimmed.length > 110) {
    return false;
  }

  if (isDecorativeLine(trimmed)) {
    return false;
  }

  if (matchesMajorHeadingKeyword(trimmed) || MINOR_HEADING_RE.test(trimmed)) {
    return true;
  }

  if (ALL_CAPS_RE.test(trimmed)) {
    return true;
  }

  return trimmed.split(/\s+/).length <= 10 && !/[.!?]$/.test(trimmed);
}

function isStrongStandaloneHeadingSignal(input: string) {
  const trimmed = cleanHeadingText(input);
  if (!trimmed) return false;

  // A genuine standalone heading/marker line never contains an internal
  // sentence break — guards against a PDF body-text line wrap that happens
  // to start with a heading keyword (e.g. a mid-paragraph reference like
  // "...revisa el\ncapítulo dos. Identifica tu perfil..." wrapping so
  // "capítulo dos." starts its own physical line).
  if (/[.!?]\s+\S/.test(trimmed)) return false;

  return matchesMajorHeadingKeyword(trimmed) || MINOR_HEADING_RE.test(trimmed) || ALL_CAPS_RE.test(trimmed);
}

function isLikelyAuthorName(input: string) {
  const trimmed = input.trim();
  if (!trimmed || COPYRIGHT_RE.test(trimmed) || isDecorativeLine(trimmed)) {
    return false;
  }

  if (ALL_CAPS_RE.test(trimmed)) {
    return false;
  }

  if (MAJOR_HEADING_RE.test(trimmed) || MINOR_HEADING_RE.test(trimmed)) {
    return false;
  }

  return /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ'’-]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ'’-]+){1,4}$/u.test(trimmed);
}

/**
 * `allowBareKeyword` gates the keyword-prefix branch (a bare
 * "Introducción"/"Recursos"/"Fase 1"/... line with no colon or page
 * number). It is safe to trust unconditionally for HTML/DOCX list items —
 * they are already inside a `<ul>`/`<li>`, so the keyword genuinely is a
 * TOC entry — but NOT for a freestanding physical line in a PDF/plain-text
 * body, where the same bare word is exactly how a real "Introducción" or
 * "Recursos" chapter heading looks. Callers in that context pass
 * `allowBareKeyword: insideToc` so the keyword only counts as an index
 * entry while genuinely inside a detected table of contents.
 */
function isLikelyIndexEntry(input: string, options: { allowBareKeyword?: boolean } = {}) {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 120) return false;

  if (
    options.allowBareKeyword !== false &&
    /^(?:introducci[oó]n|d[ií]a\s+\d+|recursos|continuidad|fase\s+\d+|cierre)(?:\b|:)/i.test(trimmed)
  ) {
    return true;
  }

  return trimmed.includes(':') && trimmed.split(/\s+/).length <= 14;
}

function splitInlineListItems(paragraph: string) {
  const cleaned = paragraph.replace(/^[-•*]\s*/, '').trim();
  if (!cleaned.includes(' - ')) return [];

  const parts = cleaned
    .split(/\s+-\s+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (parts.length < 3) return [];
  if (!parts.every((item) => item.length <= 120 || isLikelyIndexEntry(item))) return [];

  return parts;
}

function listBlocksFromItems(items: string[], ordered = false): ParsedBlock[] {
  if (items.length === 0) return [];

  const tag = ordered ? 'ol' : 'ul';
  const chunks: string[][] = [];
  let current: string[] = [];
  let currentWords = 0;

  for (const item of items) {
    const words = item.split(/\s+/).filter(Boolean).length;
    if (current.length > 0 && (current.length >= 6 || currentWords + words > 140)) {
      chunks.push(current);
      current = [];
      currentWords = 0;
    }
    current.push(item);
    currentWords += words;
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks.map((chunk) => ({
    kind: 'list' as const,
    text: chunk.join('\n'),
    html: `<${tag}>${chunk.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</${tag}>`,
    level: null,
    structural: false,
  }));
}

function parseTextBlocks(input: string, mode: TextImportMode = 'default'): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const lines = splitLines(input);
  let paragraphLines: string[] = [];
  let listItems: string[] = [];
  let orderedList = false;
  // True right after a detected "Índice"-family heading and until the next
  // blank line (a page boundary, after page-aware extraction) or a real
  // heading is found — while true, short non-terminal-punctuated lines are
  // kept as index list items instead of being re-classified as standalone
  // headings, so TOC lines like "Prólogo 6" / "Epílogo 110" never spawn
  // duplicate chapter boundaries alongside the real body headings.
  let insideToc = false;

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;

    const sourceLines = paragraphLines.map((line) => line.trim()).filter(Boolean);
    const paragraphContent = buildParagraphContentFromLines(paragraphLines, mode);
    paragraphLines = [];

    if (!paragraphContent) return;

    const paragraph = paragraphContent.text;

    if (!paragraph || isDecorativeLine(paragraph)) return;

    const inlineListItems = splitInlineListItems(paragraph);
    if (inlineListItems.length > 0) {
      blocks.push(...listBlocksFromItems(inlineListItems));
      return;
    }

    const explicitHeadingLevel = getHeadingLevel(paragraph);
    if (explicitHeadingLevel !== null) {
      const explicitHeadingText = finalizeHeadingText(paragraph);
      blocks.push({
        kind: 'heading',
        text: explicitHeadingText,
        html: `<h${Math.min(explicitHeadingLevel + 1, 3)}>${escapeHtml(explicitHeadingText)}</h${Math.min(explicitHeadingLevel + 1, 3)}>`,
        level: explicitHeadingLevel,
        structural: true,
      });
        return;
      }

      const detectionParagraph = mode === 'pdf' ? normalizeTrackedHeading(paragraph) : paragraph;

      if (
        sourceLines.length === 1 &&
        (mode === 'default'
          ? isLikelyStandaloneHeading(detectionParagraph)
          : isStrongStandaloneHeadingSignal(detectionParagraph))
      ) {
        const level = inferHeadingLevel(detectionParagraph) ?? 2;
        const standaloneHeadingText = finalizeHeadingText(detectionParagraph);
        blocks.push({
          kind: 'heading',
          text: standaloneHeadingText,
        html: `<h${Math.min(level + 1, 3)}>${escapeHtml(standaloneHeadingText)}</h${Math.min(level + 1, 3)}>`,
        level,
        structural: getHeadingLevel(paragraph) !== null,
      });
      return;
    }

    blocks.push({
      kind: 'paragraph',
      text: paragraph,
      html: paragraphContent.html,
      level: null,
      structural: false,
    });
  };

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push(...listBlocksFromItems(listItems, orderedList));
    listItems = [];
    orderedList = false;
  };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const rawLine = lines[lineIndex];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      insideToc = false;
      continue;
    }

    const bulletMatch = trimmed.match(/^[-•*]\s+(.+)$/);
    const orderedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    const markdownLevel = getHeadingLevel(trimmed);
    const looksLikeTocContinuation =
      insideToc &&
      markdownLevel === null &&
      trimmed.length <= 120 &&
      trimmed.split(/\s+/).length <= 14 &&
      !/[.!?]$/.test(trimmed);
    // A line that independently reads as a genuine heading (e.g. "Capítulo
    // 3: El suelo financiero") must never be swallowed by the colon-based
    // index-entry heuristic below just because it also has a colon —
    // outside TOC context, a colon-titled heading wins.
    const isPotentialHeadingLine =
      !insideToc &&
      mode === 'pdf' &&
      isStrongStandaloneHeadingSignal(normalizeTrackedHeading(trimmed));

    if (
      bulletMatch ||
      orderedMatch ||
      looksLikeTocContinuation ||
      (markdownLevel === null &&
        !isPotentialHeadingLine &&
        isLikelyIndexEntry(trimmed, { allowBareKeyword: mode === 'pdf' ? insideToc : true }))
    ) {
      flushParagraph();
      const nextOrdered = Boolean(orderedMatch);
      if (listItems.length > 0 && orderedList !== nextOrdered) {
        flushList();
      }
      orderedList = nextOrdered;
      listItems.push((orderedMatch?.[1] ?? bulletMatch?.[1] ?? trimmed).trim());
      continue;
    }

    if (markdownLevel !== null) {
      flushParagraph();
      flushList();
      const heading = finalizeHeadingText(trimmed);
      blocks.push({
        kind: 'heading',
        text: heading,
        html: `<h${Math.min(markdownLevel + 1, 3)}>${escapeHtml(heading)}</h${Math.min(markdownLevel + 1, 3)}>`,
        level: markdownLevel,
        structural: true,
      });
      continue;
    }

    const detectionLine = mode === 'pdf' ? normalizeTrackedHeading(trimmed) : trimmed;

    // A bare "Capítulo N" / "Chapter N" marker (no inline title) carries its
    // real title on the following line(s) — e.g. a letter-tracked
    // "C A P Í T U L O 1" followed by "No estás roto: estás atrapado\nen
    // una estructura". Only fires in pdf mode; a marker WITH inline title
    // ("Capítulo 3: El suelo financiero") is left to the check below.
    if (mode === 'pdf' && CHAPTER_MARKER_RE.test(detectionLine)) {
      const continuation = consumeHeadingContinuationLines(lines, lineIndex + 1);
      if (continuation.title) {
        flushParagraph();
        flushList();
        insideToc = false;
        const heading = finalizeHeadingText(continuation.title);
        blocks.push({
          kind: 'heading',
          text: heading,
          html: `<h2>${escapeHtml(heading)}</h2>`,
          level: 1,
          structural: true,
        });
        lineIndex += continuation.consumed;
        continue;
      }
    }

    if (
      mode === 'default'
        ? isLikelyStandaloneHeading(trimmed)
        : isStrongStandaloneHeadingSignal(detectionLine)
    ) {
      flushParagraph();
      flushList();
      const heading = finalizeHeadingText(detectionLine);
      insideToc = isTocChapterTitle(heading);
      const level = inferHeadingLevel(detectionLine) ?? 2;
      blocks.push({
        kind: 'heading',
        text: heading,
        html: `<h${Math.min(level + 1, 3)}>${escapeHtml(heading)}</h${Math.min(level + 1, 3)}>`,
        level,
        structural: markdownLevel !== null,
      });
      continue;
    }

    flushList();
    paragraphLines.push(trimmed);
  }

  flushParagraph();
  flushList();

  return blocks;
}

function stripImportedTocPageMarkup(fragment: string) {
  let sanitized = fragment
    .replace(/<span\s+data-toc-leader="true"[^>]*>[\s\S]*?<\/span>/gi, '')
    .replace(/<span\s+data-toc-page="true"[^>]*>[\s\S]*?<\/span>/gi, '')
    .replace(/<span\s+data-toc-title="true"[^>]*>([\s\S]*?)<\/span>/gi, '$1')
    .replace(/<span\s+[^>]*class="[^"]*\btoc-leader\b[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '')
    .replace(/<span\s+[^>]*class="[^"]*\btoc-page\b[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '')
    .replace(/<span\s+[^>]*class="[^"]*\btoc-title\b[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, '$1')
    .replace(/\sdata-toc-(entry|level|page)="[^"]*"/gi, '');

  sanitized = sanitized.replace(
    /(<(p|li|h[1-6])(?:\s[^>]*)?>)([\s\S]*?)(<\/\2>)/gi,
    (_match, open: string, _tag: string, inner: string, close: string) => {
      const cleanedInner = inner.replace(/\s*[·._\-—~∿]{2,}\s*\d+\s*$/u, '').trim();
      return `${open}${cleanedInner}${close}`;
    },
  );

  return sanitized;
}

function splitHtmlListBlocks(fragment: string): ParsedBlock[] {
  const tag =
    fragment.match(/^<(ul|ol)/i)?.[1]?.toLowerCase() === 'ol' ? 'ol' : 'ul';
  const items = Array.from(
    fragment.matchAll(/<li[^>]*>[\s\S]*?<\/li>/gi),
  )
    .map((m) => normalizeHtmlFragment(m[0]))
    .filter(Boolean);

  if (items.length === 0) {
    return [
      {
        kind: 'list',
        text: textFromHtml(fragment),
        html: fragment,
        level: null,
        structural: false,
      },
    ];
  }

  // FUSIONA <li>Título</li> + <li>·····5</li> en una sola entrada semántica:
  //   <li data-toc-entry="true" data-toc-level="2" data-toc-page="5">Título</li>
  // Sin spans anidados: el editor TipTap los descarta (no hay mark para ellos).
  // Los `·` y el número los pinta CSS (::before + ::after con attr(data-toc-page)).
  const merged: string[] = [];
  for (let i = 0; i < items.length; i++) {
    const currText = textFromHtml(items[i]).trim().replace(/\s+/g, ' ');
    const nextText = items[i + 1] ? textFromHtml(items[i + 1]).trim() : '';
    const isNextLeader = /^[·._\-—\s]{2,}\d+\s*$/.test(nextText);

    if (currText && isNextLeader && !/^\d+$/.test(currText)) {
      merged.push(
        `<li data-toc-entry="true" data-toc-level="2">${escapeHtml(currText)}</li>`,
      );
      i++; // saltamos el líder
    } else if (!/^[·._\-—\s]{2,}\d+\s*$/.test(currText)) {
      // Entrada sin número (índice "limpio"): envolver en data-toc-entry para
      // que "Actualizar numeración" pueda inyectar data-toc-page después.
      if (currText) {
        merged.push(
          `<li data-toc-entry="true" data-toc-level="2">${escapeHtml(currText)}</li>`,
        );
      }
    }
  }

  // Si todos los elementos parecen entradas de índice, no troceamos en varios <ul>.
  // Esto reduce el espacio vertical del capítulo de índice.
  const allLookLikeIndex = merged.every((html) =>
    isLikelyIndexEntry(textFromHtml(html).trim()),
  );

  if (allLookLikeIndex) {
    return [
      {
        kind: 'list' as const,
        text: merged.map(textFromHtml).join('\n'),
        html: `<${tag} class="toc-list">${merged.join('')}</${tag}>`,
        level: null,
        structural: false,
      },
    ];
  }

  // chunking original para no mover Fase 2
  const groups: string[][] = [];
  let cur: string[] = [];
  let w = 0;
  for (const it of merged) {
    const words = textFromHtml(it).split(/\s+/).length;
    if (cur.length >= 6 || w + words > 140) {
      groups.push(cur);
      cur = [];
      w = 0;
    }
    cur.push(it);
    w += words;
  }
  if (cur.length) groups.push(cur);

  return groups.map((g) => ({
    kind: 'list' as const,
    text: g.map(textFromHtml).join('\n'),
    html: `<${tag} class="toc-list">${g.join('')}</${tag}>`,
    level: null,
    structural: false,
  }));
}

function parseHtmlBlocks(input: string) {
  const normalized = normalizeHtmlFragment(input);
  const matches = normalized.match(BLOCK_TAG_RE)?? [];
  const blocks: ParsedBlock[] = [];

  for (const fragment of matches) {
    const clean = normalizeHtmlFragment(stripImportedTocPageMarkup(fragment));
    const tag = clean.match(/^<(h[1-6]|p|ul|ol|blockquote|table)/i)?.[1]?.toLowerCase()?? 'p';
    const text = textFromHtml(clean);
    if (!text || isDecorativeLine(text)) continue;

    const isLeader = /^[·._\-—\s]{2,}\d+\s*$/.test(text.trim());

    // Si es solo puntos+número, lo descartamos: el índice importado debe quedar limpio
    // y la numeración solo se inyecta cuando el usuario pulsa "Actualizar numeración".
    if (isLeader) {
      continue;
    }

    if (tag.startsWith('h')) {
      blocks.push({ kind: 'heading', text: cleanHeadingText(text), html: clean, level: Number(tag.replace('h','')), structural: true });
    } else if (tag === 'ul' || tag === 'ol') {
      blocks.push(...splitHtmlListBlocks(clean));
    } else if (tag === 'blockquote') {
      blocks.push({ kind: 'quote', text, html: clean, level: null, structural: true });
    } else {
      blocks.push({ kind: 'paragraph', text, html: clean, level: null, structural: false });
    }
  }
  return blocks;
}

function determineChapterBoundaryLevel(blocks: ParsedBlock[]) {
  const structuralHeadings = blocks.filter((block) => block.kind === 'heading' && block.structural && block.level !== null);
  const level1Count = structuralHeadings.filter((block) => block.level === 1).length;
  const level2Count = structuralHeadings.filter((block) => block.level === 2).length;

  if (level1Count === 1 && level2Count > 0) {
    return 2;
  }

  if (level1Count === 0 && level2Count > 1) {
    return 2;
  }

  return 1;
}

function isMajorChapterBlock(block: ParsedBlock, chapterBoundaryLevel: number) {
  if (block.kind !== 'heading') return false;
  const normalized = cleanHeadingText(block.text);
  if (!normalized) return false;

  if (block.structural && (block.level ?? 9) <= chapterBoundaryLevel) return true;
  if (MAJOR_HEADING_RE.test(normalized)) return true;
  return false;
}

function buildOutlineEntriesFromBlocks(
  blocks: ParsedBlock[],
  title: string,
  chapterBoundaryLevel: number,
): OutlineEntry[] {
  return blocks.reduce<OutlineEntry[]>((entries, block) => {
    if (block.kind !== 'heading') {
      return entries;
    }

    const headingText = cleanHeadingText(block.text);
    if (!headingText || headingText === title) {
      return entries;
    }

    const derivedLevel =
      block.structural && block.level !== null
        ? Math.max(1, block.level - chapterBoundaryLevel + 1)
        : MAJOR_HEADING_RE.test(headingText)
          ? 1
          : 2;

    entries.push({
      title: headingText,
      level: derivedLevel,
      origin: 'detected',
    });

    return entries;
  }, []);
}

/** Mirrors preview-builder isTocChapter so import uses consistent detection. */
function isTocChapterTitle(title: string) {
  const normalized = title
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
  return [
    'indice',
    'index',
    'tabla de contenidos',
    'tabla de contenido',
    'table of contents',
    'contents',
    'contenidos',
    'contenido',
    'sumario',
  ].includes(normalized);
}

function buildGeneratedIndexChapter(outline: OutlineEntry[]) {
  const filtered = outline.filter((entry) => !isTocChapterTitle(entry.title));
  if (filtered.length < 2) return null;

  const blocks: ImportedDocumentSeed['blocks'] = [];
  let currentGroup: { title: string; items: string[] } | null = null;

  const flushGroup = () => {
    if (!currentGroup) return;
    blocks.push({ type: 'heading', content: currentGroup.title });
    if (currentGroup.items.length > 0) {
      blocks.push({
        type: 'paragraph',
        content: `<ul>${currentGroup.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`,
      });
    }
    currentGroup = null;
  };

  for (const entry of filtered) {
    if (entry.level <= 1) {
      flushGroup();
      currentGroup = { title: entry.title, items: [] };
    } else if (currentGroup) {
      currentGroup.items.push(entry.title);
    } else {
      // Level 2 entry without a parent level 1 entry
      blocks.push({ type: 'heading', content: entry.title });
    }
  }

  flushGroup();

  if (blocks.length === 0) return null;

  // Prepend the chapter title as a heading block ONLY if not already there
  const firstBlockContent = blocks[0]?.content || '';
  const hasIndexHeading = firstBlockContent.toLowerCase().includes('índice');

  if (!hasIndexHeading) {
    blocks.unshift({ type: 'heading', content: 'Índice' });
  }

  return {
    chapter: {
      title: 'Índice',
      blocks,
    },
    outlineEntry: {
      title: 'Índice',
      level: 1,
      origin: 'generated' as const,
    },
  };
}

function isAllCapsLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return /\p{Lu}/u.test(trimmed) && !/\p{Ll}/u.test(trimmed);
}

// Lowercase connector words kept lowercase in editorial title case — never
// the first word of a title, which is always capitalized regardless.
const MINOR_TITLE_WORDS_RE =
  /^(?:de|del|la|las|el|los|en|y|e|o|u|a|con|sin|por|para|su|tu|mi|al|un|una|the|of|in|on|at|to|for|and|or|but|with|an)$/i;

function capitalizeWord(word: string): string {
  const match = word.match(/^(\P{L}*)(\p{L})(.*)$/u);
  if (!match) return word;
  const [, prefix, firstLetter, rest] = match;
  return `${prefix}${firstLetter.toLocaleUpperCase('es')}${rest}`;
}

/**
 * Converts an ALL-CAPS cover title/subtitle ("EL PLAN DE ESCAPE DE LA
 * MEDIANA EDAD") into standard editorial title case ("El Plan de Escape de
 * la Mediana Edad") — a typographic cover convention, not the document's
 * real casing. Only ever applied to text already confirmed ALL-CAPS
 * (`isAllCapsText`); ordinary mixed-case text is never touched.
 */
function toEditorialTitleCase(input: string): string {
  const lower = input.toLocaleLowerCase('es');
  return lower
    .split(' ')
    .map((token, index) => {
      const bareWord = token.replace(/[^\p{L}]/gu, '');
      if (index > 0 && MINOR_TITLE_WORDS_RE.test(bareWord)) return token;
      return capitalizeWord(token);
    })
    .join(' ');
}

function isAllCapsText(input: string): boolean {
  return /\p{Lu}/u.test(input) && !/\p{Ll}/u.test(input);
}

/**
 * A single front-matter block that visually merges a multi-line ALL-CAPS
 * cover title with a following mixed-case subtitle — no blank line
 * separates them in the source, e.g. "EL PLAN DE ESCAPE\nDE LA MEDIANA
 * EDAD\nCómo desatascarte profesionalmente\nsin dinamitar tu vida" — is
 * split into a title block (the leading caps lines) and a subtitle block
 * (the following lines), so later detection sees them as two front-matter
 * candidates instead of one garbled one. Conservative: only splits a short
 * block (<= 6 lines) with a genuine capitalization transition; an
 * ordinary paragraph (no caps prefix, or entirely caps/entirely mixed) is
 * left untouched.
 */
function splitTitleSubtitleBlock(block: ParsedBlock): ParsedBlock[] {
  if (block.kind !== 'paragraph' && block.kind !== 'heading') return [block];

  const lines = block.text.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2 || lines.length > 6) return [block];

  let splitAt = 0;
  while (splitAt < lines.length && isAllCapsLine(lines[splitAt])) {
    splitAt += 1;
  }

  if (splitAt === 0 || splitAt >= lines.length) return [block];

  const titleLines = lines.slice(0, splitAt);
  const subtitleLines = lines.slice(splitAt);
  if (subtitleLines.some((line) => isDecorativeLine(line) || COPYRIGHT_RE.test(line) || isLikelyAuthorName(line))) {
    return [block];
  }

  const titleText = titleLines.join(' ');
  const subtitleText = subtitleLines.join(' ');

  return [
    { kind: 'paragraph', text: titleText, html: `<p>${escapeHtml(titleText)}</p>`, level: null, structural: false },
    { kind: 'paragraph', text: subtitleText, html: `<p>${escapeHtml(subtitleText)}</p>`, level: null, structural: false },
  ];
}

function findTitleCandidate(frontMatter: ParsedBlock[]) {
  const index = frontMatter.findIndex((block) => {
    const text = block.text.trim();
    return (
      text.length > 0 &&
      text.length <= 140 &&
      !isDecorativeLine(text) &&
      !COPYRIGHT_RE.test(text) &&
      !isLikelyAuthorName(text)
    );
  });

  return index >= 0 ? { index, block: frontMatter[index] } : null;
}

function detectTitleFromFrontMatter(frontMatter: ParsedBlock[], fallbackTitle: string) {
  const candidate = findTitleCandidate(frontMatter);
  const cleaned = stripMarkdownInline(candidate?.block.text || fallbackTitle);
  return {
    title: isAllCapsText(cleaned) ? toEditorialTitleCase(cleaned) : cleaned,
    foundCandidate: candidate !== null,
  };
}

/** M4/M9 — which signal produced the author, so confidence can follow the
 *  documented policy (byline: high; copyright: medium; none: low) instead
 *  of a position-in-text proxy. */
export type AuthorDetectionSource = 'byline' | 'copyright' | 'none';

function detectAuthorFromFrontMatter(
  frontMatter: ParsedBlock[],
  fallbackText: string,
): { author: string; source: AuthorDetectionSource } {
  const titleCandidate = findTitleCandidate(frontMatter);
  const startIndex = titleCandidate ? titleCandidate.index + 1 : 0;

  for (const block of frontMatter.slice(startIndex)) {
    if (COPYRIGHT_RE.test(block.text)) {
      // The front matter itself carries no separate byline line (common
      // for a PDF cover), but the copyright block right here often names
      // the author directly ("© 2026 Antonio Ballesteros Alonso").
      const fromCopyright = extractAuthorFromCopyright(block.text);
      if (fromCopyright) return { author: fromCopyright, source: 'copyright' };
      break;
    }
    // "Por María López" / "By Jane Smith": strip the explicit byline prefix
    // first — checked before the bare-name shape below, since "Por"/"By"
    // is itself Title-Case-word-shaped and would otherwise be kept as part
    // of the "name".
    const trimmedBlockText = block.text.trim();
    const withoutBylinePrefix = trimmedBlockText.replace(/^(?:by|por)\s+/i, '');
    if (withoutBylinePrefix !== trimmedBlockText && isLikelyAuthorName(withoutBylinePrefix)) {
      return { author: withoutBylinePrefix, source: 'byline' };
    }
    if (isLikelyAuthorName(block.text)) return { author: block.text, source: 'byline' };
  }

  const fromCopyrightFallback = extractAuthorFromCopyright(fallbackText);
  if (fromCopyrightFallback) return { author: fromCopyrightFallback, source: 'copyright' };

  const fromBoldText = extractAuthorFromText(fallbackText);
  if (fromBoldText) return { author: fromBoldText, source: 'byline' };

  return { author: '', source: 'none' };
}

function detectSubtitleFromFrontMatter(
  frontMatter: ParsedBlock[],
  title: string,
  author: string,
) {
  const titleCandidate = findTitleCandidate(frontMatter);
  const startIndex = titleCandidate ? titleCandidate.index + 1 : 0;
  const candidates: string[] = [];

  for (const block of frontMatter.slice(startIndex)) {
    const text = stripMarkdownInline(block.text);
    if (!text || isDecorativeLine(text)) continue;
    if (text === title) continue;
    if (text === author || isLikelyAuthorName(text) || COPYRIGHT_RE.test(text)) break;
    candidates.push(text);
    if (candidates.length >= 5) break;
  }

  const subtitleParts: string[] = [];
  let length = 0;

  for (const candidate of candidates) {
    if (length + candidate.length > 220 && subtitleParts.length > 0) break;
    subtitleParts.push(candidate);
    length += candidate.length + 3;
  }

  // Space-joined: a multi-line subtitle ("Cómo desatascarte
  // profesionalmente" / "sin dinamitar tu vida") is one continuous phrase,
  // not a list of separate taglines — a middot read as a visual list
  // separator instead of natural prose.
  const joinedSubtitle = subtitleParts.join(' ');
  const subtitle = isAllCapsText(joinedSubtitle) ? toEditorialTitleCase(joinedSubtitle) : joinedSubtitle;
  return {
    subtitle,
    candidateCount: candidates.length,
  };
}

function toDocumentBlock(block: ParsedBlock) {
  if (block.kind === 'heading') {
    // Cuando el HTML fuente ya porta el nivel real del heading (tag <hN> con
    // N === block.level, p.ej. mammoth/DOCX), se conserva el tag intacto para
    // que from-html no degrade todo a h2. La heurística de texto (markdown)
    // genera <h${level+1}>, así que sigue yendo como texto plano.
    const preservesSourceLevel =
      block.structural && block.level !== null && block.html.startsWith(`<h${block.level}`);
    return {
      type: 'heading' as const,
      content: preservesSourceLevel ? block.html : cleanHeadingText(block.text),
    };
  }

  if (block.kind === 'quote') {
    return {
      type: 'quote' as const,
      content: block.html || block.text,
    };
  }

  return {
    type: 'paragraph' as const,
    content: block.html || block.text,
  };
}

function extractPrologueBlocksFromFrontMatter(frontMatter: ParsedBlock[], title: string, author: string) {
  let lastCopyrightIdx = -1;

  for (let index = 0; index < frontMatter.length; index += 1) {
    if (COPYRIGHT_RE.test(frontMatter[index].text)) {
      lastCopyrightIdx = index;
    }
  }

  if (lastCopyrightIdx < 0) return [];

  return frontMatter
    .slice(lastCopyrightIdx + 1)
    .filter((block) => {
      const text = block.text.trim();
      return text.length > 12 && text !== title && text !== author && !COPYRIGHT_RE.test(text);
    });
}

function buildChaptersFromBlocks(
  blocks: ParsedBlock[],
  title: string,
  author: string,
  chapterBoundaryLevelOverride?: 1 | 2 | null,
) {
  const chapters: NonNullable<ImportedDocumentSeed['chapters']> = [];
  const frontMatter: ParsedBlock[] = [];
  let currentTitle: string | null = null;
  let currentBlocks: ParsedBlock[] = [];
  const autoLevel = determineChapterBoundaryLevel(blocks);
  // M5: only override when the preset's boundary level actually exists in
  // this document (e.g. forcing H2 on a doc with no H2 headings would merge
  // everything into one chapter) — otherwise fall back to auto-detection.
  const hasOverrideLevel =
    chapterBoundaryLevelOverride != null &&
    blocks.some((block) => block.kind === 'heading' && block.structural && block.level === chapterBoundaryLevelOverride);
  const chapterBoundaryLevel = hasOverrideLevel ? chapterBoundaryLevelOverride! : autoLevel;

  const flushCurrent = () => {
    if (!currentTitle) return;

    const documentBlocks = currentBlocks
      .filter((block) => block.text.trim().length > 0 || block.kind === 'rule')
      .map(toDocumentBlock);

    // Only prepend the title heading if the first block isn't already that same title
    const firstBlockText = currentBlocks[0]?.text?.trim().toLowerCase() || '';
    const titleText = currentTitle.trim().toLowerCase();
    const shouldPrependTitle = firstBlockText !== titleText;

    chapters.push({
      title: currentTitle,
      blocks: [
        ...(shouldPrependTitle ? [{ type: 'heading' as const, content: currentTitle }] : []),
        ...(documentBlocks.length > 0
          ? documentBlocks
          : [{ type: 'paragraph' as const, content: currentTitle }]),
      ],
    });
  };

  for (const block of blocks) {
    if (
      currentTitle === null &&
      block.kind === 'heading' &&
      block.structural &&
      block.level === 1 &&
      chapterBoundaryLevel > 1
    ) {
      frontMatter.push(block);
      continue;
    }

    if (isMajorChapterBlock(block, chapterBoundaryLevel)) {
      const headingText = cleanHeadingText(block.text);
      const triggeringIsToc = isTocChapterTitle(headingText);
      let leadingBlocks: ParsedBlock[] = [];

      if (currentTitle === null && frontMatter.length > 0) {
        const prologueBlocks = extractPrologueBlocksFromFrontMatter(frontMatter, title, author);
        if (prologueBlocks.length > 0) {
          if (triggeringIsToc) {
            // Content between the copyright page and the table of contents
            // (e.g. a dedication) has no heading of its own. Fold it into
            // the upcoming Índice chapter instead of inventing a
            // misleading "Prólogo" label — a real Prólogo heading, if the
            // book has one, is detected later on its own merits.
            leadingBlocks = prologueBlocks;
          } else {
            chapters.push({
              title: 'Prólogo',
              blocks: prologueBlocks.map(toDocumentBlock),
            });
          }
        }
      }

      flushCurrent();
      currentTitle = headingText || `Capítulo ${chapters.length + 1}`;
      currentBlocks = [...leadingBlocks, block]; // Include the heading block in the content
      continue;
    }

    if (currentTitle) {
      currentBlocks.push(block);
    } else {
      frontMatter.push(block);
    }
  }

  flushCurrent();

  const detectedOutline = buildOutlineEntriesFromBlocks(blocks, title, chapterBoundaryLevel);

  if (chapters.length > 0) {
    return { chapters, frontMatter, detectedOutline };
  }

  const fallbackBlocks = blocks
    .filter((block) => block.text.trim().length > 0)
    .map(toDocumentBlock);

  return {
    frontMatter,
    detectedOutline,
    chapters: [
      {
        title,
        blocks:
          fallbackBlocks.length > 0
            ? fallbackBlocks
            : [{ type: 'paragraph', content: title }],
      },
    ],
  };
}

// Copyright/legal patterns: paragraphs matching these are skipped when extracting the prologue.
const COPYRIGHT_RE =
  /©|derechos\s+reservados|all\s+rights\s+reserved|primera\s+edici[oó]n|metodolog[ií]a\s+original|desarrollad[ao]\s+por\s+el\s+autor/i;

// Rejects an otherwise name-shaped copyright candidate that is really a
// publisher/imprint (a company suffix or a URL) rather than a person.
const COMPANY_LIKE_RE =
  /\b(?:s\.?\s?l\.?|s\.?\s?a\.?|inc\.?|ltd\.?|llc\.?|corp\.?|editorial(?:es)?|publishing|press|media|books?|ediciones)\b|https?:\/\/|www\./i;

/**
 * Author extraction for sources with no DOCX-bold byline (the common case
 * for a plain-text/PDF source): a copyright line ("© YEAR Name") or an
 * explicit byline ("By Name" / "Por Name"). Rejects anything that is not
 * shaped like a person's name (`isLikelyAuthorName`) or that looks like a
 * publisher/imprint rather than a person (`COMPANY_LIKE_RE`) — a company,
 * a URL, or legal boilerplate must never surface as "the author".
 */
function extractAuthorFromCopyright(text: string): string {
  const isPlausiblePersonName = (candidate: string) =>
    isLikelyAuthorName(candidate) && !COMPANY_LIKE_RE.test(candidate);

  const copyrightMatch = text.match(/©\s*\d{4}\s+([^\n]+)/);
  if (copyrightMatch) {
    const candidate = copyrightMatch[1].trim().replace(/[.,;]+$/, '');
    if (isPlausiblePersonName(candidate)) return candidate;
  }

  const bylineMatch = text.match(/^[ \t]*(?:by|por)\s+([^\n]+)$/im);
  if (bylineMatch) {
    const candidate = bylineMatch[1].trim().replace(/[.,;]+$/, '');
    if (isPlausiblePersonName(candidate)) return candidate;
  }

  return '';
}

/**
 * From the raw text (before markdown stripping), detect the author name.
 * Author lines in DOCX → mammoth markdown appear as bold-only lines: **Name**.
 */
function extractAuthorFromText(text: string): string {
  const lines = splitLines(text);
  // Scan lines in reverse, stopping at the first H1 heading.
  for (const line of [...lines].reverse()) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (isTopLevelChapterHeading(trimmed)) break;
    // Match a line that is entirely a bold span and looks like a person's name.
    const boldMatch = trimmed.match(/^\*\*([^*]+)\*\*$/) ?? trimmed.match(/^__([^_]+)__$/);
    if (boldMatch) {
      const candidate = boldMatch[1].trim();
      // A name has multiple words and no copyright-like content.
      if (candidate.includes(' ') && candidate.length > 5 && !COPYRIGHT_RE.test(candidate)) {
        return candidate;
      }
    }
  }
  return '';
}

function fileNameToTitle(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * M4 — per-field detection confidence, purely from heuristic signals already
 * produced during extraction (no AI). Documented rules:
 *  - title: 'high' when `findTitleCandidate` matched a genuine front-matter
 *    line; 'medium' when it fell back to the document's first paragraph as a
 *    guess; 'low' when even that failed and the filename itself was used.
 *  - author: 'low' when nothing was found; 'high' when the detected name
 *    appears near the top of the source text (front-matter byline, the
 *    common case for a real title-page author); 'medium' when it was only
 *    recovered via the whole-text fallback regex (e.g. a copyright line).
 *  - chapters: keyed off the same signal as the "no clear sections" warning
 *    — 'low' for a single conservative chapter, 'medium' for a couple, and
 *    'high' once several structural sections were detected.
 */
function computeImportConfidence(input: {
  titleFoundCandidate: boolean;
  title: string;
  fallbackTitle: string;
  authorSource: AuthorDetectionSource;
  chapterCount: number;
}): ImportedDocumentSeed['confidence'] {
  const titleConfidence: ImportFieldConfidence = input.titleFoundCandidate
    ? 'high'
    : input.title === input.fallbackTitle
      ? 'low'
      : 'medium';

  // M9: a byline (or the DOCX-bold-line equivalent) is direct, explicit
  // evidence -> high; a copyright-line extraction ("© YEAR Name") is
  // strong but indirect evidence -> medium; nothing found -> low.
  const authorConfidence: ImportFieldConfidence =
    input.authorSource === 'byline' ? 'high' : input.authorSource === 'copyright' ? 'medium' : 'low';

  const chaptersConfidence: ImportFieldConfidence =
    input.chapterCount <= 1 ? 'low' : input.chapterCount >= 3 ? 'high' : 'medium';

  return { title: titleConfidence, author: authorConfidence, chapters: chaptersConfidence };
}

export function buildImportedDocumentSeed({
  fileName,
  mimeType,
  text,
  html,
  sourcePageCount,
  manuscriptTypeOverride,
}: {
  fileName: string;
  mimeType: string;
  text: string;
  html?: string | null;
  sourcePageCount?: number;
  /** M5 — explicit preset from the analysis panel selector; leave unset to
   *  keep today's auto-detected chapter-splitting behavior unchanged. */
  manuscriptTypeOverride?: ManuscriptType;
}): ImportedDocumentSeed {
  const paragraphs = paragraphsFromText(text);
  const fallbackTitle = fileNameToTitle(fileName) || 'Documento importado';
  const rawTitle = paragraphs[0] && paragraphs[0].length <= 120? paragraphs[0] : fallbackTitle;
  const textImportMode = inferTextImportMode(fileName, mimeType);

  const normalizedHtml = html? html : null;
  const htmlBlocks = normalizedHtml? parseHtmlBlocks(normalizedHtml) : [];
  const textBlocks = parseTextBlocks(text, textImportMode);

  // Usa siempre HTML cuando viene de DOCX (ya lleva el TOC fusionado en splitHtmlListBlocks)
  const parsedBlocks = normalizedHtml && htmlBlocks.length > 0? htmlBlocks : textBlocks;

  const detectedManuscriptType = detectManuscriptType(text);
  const chapterBoundaryLevelOverride = manuscriptTypeOverride
    ? MANUSCRIPT_TYPE_CHAPTER_LEVEL[manuscriptTypeOverride]
    : null;
  const frontMatterSource = buildChaptersFromBlocks(
    parsedBlocks,
    fallbackTitle,
    extractAuthorFromText(text),
    chapterBoundaryLevelOverride,
  );
  const splitFrontMatter = frontMatterSource.frontMatter.flatMap(splitTitleSubtitleBlock);
  const titleDetection = detectTitleFromFrontMatter(splitFrontMatter, rawTitle);
  const title = titleDetection.title;
  const authorDetection = detectAuthorFromFrontMatter(splitFrontMatter, text);
  const author = authorDetection.author;
  const subtitleDetection = detectSubtitleFromFrontMatter(splitFrontMatter, title, author);
  const subtitle = subtitleDetection.subtitle
   ? subtitleDetection.subtitle.slice(0, 260)
    : `Documento importado desde ${fileName}`;

  let detectedChapters = frontMatterSource.chapters;
  let detectedOutline = frontMatterSource.detectedOutline?? detectedChapters.map((chapter) => ({
    title: chapter.title,
    level: 1,
    origin: 'detected' as const,
  }));

  const explicitIndexIdx = detectedChapters.findIndex((chapter) => isTocChapterTitle(chapter.title));
  const hasExplicitIndex = explicitIndexIdx >= 0;

  const chapterTitleSet = new Set(
    detectedChapters
     .filter((ch) =>!isTocChapterTitle(ch.title))
     .map((ch) => ch.title.trim().toLowerCase()),
  );

  const richLabelMap = new Map<string, string>();
  const extraTocEntries: OutlineEntry[] = [];

  for (const entry of detectedOutline) {
    const trimmedLower = entry.title.trim().toLowerCase();
    if (chapterTitleSet.has(trimmedLower)) continue;
    if (isTocChapterTitle(entry.title)) continue;
    if (!MAJOR_HEADING_RE.test(entry.title.trim())) continue;

    let matchedChapter: string | null = null;
    for (const chapterTitle of chapterTitleSet) {
      if (trimmedLower.startsWith(chapterTitle) && trimmedLower.length > chapterTitle.length) {
        matchedChapter = chapterTitle;
        break;
      }
    }

    if (matchedChapter) {
      const existing = richLabelMap.get(matchedChapter);
      if (!existing || entry.title.trim().length > existing.length) {
        richLabelMap.set(matchedChapter, entry.title.trim());
      }
    } else {
      const alreadyAdded = extraTocEntries.some(
        (e) => e.title.trim().toLowerCase() === trimmedLower,
      );
      if (!alreadyAdded) {
        extraTocEntries.push({...entry, level: 1 });
      }
    }
  }

  const baseOutlineForIndex = detectedOutline
   .filter((entry) => {
      const title = entry.title.trim();
      const titleLower = title.toLowerCase();
      if (isTocChapterTitle(title)) return false;
      if (chapterTitleSet.has(titleLower)) return true;
      if (MAJOR_HEADING_RE.test(title)) return true;
      if (MINOR_HEADING_RE.test(title)) return true;
      return false;
    })
   .map((entry) => {
      const title = entry.title.trim();
      const titleLower = title.toLowerCase();
      const richLabel = richLabelMap.get(titleLower);
      if (richLabel) return {...entry, title: richLabel, level: 1 };
      if (MAJOR_HEADING_RE.test(title)) return {...entry, level: 1 };
      if (MINOR_HEADING_RE.test(title)) return {...entry, level: 2 };
      return entry;
    });

  const outlineForIndex = baseOutlineForIndex;
  const generatedIndex = outlineForIndex.length >= 2? buildGeneratedIndexChapter(outlineForIndex) : null;

  if (generatedIndex &&!hasExplicitIndex) {
    const prologueIndex = detectedChapters.findIndex((chapter) => chapter.title.toLowerCase() === 'prólogo');
    const insertAt = prologueIndex >= 0? prologueIndex + 1 : 0;
    detectedChapters = [
     ...detectedChapters.slice(0, insertAt),
      generatedIndex.chapter,
     ...detectedChapters.slice(insertAt),
    ];
  }

  detectedOutline = outlineForIndex;

  const importedPreviewBlocks = (detectedChapters[0]?.blocks?? []).slice(0, 6).map(
    (block): ImportedDocumentSeed['blocks'][number] => ({
      type: block.type as ImportedDocumentSeed['blocks'][number]['type'],
      content: block.content,
    }),
  );

  const blocks: ImportedDocumentSeed['blocks'] =
    importedPreviewBlocks.length > 0
     ? importedPreviewBlocks
      : [
          { type: 'heading' as const, content: title },
          { type: 'paragraph' as const, content: subtitle },
        ];

  const normalizedDetectedChapters = detectedChapters.map(
    (chapter): NonNullable<ImportedDocumentSeed['chapters']>[number] => ({
      title: chapter.title,
      blocks: chapter.blocks.map((block) => ({
        type: block.type as ImportedDocumentSeed['blocks'][number]['type'],
        content: block.content,
      })),
    }),
  );

  const chapters: NonNullable<ImportedDocumentSeed['chapters']> =
    normalizedDetectedChapters.length > 0
     ? normalizedDetectedChapters
      : [{ title, blocks }];

  const warnings: string[] = [];
  if (!author) warnings.push('No se detectó con certeza el autor; revísalo tras importar.');
  if (generatedIndex) warnings.push('Se ha generado un índice sintético editable a partir de la estructura detectada del documento.');
  if (subtitleDetection.candidateCount > 2) warnings.push('La portada contenía varias líneas y se han condensado en un único subtítulo editable.');
  if (detectedChapters.length <= 1) warnings.push('No se detectaron secciones principales claras; se mantuvo una estructura conservadora.');

  const confidence = computeImportConfidence({
    titleFoundCandidate: titleDetection.foundCandidate,
    title,
    fallbackTitle,
    authorSource: authorDetection.source,
    chapterCount: detectedChapters.length,
  });

  return {
    title,
    subtitle,
    author,
    sourcePageCount,
    warnings,
    confidence,
    manuscriptType: manuscriptTypeOverride ?? detectedManuscriptType,
    detectedManuscriptType,
    detectedOutline,
    chapterTitle: detectedChapters[0]?.title || title,
    blocks,
    chapters,
    sourceFileName: fileName,
    sourceMimeType: mimeType,
  };
}

/**
 * Scanned/image-only PDF heuristic (F2 OCR de ingesta): a PDF whose text
 * layer is ~empty (below `SCANNED_PDF_MIN_TEXT_CHARS` after normalization)
 * is a candidate for FileStudio OCR. Non-PDF sources are never candidates.
 */
export const SCANNED_PDF_MIN_TEXT_CHARS = 100;

export function isScannedPdfSource(input: {
  fileName: string;
  mimeType: string;
  text: string;
}): boolean {
  const isPdf = getExtension(input.fileName) === 'pdf' || input.mimeType === 'application/pdf';
  if (!isPdf) return false;
  return normalizeText(input.text).length < SCANNED_PDF_MIN_TEXT_CHARS;
}

type PdfPageText = { num: number; text: string };

function isFolioLine(line: string): boolean {
  return STRICT_FOLIO_RE.test(line);
}

/**
 * Page-aware running header/footer + folio stripping (F2/import PDF
 * hardening — see pdf-import-structural-recovery spec §"Header/footer
 * policy"). Runs on the raw per-page text pdf-parse returns, before any
 * paragraph/heading parsing sees it, so a folio ("— 12 —") or a repeated
 * running header never gets folded into body content or mistaken for a
 * heading. Removal is keyed on repetition at a page boundary (>= 40% of
 * pages, minimum 3), never on text content alone — a genuine front-matter
 * title that happens to resemble the header but appears once is untouched.
 * O(pages): one pass to tally boundary lines, one pass to strip.
 */
function stripRunningHeadersAndFolios(pages: PdfPageText[]): string[] {
  const perPageLines = pages.map((page) => splitLines(page.text).map((line) => line.trim()));

  const nonBlankIndexesOf = (lines: string[]) =>
    lines.reduce<number[]>((acc, line, idx) => {
      if (line) acc.push(idx);
      return acc;
    }, []);

  const boundaryLineCounts = new Map<string, number>();
  for (const lines of perPageLines) {
    const nonBlankIndexes = nonBlankIndexesOf(lines);
    if (nonBlankIndexes.length === 0) continue;

    const first = lines[nonBlankIndexes[0]];
    const last = lines[nonBlankIndexes[nonBlankIndexes.length - 1]];

    for (const candidate of new Set([first, last])) {
      if (isFolioLine(candidate) || BARE_FOLIO_RE.test(candidate)) continue;
      boundaryLineCounts.set(candidate, (boundaryLineCounts.get(candidate) ?? 0) + 1);
    }
  }

  const threshold = Math.max(3, Math.ceil(pages.length * 0.4));
  const runningHeaders = new Set(
    [...boundaryLineCounts.entries()].filter(([, count]) => count >= threshold).map(([line]) => line),
  );

  return perPageLines.map((lines) => {
    const nonBlankIndexes = nonBlankIndexesOf(lines);
    const firstIdx = nonBlankIndexes[0];
    const lastIdx = nonBlankIndexes[nonBlankIndexes.length - 1];

    return lines
      .filter((line, idx) => {
        if (!line) return true;
        if (isFolioLine(line)) return false;
        const isBoundary = idx === firstIdx || idx === lastIdx;
        if (isBoundary && BARE_FOLIO_RE.test(line)) return false;
        if (isBoundary && runningHeaders.has(line)) return false;
        return true;
      })
      .join('\n');
  });
}

export async function extractTextFromBuffer(fileName: string, mimeType: string, buffer: Buffer) {
  const extension = getExtension(fileName);

  if (!SUPPORTED_IMPORT_EXTENSIONS.has(extension)) {
    throw new Error(`Unsupported import format: ${extension || 'unknown'}`);
  }

  if (extension === 'txt' || extension === 'md' || mimeType.startsWith('text/')) {
      return {
        text: buffer.toString('utf8'),
        html: null,
        pageCount: undefined,
      } satisfies ExtractedImportSource;
  }

  if (extension === 'pdf' || mimeType === 'application/pdf') {
    try {
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: buffer });
      // U-pdf: request a plain paragraph-safe page joiner so a fallback to
      // `parsed.text` (when the page-aware `pages` array isn't available,
      // e.g. in unit-test mocks) never carries the library's default
      // "-- N of TOTAL --" marker into the document text (root cause of the
      // pdf-import-structural-recovery regression — see the SDD spec).
      const parsed = await parser.getText({ pageJoiner: '\n\n' });
      await parser.destroy();

      const pages = (parsed as { pages?: PdfPageText[] }).pages;
      const text =
        Array.isArray(pages) && pages.length > 0
          ? stripRunningHeadersAndFolios(pages).join('\n\n')
          : parsed.text;

      return {
        text,
        html: null,
        pageCount: typeof (parsed as { total?: number; numpages?: number }).numpages === 'number'
          ? Number((parsed as { total?: number; numpages?: number }).numpages)
          : typeof (parsed as { total?: number; numpages?: number }).total === 'number'
            ? Number((parsed as { total?: number; numpages?: number }).total)
            : undefined,
      } satisfies ExtractedImportSource;
    } catch (error) {
      // U4: surface parser failures as a normalized error so the caller can
      // degrade to an empty shell document + non-blocking warning instead of
      // propagating an opaque pdf-parse exception.
      const detail = error instanceof Error ? error.message : 'unknown error';
      throw new Error(`PDF parse failed: ${detail}`);
    }
  }

  if (extension === 'docx') {
    try {
      const mammoth = await import('mammoth');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (mammoth.default as any).convertToHtml(
        { buffer },
        {
          styleMap: [
            "p[style-name='Title'] => h1:fresh",
            "p[style-name='Subtitle'] => h2:fresh",
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh",
            "p[style-name='Heading 3'] => h3:fresh",
            "p[style-name='Heading 4'] => h4:fresh",
            "p[style-name='Heading 5'] => h5:fresh",
            "p[style-name='TOC 1'] => p:fresh",
            "p[style-name='TOC 2'] => p:fresh",
            "p[style-name='TOC 3'] => p:fresh",
            "p[style-name='TOC Heading'] => h2:fresh",
            "p[style-name='Índice 1'] => p:fresh",
            "p[style-name='Índice 2'] => p:fresh",
            "p[style-name='Indice 1'] => p:fresh",
            "p[style-name='Indice 2'] => p:fresh",
          ],
        },
      );
      const richHtml = normalizeHtmlFragment(result.value).replace(/<p([^>]*)>(\s*[·._\-—]{3,}\s*\d+\s*)<\/p>/gi, '<p$1 class="toc-entry">$2</p>');
      const richText = normalizeText(textFromHtml(richHtml));

      if (richText) {
        return {
          text: richText,
          html: richHtml,
          pageCount: await extractDocxPageCount(buffer),
        } satisfies ExtractedImportSource;
      }
    } catch {
      // Fallback to WordExtractor below when Mammoth is unavailable or fails.
    }
  }

  if (extension === 'doc' || extension === 'docx') {
    const { default: WordExtractor } = await import('word-extractor');
    const extractor = new WordExtractor();
    const document = await extractor.extract(buffer);
    return {
      text: document.getBody(),
      html: null,
      pageCount: extension === 'docx' ? await extractDocxPageCount(buffer) : undefined,
    } satisfies ExtractedImportSource;
  }

  throw new Error(`Import format is not supported yet: ${extension}`);
}

async function extractDocxPageCount(buffer: Buffer): Promise<number | undefined> {
  try {
    const { default: JSZip } = await import('jszip');
    const zip = await JSZip.loadAsync(buffer);
    const entry = zip.file('docProps/app.xml');
    if (!entry) return undefined;
    const appXml = await entry.async('text');
    const pageMatch = appXml.match(/<Pages>(\d+)<\/Pages>/i);
    if (!pageMatch) return undefined;

    const pageCount = Number.parseInt(pageMatch[1], 10);
    return Number.isFinite(pageCount) && pageCount > 0 ? pageCount : undefined;
  } catch {
    return undefined;
  }
}
