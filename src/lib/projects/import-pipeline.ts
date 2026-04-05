import type { ImportedDocumentSeed } from './types';

const SUPPORTED_IMPORT_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'txt', 'md']);
const BLOCK_TAG_RE = /<(h[1-6]|p|ul|ol|blockquote)[^>]*>[\s\S]*?<\/\1>|<hr[^>]*\/?>/gi;
const ALL_CAPS_RE = /^[^a-z]*[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9 .,·:;()\-–—]+$/;
const MAJOR_HEADING_RE = /^(?:cap[ií]tulo|chapter|introducci[oó]n|pr[oó]logo|prologo|[íi]ndice|indice|fase\s+\d+|parte\s+\d+|secci[oó]n|ep[ií]logo|cierre|despu[eé]s\s+de|recursos(?:\s+recomendados)?|anexos?)(?:\b|:)/i;
const MINOR_HEADING_RE = /^(?:d[ií]a\s+\d+|tema\s+\d+|idea\s+clave|reto\s+de\s+acci[oó]n|preguntas?\s+de\s+reflexi[oó]n|ejercicio|caso|las\s+cinco\s+claves|cierre\s+de\s+fase)(?:\b|:)/i;

function getExtension(fileName: string) {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? parts.at(-1) ?? '' : '';
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
};

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

function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

function parseTextBlocks(input: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const lines = splitLines(input);
  let paragraphLines: string[] = [];
  let listItems: string[] = [];
  let orderedList = false;

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;

    const paragraph = normalizeText(paragraphLines.join(' '));
    paragraphLines = [];

    if (!paragraph || isDecorativeLine(paragraph)) return;

    const inlineListItems = splitInlineListItems(paragraph);
    if (inlineListItems.length > 0) {
      blocks.push(...listBlocksFromItems(inlineListItems));
      return;
    }

    if (isLikelyStandaloneHeading(paragraph)) {
      const level = inferHeadingLevel(paragraph) ?? 2;
      blocks.push({
        kind: 'heading',
        text: cleanHeadingText(paragraph),
        html: `<h${Math.min(level + 1, 3)}>${escapeHtml(cleanHeadingText(paragraph))}</h${Math.min(level + 1, 3)}>`,
        level,
        structural: false,
      });
      return;
    }

    blocks.push({
      kind: 'paragraph',
      text: paragraph,
      html: `<p>${escapeHtml(paragraph)}</p>`,
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

    if (bulletMatch || orderedMatch || isLikelyIndexEntry(trimmed)) {
      flushParagraph();
      const nextOrdered = Boolean(orderedMatch);
      if (listItems.length > 0 && orderedList !== nextOrdered) {
        flushList();
      }
      orderedList = nextOrdered;
      listItems.push((orderedMatch?.[1] ?? bulletMatch?.[1] ?? trimmed).trim());
      continue;
    }

    if (isLikelyStandaloneHeading(trimmed)) {
      flushParagraph();
      flushList();
      const heading = cleanHeadingText(trimmed);
      const level = inferHeadingLevel(trimmed) ?? 2;
      blocks.push({
        kind: 'heading',
        text: heading,
        html: `<h${Math.min(level + 1, 3)}>${escapeHtml(heading)}</h${Math.min(level + 1, 3)}>`,
        level,
        structural: false,
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
    const tag = clean.match(/^<(h[1-6]|p|ul|ol|blockquote|hr)/i)?.[1]?.toLowerCase() ?? 'p';
    const text = textFromHtml(clean);

    if (!text && tag !== 'hr') return [];
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

    if (tag === 'hr') {
      return [
        {
          kind: 'rule' as const,
          text: '',
          html: '<hr />',
          level: null,
          structural: true,
        },
      ];
    }

    if (isStrongOnlyParagraph(clean) || isLikelyStandaloneHeading(text)) {
      return [
        {
          kind: 'heading' as const,
          text: cleanHeadingText(text),
          html: clean,
          level: inferHeadingLevel(text) ?? 2,
          structural: false,
        },
      ];
    }

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

function isMajorChapterBlock(block: ParsedBlock) {
  if (block.kind !== 'heading') return false;
  const normalized = cleanHeadingText(block.text);
  if (!normalized) return false;

  if (block.structural && (block.level ?? 9) <= 1) return true;
  if (MAJOR_HEADING_RE.test(normalized)) return true;
  if (MINOR_HEADING_RE.test(normalized)) return false;
  return false;
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

  const flushCurrent = () => {
    if (!currentTitle) return;

    const documentBlocks = currentBlocks
      .filter((block) => block.text.trim().length > 0 || block.kind === 'rule')
      .map(toDocumentBlock);

    chapters.push({
      title: currentTitle,
      blocks:
        documentBlocks.length > 0
          ? documentBlocks
          : [{ type: 'paragraph', content: currentTitle }],
    });
  };

  for (const block of blocks) {
    const withinIndex = cleanHeadingText(currentTitle ?? '').toLowerCase() === 'índice';

    if (isMajorChapterBlock(block) && !(withinIndex && !block.structural)) {
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
      currentBlocks = [];
      continue;
    }

    if (currentTitle) {
      currentBlocks.push(block);
    } else {
      frontMatter.push(block);
    }
  }

  flushCurrent();

  if (chapters.length > 0) {
    return { chapters, frontMatter };
  }

  const fallbackBlocks = blocks
    .filter((block) => block.text.trim().length > 0)
    .map(toDocumentBlock);

  return {
    frontMatter,
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
}: {
  fileName: string;
  mimeType: string;
  text: string;
  html?: string | null;
}): ImportedDocumentSeed {
  const paragraphs = paragraphsFromText(text);
  const fallbackTitle = fileNameToTitle(fileName) || 'Documento importado';
  const rawTitle = paragraphs[0] && paragraphs[0].length <= 120 ? paragraphs[0] : fallbackTitle;
  const htmlBlocks = html ? parseHtmlBlocks(html) : [];
  const textBlocks = parseTextBlocks(text);
  const parsedBlocks =
    scoreParsedBlocks(htmlBlocks) >= scoreParsedBlocks(textBlocks) ? htmlBlocks : textBlocks;
  const frontMatterSource = buildChaptersFromBlocks(parsedBlocks, fallbackTitle, extractAuthorFromText(text));
  const title = detectTitleFromFrontMatter(frontMatterSource.frontMatter, rawTitle);
  const author = detectAuthorFromFrontMatter(frontMatterSource.frontMatter, text);
  const subtitleDetection = detectSubtitleFromFrontMatter(frontMatterSource.frontMatter, title, author);
  const subtitle = subtitleDetection.subtitle
    ? subtitleDetection.subtitle.slice(0, 260)
    : `Documento importado desde ${fileName}`;
  const detectedChapters = frontMatterSource.chapters;
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
    warnings,
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
          ],
        },
      );
      const richHtml = normalizeHtmlFragment(result.value);
      const richText = normalizeText(textFromHtml(richHtml));

      if (richText) {
        return {
          text: richText,
          html: richHtml,
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
    } satisfies ExtractedImportSource;
  }

  throw new Error(`Import format is not supported yet: ${extension}`);
}
