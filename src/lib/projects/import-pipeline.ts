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

function cleanHeadingText(input: string) {
  return input
    .replace(/^#{1,6}\s+/, '')
    .replace(/^\d+(?:\.\d+)*[.)]?\s+/, '')
    .trim();
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
        content: level !== null ? cleanHeadingText(paragraph) : paragraph,
      };
    });
}

function buildChaptersFromText(input: string) {
  const lines = splitLines(input);
  const chapters: NonNullable<ImportedDocumentSeed['chapters']> = [];
  let currentTitle: string | null = null;
  let currentLines: string[] = [];

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
      flushCurrent();
      currentTitle = cleanHeadingText(trimmed) || `Capítulo ${chapters.length + 1}`;
      currentLines = [trimmed];
      continue;
    }

    if (currentTitle) {
      currentLines.push(line);
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
  const title = paragraphs[0] && paragraphs[0].length <= 120 ? paragraphs[0] : fallbackTitle;
  const subtitleParagraph = paragraphs.find((paragraph, index) => index > 0 && paragraph !== title) ?? '';
  const subtitle = subtitleParagraph ? subtitleParagraph.slice(0, 180) : `Documento importado desde ${fileName}`;
  const contentParagraphs =
    detectedChapters.length > 0
      ? detectedChapters[0].blocks.map((block) => block.content).slice(0, 6)
      : (paragraphs[0] === title ? paragraphs.slice(1) : paragraphs)
          .filter((paragraph) => paragraph !== subtitleParagraph)
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
      const result = await mammoth.default.convertToMarkdown({ buffer });
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
