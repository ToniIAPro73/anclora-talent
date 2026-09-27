import JSZip from 'jszip';

export type SourceFormat = 'doc' | 'docx' | 'odt' | 'markdown' | 'txt' | 'pages' | 'pdf';
export type SourceFamily = 'rich' | 'semantic' | 'plain' | 'future' | 'disabled';
export type SourceProvenanceKind =
  | 'SOURCE_EXPLICIT'
  | 'SOURCE_STYLE'
  | 'SOURCE_DIRECT_FORMATTING'
  | 'SOURCE_SEMANTIC'
  | 'INFERRED'
  | 'REFERENCE'
  | 'USER_OVERRIDE'
  | 'TALENT_DEFAULT';

export type CapabilityLevel = boolean | 'semanticMarksOnly' | 'inferred';

export interface SourceCapabilities {
  richTypography: CapabilityLevel;
  paragraphFormatting: CapabilityLevel;
  runFormatting: CapabilityLevel;
  pageGeometry: CapabilityLevel;
  sections: CapabilityLevel;
  headersFooters: CapabilityLevel;
  pageNumbers: CapabilityLevel;
  styles: CapabilityLevel;
  semanticHeadings: CapabilityLevel;
  lists: CapabilityLevel;
  tables: CapabilityLevel;
  images: CapabilityLevel;
  links: CapabilityLevel;
  codeBlocks: CapabilityLevel;
}

export interface SourceProvenanceEntry {
  kind: SourceProvenanceKind;
  sourcePath?: string;
  confidence?: number;
}

export interface SourceInlineMark {
  type: 'strong' | 'emphasis' | 'inlineCode' | 'link' | 'strikethrough';
  start: number;
  end: number;
  href?: string;
}

export interface SourceTextRun {
  text: string;
  sourceStyleId?: string;
  directFormatting?: Record<string, string | number | boolean>;
  semanticMarks?: SourceInlineMark[];
  provenance: SourceProvenanceEntry;
}

export interface SourceBlock {
  id: string;
  type: 'paragraph' | 'heading' | 'blockquote' | 'orderedList' | 'unorderedList' | 'table' | 'image' | 'codeBlock' | 'horizontalRule';
  level?: number;
  text?: string;
  runs?: SourceTextRun[];
  items?: SourceBlock[];
  rows?: string[][];
  language?: string;
  src?: string;
  alt?: string;
  provenance: SourceProvenanceEntry;
}

export interface CanonicalSourceDocument {
  version: 1;
  format: SourceFormat;
  family: SourceFamily;
  capabilities: SourceCapabilities;
  blocks: SourceBlock[];
  sourceMetadata: {
    encoding?: string;
    packageParts?: string[];
    presentation: 'rich' | 'semantic' | 'none';
  };
  provenance: Record<string, SourceProvenanceEntry>;
}

const RICH_CAPABILITIES: SourceCapabilities = {
  richTypography: true,
  paragraphFormatting: true,
  runFormatting: true,
  pageGeometry: true,
  sections: true,
  headersFooters: true,
  pageNumbers: true,
  styles: true,
  semanticHeadings: true,
  lists: true,
  tables: true,
  images: true,
  links: true,
  codeBlocks: false,
};

const MARKDOWN_CAPABILITIES: SourceCapabilities = {
  richTypography: false,
  paragraphFormatting: false,
  runFormatting: 'semanticMarksOnly',
  pageGeometry: false,
  sections: false,
  headersFooters: false,
  pageNumbers: false,
  styles: false,
  semanticHeadings: true,
  lists: true,
  tables: 'semanticMarksOnly',
  images: true,
  links: true,
  codeBlocks: true,
};

const TEXT_CAPABILITIES: SourceCapabilities = {
  richTypography: false,
  paragraphFormatting: false,
  runFormatting: false,
  pageGeometry: false,
  sections: false,
  headersFooters: false,
  pageNumbers: false,
  styles: false,
  semanticHeadings: 'inferred',
  lists: 'inferred',
  tables: false,
  images: false,
  links: false,
  codeBlocks: false,
};

