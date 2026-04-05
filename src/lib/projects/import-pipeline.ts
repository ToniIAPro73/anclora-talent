import type { ImportedDocumentSeed } from './types';

const SUPPORTED_IMPORT_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'txt', 'md']);

function getExtension(fileName: string) {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? parts.at(-1) ?? '' : '';
}

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

function isTopLevelChapterHeading(input: string) {
  const level = getHeadingLevel(input.trim());
  return level !== null && level <= 1;
}

function blocksFromSectionText(input: string) {
  return input
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => {
      const level = getHeadingLevel(paragraph);
      return {
        type: level !== null ? ('heading' as const) : ('paragraph' as const),
        content: level !== null ? cleanHeadingText(paragraph) : stripMarkdownInline(paragraph),
      };
    });
}

// Copyright/legal patterns: paragraphs matching these are skipped when extracting the prologue.
const COPYRIGHT_RE =
  /©|derechos\s+reservados|all\s+rights\s+reserved|primera\s+edici[oó]n|metodolog[ií]a\s+original/i;

/**
 * From the raw pre-heading text (before the first H1), extract the prologue/dedication
 * that typically appears after the copyright page.
 *
 * A Prólogo is only extracted when a copyright marker is found, confirming that there
 * is a copyright page separating the cover from the dedication/prologue content.
 * Without a copyright marker the pre-heading text is assumed to be only cover material.
 */
function extractPrologueText(preHeadingText: string): string {
  const paragraphs = preHeadingText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Find the last paragraph that looks like copyright/legal boilerplate.
  let lastCopyrightIdx = -1;
  for (let i = 0; i < paragraphs.length; i++) {
    if (COPYRIGHT_RE.test(paragraphs[i])) {
      lastCopyrightIdx = i;
    }
  }

  // Only extract a prologue when a copyright page is present.
  if (lastCopyrightIdx < 0) return '';

  const candidates = paragraphs.slice(lastCopyrightIdx + 1);
  const cleaned = candidates
    .map((p) => stripMarkdownInline(p))
    .filter((p) => p.length > 5);

  return cleaned.join('\n\n');
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

function buildChaptersFromText(input: string) {
  const lines = splitLines(input);
  const chapters: NonNullable<ImportedDocumentSeed['chapters']> = [];
  let currentTitle: string | null = null;
  let currentLines: string[] = [];
  const preHeadingLines: string[] = [];

  const flushCurrent = () => {
    if (!currentTitle) {
      return;
    }
    const sectionText = currentLines.join('\n').trim();
    const blocks = blocksFromSectionText(sectionText);
    chapters.push({
      title: currentTitle,
      blocks: blocks.length > 0 ? blocks : [{ type: 'paragraph', content: currentTitle }],
    });
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (isTopLevelChapterHeading(trimmed)) {
      // On the first heading, try to salvage a prologue from pre-heading content.
      if (currentTitle === null && preHeadingLines.length > 0) {
        const prologueText = extractPrologueText(preHeadingLines.join('\n'));
        if (prologueText) {
          const prologueBlocks = blocksFromSectionText(prologueText);
          if (prologueBlocks.length > 0) {
            chapters.push({ title: 'Prólogo', blocks: prologueBlocks });
          }
        }
      }
      flushCurrent();
      currentTitle = cleanHeadingText(trimmed) || `Capítulo ${chapters.length + 1}`;
      currentLines = [trimmed];
      continue;
    }

    if (currentTitle) {
      currentLines.push(line);
    } else {
      preHeadingLines.push(line);
    }
  }

  flushCurrent();
  return chapters;
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
}: {
  fileName: string;
  mimeType: string;
  text: string;
}): ImportedDocumentSeed {
  const paragraphs = paragraphsFromText(text);
  const detectedChapters = buildChaptersFromText(text);
  const fallbackTitle = fileNameToTitle(fileName) || 'Documento importado';
  const rawTitle = paragraphs[0] && paragraphs[0].length <= 120 ? paragraphs[0] : fallbackTitle;
  const title = stripMarkdownInline(rawTitle);
  const rawSubtitleParagraph = paragraphs.find((paragraph, index) => index > 0 && paragraph !== paragraphs[0]) ?? '';
  const subtitleParagraph = rawSubtitleParagraph ? stripMarkdownInline(rawSubtitleParagraph) : '';
  const subtitle = subtitleParagraph ? subtitleParagraph.slice(0, 180) : `Documento importado desde ${fileName}`;
  const author = extractAuthorFromText(text);
  const contentParagraphs =
    detectedChapters.length > 0
      ? detectedChapters[0].blocks.map((block) => block.content).slice(0, 6)
      : (paragraphs[0] === rawTitle ? paragraphs.slice(1) : paragraphs)
          .filter((paragraph) => paragraph !== rawSubtitleParagraph)
          .map(stripMarkdownInline)
          .slice(0, 6);

  const blocks =
    contentParagraphs.length > 0
      ? contentParagraphs.map((paragraph, index) => ({
          type: index === 0 ? ('heading' as const) : ('paragraph' as const),
          content: paragraph,
        }))
      : [
          { type: 'heading' as const, content: title },
          { type: 'paragraph' as const, content: subtitle },
        ];

  return {
    title,
    subtitle,
    author,
    chapterTitle: detectedChapters[0]?.title || title,
    blocks,
    chapters:
      detectedChapters.length > 0
        ? detectedChapters
        : [
            {
              title,
              blocks,
            },
          ],
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
    return buffer.toString('utf8');
  }

  if (extension === 'pdf' || mimeType === 'application/pdf') {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    await parser.destroy();
    return parsed.text;
  }

  if (extension === 'docx') {
    try {
      const mammoth = await import('mammoth');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (mammoth.default as any).convertToMarkdown({ buffer });
      const markdown = normalizeText(result.value);

      if (markdown) {
        return markdown;
      }
    } catch {
      // Fallback to WordExtractor below when Mammoth is unavailable or fails.
    }
  }

  if (extension === 'doc' || extension === 'docx') {
    const { default: WordExtractor } = await import('word-extractor');
    const extractor = new WordExtractor();
    const document = await extractor.extract(buffer);
    return document.getBody();
  }

  throw new Error(`Import format is not supported yet: ${extension}`);
}
