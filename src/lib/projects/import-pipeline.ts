import type { ImportedDocumentSeed } from './types';

const SUPPORTED_IMPORT_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'txt', 'md']);
const BLOCK_TAG_RE = /<(h[1-6]|p|ul|ol|blockquote)[^>]*>[\s\S]*?<\/\1>/gi;
const ALL_CAPS_RE = /^(?=.{40,})[^a-z]*[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9 .,·:;()\-–—]+$/;
const MAJOR_HEADING_RE = /^(?:cap[ií]tulo|chapter|introducci[oó]n|pr[oó]logo|prologo|[íi]ndice|indice|fase\s+\d+|parte\s+\d+|secci[oó]n|ep[ií]logo|cierre|despu[eé]s\s+de|recursos(?:\s+recomendados)?|anexos?)(?:\b|:)/i;
const MINOR_HEADING_RE = /^(?:d[ií]a\s+\d+|tema\s+\d+|idea\s+clave|reto\s+de\s+acci[oó]n|preguntas?\s+de\s+reflexi[oó]n|ejercicio|caso|las\s+cinco\s+claves|cierre\s+de\s+fase)(?:\b|:)/i;

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
    .replace(/\sclass="[^"]*"/gi, '')
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
      .replace(/^\d+(?:\.\d+)*[.)]?\s+/, '')
      .trim()
  );
}