const FUTURE_CAPABILITIES = { ...RICH_CAPABILITIES, richTypography: 'inferred' as const };

export function detectSourceFormat(fileName: string, mimeType = ''): SourceFormat | null {
  const extension = fileName.toLowerCase().split('.').pop() ?? '';
  if (extension === 'doc') return 'doc';
  if (extension === 'docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
  if (extension === 'odt' || mimeType === 'application/vnd.oasis.opendocument.text') return 'odt';
  if (extension === 'md' || extension === 'markdown' || mimeType === 'text/markdown') return 'markdown';
  if (extension === 'txt' || mimeType === 'text/plain') return 'txt';
  if (extension === 'pages' || mimeType === 'application/vnd.apple.pages') return 'pages';
  if (extension === 'pdf' || mimeType === 'application/pdf') return 'pdf';
  return null;
}

export function getSourceFamily(format: SourceFormat): SourceFamily {
  if (format === 'doc' || format === 'docx' || format === 'odt') return 'rich';
  if (format === 'markdown') return 'semantic';
  if (format === 'txt') return 'plain';
  if (format === 'pages') return 'future';
  return 'disabled';
}

export function getSourceCapabilities(format: SourceFormat): SourceCapabilities {
  if (format === 'doc' || format === 'docx' || format === 'odt') return { ...RICH_CAPABILITIES };
  if (format === 'markdown') return { ...MARKDOWN_CAPABILITIES };
  if (format === 'txt') return { ...TEXT_CAPABILITIES };
  return { ...FUTURE_CAPABILITIES };
}

export function isActiveImportFormat(format: SourceFormat | null): format is Exclude<SourceFormat, 'pages' | 'pdf'> {
  return format === 'doc' || format === 'docx' || format === 'odt' || format === 'markdown' || format === 'txt';
}

function stableId(prefix: string, index: number, value: string) {
  let hash = 5381;
  for (const char of value) hash = (hash * 33) ^ char.charCodeAt(0);
  return `${prefix}-${index + 1}-${(hash >>> 0).toString(36)}`;
}

function provenance(kind: SourceProvenanceKind, sourcePath?: string, confidence?: number): SourceProvenanceEntry {
  return { kind, ...(sourcePath ? { sourcePath } : {}), ...(confidence === undefined ? {} : { confidence }) };
}

function decodeXml(input: string) {
  return input
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

export function escapeSourceHtml(input: string) {
  return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function markdownRuns(text: string): SourceTextRun[] {
  const marks: SourceInlineMark[] = [];
  const patterns: Array<[RegExp, SourceInlineMark['type']]> = [
    [/\*\*([^*\n]+)\*\*/g, 'strong'],
    [/__([^_\n]+)__/g, 'strong'],
    [/(?<!\*)\*([^*\n]+)\*(?!\*)/g, 'emphasis'],
    [/(?<!_)_([^_\n]+)_(?!_)/g, 'emphasis'],
    [/`([^`\n]+)`/g, 'inlineCode'],
    [/\[([^\]]+)\]\(([^)]+)\)/g, 'link'],
    [/~~([^~\n]+)~~/g, 'strikethrough'],
  ];
  for (const [pattern, type] of patterns) {
    for (const match of text.matchAll(pattern)) {
      const start = match.index ?? 0;
      const raw = match[0];
      const valueStart = type === 'link' ? start + 1 : start + (type === 'strong' ? 2 : 1);
      const valueEnd = type === 'link' ? start + (match[1]?.length ?? 0) + 1 : valueStart + (match[1]?.length ?? 0);
      marks.push({ type, start: valueStart, end: valueEnd, ...(type === 'link' ? { href: match[2] } : {}) });
      void raw;
    }
  }
  const plain = text
    .replace(/\*\*|__|\*|_|`|~~/g, '')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
  const uniqueMarks = marks.filter((mark, index, all) => all.findIndex((candidate) => candidate.type === mark.type && candidate.href === mark.href && candidate.start < mark.end && mark.start < candidate.end) === index);
  return [{ text: plain, semanticMarks: uniqueMarks, provenance: provenance('SOURCE_SEMANTIC') }];
}

function markdownBlock(type: SourceBlock['type'], index: number, text: string, extra: Partial<SourceBlock> = {}): SourceBlock {
  return {
    id: stableId('md', index, text),
    type,
    text,
    runs: type === 'codeBlock' ? undefined : markdownRuns(text),
    provenance: provenance('SOURCE_SEMANTIC'),
    ...extra,
  };
}

export function parseMarkdownSource(input: string): CanonicalSourceDocument {
  const lines = input.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').split('\n');
  const blocks: SourceBlock[] = [];
  let paragraph: string[] = [];
  let code: string[] | null = null;
  let codeLanguage = '';

  const flushParagraph = () => {
    const text = paragraph.join('\n').trim();
    if (text) blocks.push(markdownBlock('paragraph', blocks.length, text));
    paragraph = [];
  };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|?\s*:?-{3,}/.test(lines[lineIndex + 1] ?? '')) {
      flushParagraph();
      const rows: string[][] = [];
      const parseRow = (value: string) => value.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
      rows.push(parseRow(line));
      lineIndex += 2;
      while (lineIndex < lines.length && /^\s*\|.*\|\s*$/.test(lines[lineIndex])) {
        rows.push(parseRow(lines[lineIndex]));
        lineIndex += 1;
      }
      lineIndex -= 1;
      blocks.push(markdownBlock('table', blocks.length, rows.map((row) => row.join(' | ')).join('\n'), { rows }));
      continue;
    }
    const fence = line.match(/^\s*```(.*)$/);
    if (fence) {
      if (code) {
        blocks.push(markdownBlock('codeBlock', blocks.length, code.join('\n'), { language: codeLanguage, runs: undefined }));
        code = null;
        codeLanguage = '';
      } else {
        flushParagraph();
        code = [];
        codeLanguage = fence[1].trim();
      }
      continue;
    }
    if (code) {
      code.push(line);
      continue;
    }
    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      flushParagraph();
      blocks.push(markdownBlock('heading', blocks.length, heading[2], { level: heading[1].length }));
      continue;
    }
    if (/^\s*(?:---+|___+|\*\*\*+)\s*$/.test(line)) {
      flushParagraph();
      blocks.push(markdownBlock('horizontalRule', blocks.length, ''));
      continue;
    }
    if (/^\s*>/.test(line)) {
      flushParagraph();
      blocks.push(markdownBlock('blockquote', blocks.length, line.replace(/^\s*>\s?/, '')));
      continue;
    }
    const list = line.match(/^\s*([-*+] |\d+[.)]\s+)(.+)$/);
    if (list) {
      flushParagraph();
      const ordered = /^\d/.test(list[1]);
      const previous = blocks.at(-1);
      if (previous?.type === (ordered ? 'orderedList' : 'unorderedList')) {
        previous.items = [...(previous.items ?? []), markdownBlock('paragraph', blocks.length, list[2])];
      } else {
        blocks.push(markdownBlock(ordered ? 'orderedList' : 'unorderedList', blocks.length, '', { items: [markdownBlock('paragraph', blocks.length, list[2])] }));
      }
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      continue;
    }
    paragraph.push(line);
  }
  if (code) blocks.push(markdownBlock('codeBlock', blocks.length, code.join('\n'), { language: codeLanguage, runs: undefined }));
  flushParagraph();

  return {
    version: 1,
    format: 'markdown',
    family: 'semantic',
    capabilities: getSourceCapabilities('markdown'),
    blocks,
    sourceMetadata: { presentation: 'semantic', encoding: 'utf-8' },
    provenance: { source: provenance('SOURCE_SEMANTIC') },
  };
}

function inferTextHeading(line: string) {
  const trimmed = line.trim();
  if (/^(?:cap[ií]tulo|chapter|parte|secci[oó]n)\s+\d+(?:[.:].*)?$/i.test(trimmed)) return { level: 1, confidence: 0.94 };
  if (/^(?:introducci[oó]n|pr[oó]logo|ep[ií]logo|conclusi[oó]n|glosario|bibliograf[ií]a)$/i.test(trimmed)) return { level: 1, confidence: 0.9 };
  if (/^\d+(?:\.\d+)*[.)]\s+\S/.test(trimmed) && trimmed.length <= 100) return { level: 2, confidence: 0.86 };
  return null;
}

export function parsePlainTextSource(input: string, encoding = 'utf-8'): CanonicalSourceDocument {
  const blocks: SourceBlock[] = [];
  const paragraphs = input.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').split(/\n{2,}/);
  for (const paragraph of paragraphs) {
    const text = paragraph.trim();
    if (!text) continue;
    const firstLine = text.split('\n')[0];
    const inferred = inferTextHeading(firstLine);
    blocks.push({
      id: stableId('txt', blocks.length, text),
      type: inferred ? 'heading' : 'paragraph',
      ...(inferred ? { level: inferred.level } : {}),
      text,
      runs: [{ text, provenance: provenance('INFERRED', undefined, inferred?.confidence ?? 1) }],
      provenance: provenance(inferred ? 'INFERRED' : 'SOURCE_EXPLICIT', undefined, inferred?.confidence ?? 1),
    });
  }
  return {
    version: 1,
    format: 'txt',
    family: 'plain',
    capabilities: getSourceCapabilities('txt'),
    blocks,
    sourceMetadata: { presentation: 'none', encoding },
    provenance: { source: provenance('SOURCE_EXPLICIT') },
  };
}

function odtRuns(fragment: string): SourceTextRun[] {
  const runs: SourceTextRun[] = [];
  const pattern = /<text:span\b([^>]*)>([\s\S]*?)<\/text:span>|([^<]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(fragment)) !== null) {
    const text = decodeXml(match[2] ?? match[3] ?? '');
    if (!text) continue;
    const style = match[1]?.match(/text:style-name="([^"]+)"/)?.[1];
    runs.push({ text, sourceStyleId: style, provenance: provenance(style ? 'SOURCE_STYLE' : 'SOURCE_EXPLICIT', 'content.xml') });
  }
  return runs.length ? runs : [{ text: decodeXml(fragment), provenance: provenance('SOURCE_EXPLICIT', 'content.xml') }];
}

function htmlText(input: string) {
  return input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function richBlocksFromHtml(html: string): SourceBlock[] {
  const blocks: SourceBlock[] = [];
  const pattern = /<(h[1-6]|p|blockquote|ul|ol|table)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const fragment = match[2];
    const text = htmlText(fragment);
    if (!text) continue;
    const runs: SourceTextRun[] = [];
    const runPattern = /<(strong|b|em|i|u|span)\b([^>]*)>([\s\S]*?)<\/\1>|([^<]+)/gi;
    let runMatch: RegExpExecArray | null;
    while ((runMatch = runPattern.exec(fragment)) !== null) {
      const runText = htmlText(runMatch[3] ?? runMatch[4] ?? '');
      if (!runText) continue;
      const tagName = runMatch[1]?.toLowerCase();
      const style = runMatch[2] ?? '';
      const directFormatting: Record<string, string | boolean> = {};
      if (tagName === 'strong' || tagName === 'b') directFormatting.bold = true;
      if (tagName === 'em' || tagName === 'i') directFormatting.italic = true;
      if (tagName === 'u') directFormatting.underline = true;
      const family = style.match(/font-family\s*:\s*([^;]+)/i)?.[1]?.trim();
      const size = style.match(/font-size\s*:\s*([^;]+)/i)?.[1]?.trim();
      const color = style.match(/(?:color|text-color)\s*:\s*([^;]+)/i)?.[1]?.trim();
      if (family) directFormatting.fontFamily = family;
      if (size) directFormatting.fontSize = size;
      if (color) directFormatting.color = color;
      runs.push({
        text: runText,
        ...(Object.keys(directFormatting).length ? { directFormatting } : {}),
        provenance: provenance(Object.keys(directFormatting).length ? 'SOURCE_DIRECT_FORMATTING' : 'SOURCE_EXPLICIT', 'word/document.xml'),
      });
    }
    blocks.push({
      id: stableId('rich', blocks.length, text),
      type: tag.startsWith('h') ? 'heading' : tag === 'blockquote' ? 'blockquote' : tag === 'ul' ? 'unorderedList' : tag === 'ol' ? 'orderedList' : tag === 'table' ? 'table' : 'paragraph',
      ...(tag.startsWith('h') ? { level: Number(tag.slice(1)) } : {}),
      text,
      runs: runs.length ? runs : [{ text, provenance: provenance('SOURCE_EXPLICIT', 'word/document.xml') }],
      provenance: provenance(tag.startsWith('h') ? 'SOURCE_STYLE' : 'SOURCE_EXPLICIT', 'word/document.xml'),
    });
  }
  return blocks;
}

export async function parseOdtSource(buffer: Uint8Array): Promise<CanonicalSourceDocument> {
  const zip = await JSZip.loadAsync(buffer);
  const content = await zip.file('content.xml')?.async('text');
  if (!content) throw new Error('ODT content.xml is missing');
  const blocks: SourceBlock[] = [];
  const blockPattern = /<text:(h|p)\b([^>]*)>([\s\S]*?)<\/text:\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = blockPattern.exec(content)) !== null) {
    const tag = match[1].toLowerCase();
    const raw = match[3];
    const runs = odtRuns(raw);
    const text = runs.map((run) => run.text).join('').trim();
    if (!text) continue;
    const level = tag === 'h' ? Number(match[2].match(/text:outline-level="(\d+)"/)?.[1] ?? 1) : undefined;
    blocks.push({
      id: stableId('odt', blocks.length, text),
      type: tag === 'h' ? 'heading' : 'paragraph',
      ...(level ? { level } : {}),
      text,
      runs,
      provenance: provenance(tag === 'h' ? 'SOURCE_SEMANTIC' : 'SOURCE_EXPLICIT', 'content.xml'),
    });
  }
  return {
    version: 1,
    format: 'odt',
    family: 'rich',
    capabilities: getSourceCapabilities('odt'),
    blocks,
    sourceMetadata: {
      presentation: 'rich',
      packageParts: Object.keys(zip.files).filter((name) => /^(content|styles|meta|settings)\.xml$|^Pictures\//.test(name)),
    },
    provenance: { source: provenance('SOURCE_EXPLICIT', 'content.xml') },
  };
}

export function createSourceModel(format: SourceFormat, input: { text: string; html?: string | null; encoding?: string }): CanonicalSourceDocument {
  if (format === 'markdown') return parseMarkdownSource(input.text);
  if (format === 'txt') return parsePlainTextSource(input.text, input.encoding);
  const text = input.text.trim();
  const richBlocks = input.html ? richBlocksFromHtml(input.html) : [];
  return {
    version: 1,
    format,
    family: getSourceFamily(format),
    capabilities: getSourceCapabilities(format),
    blocks: richBlocks.length ? richBlocks : text ? [{ id: stableId(format, 0, text), type: 'paragraph', text, runs: [{ text, provenance: provenance('SOURCE_EXPLICIT') }], provenance: provenance('SOURCE_EXPLICIT') }] : [],
    sourceMetadata: { presentation: 'rich' },
    provenance: { source: provenance('SOURCE_EXPLICIT') },
  };
}