function getHeadingLevel(input: string) {
  const markdownMatch = input.match(/^(#{1,6})\s+/);
  if (markdownMatch) {
    return markdownMatch[1].length;
  }

  const numericMatch = input.match(/^(\d+(?:\.\d+)*)[.)]?\s+/);
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

function isTopLevelChapterHeading(input: string) {
  const level = inferHeadingLevel(input.trim());
  return level !== null && level <= 1;
}

function isLikelyStandaloneHeading(input: string) {
  const trimmed = cleanHeadingText(input);

  if (!trimmed || trimmed.length > 110) {
    return false;
  }

  if (isDecorativeLine(trimmed)) {
    return false;
  }

  if (MAJOR_HEADING_RE.test(trimmed) || MINOR_HEADING_RE.test(trimmed)) {
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

  return MAJOR_HEADING_RE.test(trimmed) || MINOR_HEADING_RE.test(trimmed) || ALL_CAPS_RE.test(trimmed);
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

function isLikelyIndexEntry(input: string) {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 120) return false;

  if (/^(?:introducci[oó]n|d[ií]a\s+\d+|recursos|continuidad|fase\s+\d+|cierre)(?:\b|:)/i.test(trimmed)) {
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
      blocks.push({
        kind: 'heading',
        text: cleanHeadingText(paragraph),
        html: `<h${Math.min(explicitHeadingLevel + 1, 3)}>${escapeHtml(cleanHeadingText(paragraph))}</h${Math.min(explicitHeadingLevel + 1, 3)}>`,
        level: explicitHeadingLevel,
        structural: true,
      });
        return;
      }

      if (
        sourceLines.length === 1 &&
        (mode === 'default'
          ? isLikelyStandaloneHeading(paragraph)
          : isStrongStandaloneHeadingSignal(paragraph))
      ) {
        const level = inferHeadingLevel(paragraph) ?? 2;
        blocks.push({
          kind: 'heading',
          text: cleanHeadingText(paragraph),
        html: `<h${Math.min(level + 1, 3)}>${escapeHtml(cleanHeadingText(paragraph))}</h${Math.min(level + 1, 3)}>`,
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

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const bulletMatch = trimmed.match(/^[-•*]\s+(.+)$/);
    const orderedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    const markdownLevel = getHeadingLevel(trimmed);

    if (bulletMatch || orderedMatch || (markdownLevel === null && isLikelyIndexEntry(trimmed))) {
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
      const heading = cleanHeadingText(trimmed);
      blocks.push({
        kind: 'heading',
        text: heading,
        html: `<h${Math.min(markdownLevel + 1, 3)}>${escapeHtml(heading)}</h${Math.min(markdownLevel + 1, 3)}>`,
        level: markdownLevel,
        structural: true,
      });
      continue;
    }

    if (
      mode === 'default'
        ? isLikelyStandaloneHeading(trimmed)
        : isStrongStandaloneHeadingSignal(trimmed)
    ) {
      flushParagraph();
      flushList();
      const heading = cleanHeadingText(trimmed);
      const level = inferHeadingLevel(trimmed) ?? 2;
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

function isStrongOnlyParagraph(fragment: string) {
  const inner = fragment.match(/^<p[^>]*>([\s\S]*)<\/p>$/i)?.[1] ?? '';
  return /<(strong|b)/i.test(inner) && !/<(?!\/?(?:strong|b|em|i|span|sup|sub|u|br)\b)[^>]+>/i.test(inner);
}

function splitHtmlListBlocks(fragment: string): ParsedBlock[] {
  const tag = fragment.match(/^<(ul|ol)/i)?.[1]?.toLowerCase() === 'ol' ? 'ol' : 'ul';
  const items = Array.from(fragment.matchAll(/<li[^>]*>[\s\S]*?<\/li>/gi))
    .map((match) => normalizeHtmlFragment(match[0]))
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

  const groups: string[][] = [];
  let current: string[] = [];
  let currentWords = 0;

  for (const item of items) {
    const words = textFromHtml(item).split(/\s+/).filter(Boolean).length;
    if (current.length > 0 && (current.length >= 6 || currentWords + words > 140)) {
      groups.push(current);
      current = [];
      currentWords = 0;
    }
    current.push(item);
    currentWords += words;
  }

  if (current.length > 0) {
    groups.push(current);
  }

  return groups.map((group) => ({
    kind: 'list' as const,
    text: group.map((item) => textFromHtml(item)).join('\n'),
    html: `<${tag}>${group.join('')}</${tag}>`,
    level: null,
    structural: false,
  }));
}

function parseHtmlBlocks(input: string) {
  const normalized = normalizeHtmlFragment(input);
  const matches = normalized.match(BLOCK_TAG_RE) ?? [];

  return matches.flatMap((fragment) => {
    const clean = normalizeHtmlFragment(fragment);
    const tag = clean.match(/^<(h[1-6]|p|ul|ol|blockquote)/i)?.[1]?.toLowerCase() ?? 'p';
    const text = textFromHtml(clean);

    if (!text) return [];
    if (text && isDecorativeLine(text)) return [];

    if (tag.startsWith('h')) {
      return [
        {
          kind: 'heading' as const,
          text: cleanHeadingText(text),
          html: clean,
          level: Number(tag.replace('h', '')),
          structural: true,
        },
      ];
    }

    if (tag === 'ul' || tag === 'ol') {
      return splitHtmlListBlocks(clean);
    }

    if (tag === 'blockquote') {
      return [
        {
          kind: 'quote' as const,
          text,
          html: clean,
          level: null,
          structural: true,
        },
      ];
    }

    if (/<br\s*\/?>/i.test(clean)) {
      return [
        {
          kind: 'paragraph' as const,
          text,
          html: clean,
          level: null,
          structural: false,
        },
      ];
    }

    // REMOVED: heuristic that converted index paragraphs to headings.
    // Previously, any bold paragraph matching "FASE 1", "Dia 1" became a heading,
    // creating false chapters. Now we trust only <h1>-<h6> from Mammoth.

    return [
      {
        kind: 'paragraph' as const,
        text,
        html: clean,
        level: null,
        structural: false,
      },
    ];
  });
}

function scoreParsedBlocks(blocks: ParsedBlock[]) {
  return blocks.reduce((score, block) => {
    if (block.kind === 'heading') return score + 5;
    if (block.kind === 'list') return score + 3;
    if (block.kind === 'quote') return score + 2;
    return score + 1;
  }, 0);
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

function chunkOutlineItems(items: string[], maxItems = 6) {
  const chunks: string[][] = [];
  for (let index = 0; index < items.length; index += maxItems) {
    chunks.push(items.slice(index, index + maxItems));
  }
  return chunks;
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
  return stripMarkdownInline(candidate?.block.text || fallbackTitle);
}

function detectAuthorFromFrontMatter(frontMatter: ParsedBlock[], fallbackText: string) {
  const titleCandidate = findTitleCandidate(frontMatter);
  const startIndex = titleCandidate ? titleCandidate.index + 1 : 0;

  for (const block of frontMatter.slice(startIndex)) {
    if (COPYRIGHT_RE.test(block.text)) break;
    if (isLikelyAuthorName(block.text)) return block.text;
  }

  return extractAuthorFromText(fallbackText);
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

  const subtitle = subtitleParts.join(' · ');
  return {
    subtitle,
    candidateCount: candidates.length,
  };
}

function toDocumentBlock(block: ParsedBlock) {
  if (block.kind === 'heading') {
    return {
      type: 'heading' as const,
      content: cleanHeadingText(block.text),
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

function buildChaptersFromBlocks(blocks: ParsedBlock[], title: string, author: string) {
  const chapters: NonNullable<ImportedDocumentSeed['chapters']> = [];
  const frontMatter: ParsedBlock[] = [];
  let currentTitle: string | null = null;
  let currentBlocks: ParsedBlock[] = [];
  const chapterBoundaryLevel = determineChapterBoundaryLevel(blocks);

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
      if (currentTitle === null && frontMatter.length > 0) {
        const prologueBlocks = extractPrologueBlocksFromFrontMatter(frontMatter, title, author);
        if (prologueBlocks.length > 0) {
          chapters.push({
            title: 'Prólogo',
            blocks: prologueBlocks.map(toDocumentBlock),
          });
        }
      }

      flushCurrent();
      currentTitle = cleanHeadingText(block.text) || `Capítulo ${chapters.length + 1}`;
      currentBlocks = [block]; // Include the heading block in the content
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

export function buildImportedDocumentSeed({
  fileName,
  mimeType,
  text,
  html,
  sourcePageCount,
}: {
  fileName: string;
  mimeType: string;
  text: string;
  html?: string | null;
  sourcePageCount?: number;
}): ImportedDocumentSeed {
  const paragraphs = paragraphsFromText(text);
  const fallbackTitle = fileNameToTitle(fileName) || 'Documento importado';
  const rawTitle = paragraphs[0] && paragraphs[0].length <= 120 ? paragraphs[0] : fallbackTitle;
  const textImportMode = inferTextImportMode(fileName, mimeType);
  const normalizedHtml = html
  ? html.replace(/<\/p>\s*<p[^>]*>\s*([·._\-—\s]{2,})(\d+)\s*<\/p>/gi, ' ··· $2</p>')
  : null;
  const htmlBlocks = html ? parseHtmlBlocks(html) : [];
  const textBlocks = parseTextBlocks(text, textImportMode);
  const parsedBlocks =
    htmlBlocks.some((block) => block.html.includes('<br'))
      ? htmlBlocks
      : scoreParsedBlocks(htmlBlocks) >= scoreParsedBlocks(textBlocks)
        ? htmlBlocks
        : textBlocks;
  const frontMatterSource = buildChaptersFromBlocks(parsedBlocks, fallbackTitle, extractAuthorFromText(text));
  const title = detectTitleFromFrontMatter(frontMatterSource.frontMatter, rawTitle);
  const author = detectAuthorFromFrontMatter(frontMatterSource.frontMatter, text);
  const subtitleDetection = detectSubtitleFromFrontMatter(frontMatterSource.frontMatter, title, author);
  const subtitle = subtitleDetection.subtitle
    ? subtitleDetection.subtitle.slice(0, 260)
    : `Documento importado desde ${fileName}`;
  let detectedChapters = frontMatterSource.chapters;
  let detectedOutline = frontMatterSource.detectedOutline ?? detectedChapters.map((chapter) => ({
    title: chapter.title,
    level: 1,
    origin: 'detected' as const,
  }));

  const explicitIndexIdx = detectedChapters.findIndex((chapter) => isTocChapterTitle(chapter.title));
  const hasExplicitIndex = explicitIndexIdx >= 0;

  // Build the index using only outline entries that correspond to actual
  // detected chapters.
  const chapterTitleSet = new Set(
    detectedChapters
      .filter((ch) => !isTocChapterTitle(ch.title))
      .map((ch) => ch.title.trim().toLowerCase()),
  );

  const richLabelMap = new Map<string, string>(); // chapterTitleLower → richTitle
  const extraTocEntries: OutlineEntry[] = [];     // CIERRE-like extra level-1 entries
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
        extraTocEntries.push({ ...entry, level: 1 });
      }
    }
  }

  // Build the filtered and level-assigned outline from actual chapter entries,
  // substituting rich labels where available.
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
      if (richLabel) return { ...entry, title: richLabel, level: 1 };
      if (MAJOR_HEADING_RE.test(title)) return { ...entry, level: 1 };
      if (MINOR_HEADING_RE.test(title)) return { ...entry, level: 2 };
      return entry;
    });

  const outlineForIndex = baseOutlineForIndex;

  const generatedIndex = outlineForIndex.length >= 2 ? buildGeneratedIndexChapter(outlineForIndex) : null;

  // RULE: If we have an explicit index from Word with real content, keep it.
  // We NEVER replace it during the initial import to preserve layout fidelity.
  const isExplicitIndexSubstantial = hasExplicitIndex && detectedChapters[explicitIndexIdx].blocks.length > 0;

  if (generatedIndex && !hasExplicitIndex) {
    const prologueIndex = detectedChapters.findIndex((chapter) => chapter.title.toLowerCase() === 'prólogo');
    const insertAt = prologueIndex >= 0 ? prologueIndex + 1 : 0;
    detectedChapters = [
      ...detectedChapters.slice(0, insertAt),
      generatedIndex.chapter,
      ...detectedChapters.slice(insertAt),
    ];
  }

  // Update detectedOutline to reflect the final outline used for indexing
  detectedOutline = outlineForIndex;

  const importedPreviewBlocks = (detectedChapters[0]?.blocks ?? []).slice(0, 6).map(
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
      : [
          {
            title,
            blocks,
          },
        ];

  const warnings: string[] = [];

  if (!author) {
    warnings.push('No se detectó con certeza el autor; revísalo tras importar.');
  }

  if (generatedIndex) {
    warnings.push('Se ha generado un índice sintético editable a partir de la estructura detectada del documento.');
  }

  if (subtitleDetection.candidateCount > 2) {
    warnings.push('La portada contenía varias líneas y se han condensado en un único subtítulo editable.');
  }

  if (detectedChapters.length <= 1) {
    warnings.push('No se detectaron secciones principales claras; se mantuvo una estructura conservadora.');
  }

  return {
    title,
    subtitle,
    author,
    sourcePageCount,
    warnings,
    detectedOutline,
    chapterTitle: detectedChapters[0]?.title || title,
    blocks,
    chapters,
    sourceFileName: fileName,
    sourceMimeType: mimeType,
  };
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
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    await parser.destroy();
    return {
      text: parsed.text,
      html: null,
      pageCount: typeof (parsed as { total?: number; numpages?: number }).numpages === 'number'
        ? Number((parsed as { total?: number; numpages?: number }).numpages)
        : typeof (parsed as { total?: number; numpages?: number }).total === 'number'
          ? Number((parsed as { total?: number; numpages?: number }).total)
          : undefined,
    } satisfies ExtractedImportSource;
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
      const richHtml = normalizeHtmlFragment(result.value);
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