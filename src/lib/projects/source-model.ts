import JSZip from 'jszip';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import type { Content, PhrasingContent, Root, RootContent } from 'mdast';

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
  semanticInlineMarks: CapabilityLevel;
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
  footnotes: CapabilityLevel;
}

export interface SourceProvenanceEntry {
  kind: SourceProvenanceKind;
  sourcePath?: string;
  confidence?: number;
}

export interface SourceInlineMark {
  type: 'strong' | 'emphasis' | 'inlineCode' | 'link' | 'strikethrough' | 'footnoteReference';
  start: number;
  end: number;
  href?: string;
  identifier?: string;
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
  type: 'paragraph' | 'heading' | 'blockquote' | 'orderedList' | 'unorderedList' | 'table' | 'image' | 'codeBlock' | 'horizontalRule' | 'footnote' | 'footnoteReference';
  level?: number;
  text?: string;
  /** Identifier shared by a footnote definition/reference. */
  identifier?: string;
  runs?: SourceTextRun[];
  items?: SourceBlock[];
  rows?: string[][];
  cellRuns?: SourceTextRun[][];
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
    footnotes?: FootnoteIntegrity;
  };
  provenance: Record<string, SourceProvenanceEntry>;
}

export interface FootnoteIntegrity {
  referenceIdentifiers: string[];
  definitionIdentifiers: string[];
  missingDefinitions: string[];
  orphanDefinitions: string[];
  duplicateDefinitions: string[];
}

const RICH_CAPABILITIES: SourceCapabilities = {
  richTypography: true,
  paragraphFormatting: true,
  runFormatting: true,
  semanticInlineMarks: false,
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
  footnotes: false,
};

const MARKDOWN_CAPABILITIES: SourceCapabilities = {
  richTypography: false,
  paragraphFormatting: false,
  runFormatting: 'semanticMarksOnly',
  semanticInlineMarks: true,
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
  footnotes: true,
};

const TEXT_CAPABILITIES: SourceCapabilities = {
  richTypography: false,
  paragraphFormatting: false,
  runFormatting: false,
  semanticInlineMarks: false,
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
  footnotes: false,
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

export interface SourceSemanticStats {
  h1: number;
  h2: number;
  h3: number;
  h4: number;
  paragraphs: number;
  orderedLists: number;
  unorderedLists: number;
  blockquotes: number;
  tables: number;
  links: number;
  images: number;
  codeBlocks: number;
  footnotes: number;
}

export function summarizeSourceModel(model: CanonicalSourceDocument): SourceSemanticStats {
  const stats: SourceSemanticStats = {
    h1: 0, h2: 0, h3: 0, h4: 0, paragraphs: 0, orderedLists: 0, unorderedLists: 0,
    blockquotes: 0, tables: 0, links: 0, images: 0, codeBlocks: 0, footnotes: 0,
  };
  const visit = (block: SourceBlock) => {
    if (block.type === 'heading' && block.level && block.level <= 4) stats[`h${block.level}` as 'h1' | 'h2' | 'h3' | 'h4'] += 1;
    if (block.type === 'paragraph') stats.paragraphs += 1;
    if (block.type === 'orderedList') stats.orderedLists += 1;
    if (block.type === 'unorderedList') stats.unorderedLists += 1;
    if (block.type === 'blockquote') stats.blockquotes += 1;
    if (block.type === 'table') stats.tables += 1;
    if (block.type === 'image') stats.images += 1;
    if (block.type === 'codeBlock') stats.codeBlocks += 1;
    // A reference and its definition are two projections of one logical note.
    if (block.type === 'footnote') stats.footnotes += 1;
    for (const run of block.runs ?? []) stats.links += (run.semanticMarks ?? []).filter((mark) => mark.type === 'link').length;
    for (const child of block.items ?? []) visit(child);
  };
  for (const block of model.blocks) visit(block);
  return stats;
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

function mdastText(node: Content): string {
  if ('value' in node && typeof node.value === 'string') return node.value;
  if (node.type === 'image') return node.alt ?? '';
  if (node.type === 'footnoteReference') return node.identifier ?? node.label ?? '';
  if (node.type === 'break') return '\n';
  if ('children' in node) return node.children.map((child) => mdastText(child)).join('');
  return '';
}

function markdownRuns(children: PhrasingContent[]): SourceTextRun[] {
  const textParts: string[] = [];
  const marks: SourceInlineMark[] = [];
  let offset = 0;
  const visit = (nodes: PhrasingContent[], inherited: SourceInlineMark['type'][] = [], href?: string) => {
    for (const node of nodes) {
      const text = mdastText(node);
      const start = offset;
      if (node.type === 'link') {
        visit(node.children, [...inherited, 'link'], node.url);
      } else if (node.type === 'strong') {
        visit(node.children, [...inherited, 'strong'], href);
      } else if (node.type === 'emphasis') {
        visit(node.children, [...inherited, 'emphasis'], href);
      } else if (node.type === 'delete') {
        visit(node.children, [...inherited, 'strikethrough'], href);
      } else if (node.type === 'inlineCode') {
        textParts.push(text);
        offset += text.length;
        marks.push({ type: 'inlineCode', start, end: offset });
      } else if (node.type === 'footnoteReference') {
        textParts.push(text);
        offset += text.length;
        marks.push({ type: 'footnoteReference', start, end: offset, identifier: node.identifier ?? node.label ?? '' });
      } else {
        textParts.push(text);
        offset += text.length;
      }
      for (const type of inherited) {
        marks.push({ type, start, end: offset, ...(type === 'link' && href ? { href } : {}) });
      }
    }
  };
  visit(children);
  return [{
    text: textParts.join(''),
    semanticMarks: marks.filter((mark) => mark.end > mark.start),
    provenance: provenance('SOURCE_SEMANTIC'),
  }];
}

function markdownBlock(type: SourceBlock['type'], index: number, text: string, extra: Partial<SourceBlock> = {}): SourceBlock {
  return {
    id: stableId('md', index, text),
    type,
    text,
    runs: type === 'codeBlock' ? undefined : [{ text, provenance: provenance('SOURCE_SEMANTIC') }],
    provenance: provenance('SOURCE_SEMANTIC'),
    ...extra,
  };
}

function markdownBlockFromAst(node: RootContent, index: number): SourceBlock | null {
  if (node.type === 'heading') {
    const text = node.children.map((child) => mdastText(child)).join('');
    return markdownBlock('heading', index, text, { level: node.depth, runs: markdownRuns(node.children) });
  }
  if (node.type === 'paragraph') {
    const text = node.children.map((child) => mdastText(child)).join('');
    return text ? markdownBlock('paragraph', index, text, { runs: markdownRuns(node.children) }) : null;
  }
  if (node.type === 'blockquote') {
    const items = node.children.map((child, childIndex) => markdownBlockFromAst(child, childIndex)).filter((item): item is SourceBlock => Boolean(item));
    return markdownBlock('blockquote', index, items.map((item) => item.text ?? '').join('\n'), { items });
  }
  if (node.type === 'list') {
    const items = node.children.flatMap((item) => item.children.map((child, childIndex) => markdownBlockFromAst(child, childIndex)).filter((child): child is SourceBlock => Boolean(child)));
    return markdownBlock(node.ordered ? 'orderedList' : 'unorderedList', index, items.map((item) => item.text ?? '').join('\n'), { items });
  }
  if (node.type === 'table') {
    const rows = node.children.map((row) => row.children.map((cell) => cell.children.map((child) => mdastText(child)).join('')));
    const cellRuns = node.children.flatMap((row) => row.children.map((cell) => markdownRuns(cell.children)));
    return markdownBlock('table', index, rows.map((row) => row.join(' | ')).join('\n'), { rows, cellRuns });
  }
  if (node.type === 'code') {
    return markdownBlock('codeBlock', index, node.value, { language: node.lang ?? undefined, runs: undefined });
  }
  if (node.type === 'thematicBreak') return markdownBlock('horizontalRule', index, '');
  if (node.type === 'image') return markdownBlock('image', index, node.alt ?? '', { src: node.url, alt: node.alt ?? undefined });
  if (node.type === 'footnoteDefinition') {
    const items = node.children.map((child, childIndex) => markdownBlockFromAst(child, childIndex)).filter((item): item is SourceBlock => Boolean(item));
    return markdownBlock('footnote', index, items.map((item) => item.text ?? '').join('\n'), { identifier: node.identifier, items });
  }
  if (node.type === 'footnoteReference') {
    return markdownBlock('footnoteReference', index, node.identifier ?? node.label ?? '', { identifier: node.identifier ?? node.label ?? '' });
  }
  return null;
}

function inlineSourceHtml(run: SourceTextRun): string {
  const marks = [...(run.semanticMarks ?? [])].filter((mark) => mark.end > mark.start).sort((a, b) => a.start - b.start || b.end - a.end);
  if (marks.length === 0) return escapeSourceHtml(run.text);
  const boundaries = new Set([0, run.text.length]);
  for (const mark of marks) {
    boundaries.add(Math.max(0, Math.min(run.text.length, mark.start)));
    boundaries.add(Math.max(0, Math.min(run.text.length, mark.end)));
  }
  const points = [...boundaries].sort((a, b) => a - b);
  return points.slice(0, -1).map((start, index) => {
    const end = points[index + 1];
    const active = marks.filter((mark) => mark.start <= start && mark.end >= end);
    let value = escapeSourceHtml(run.text.slice(start, end));
    for (const mark of active.reverse()) {
      value = mark.type === 'strong' ? `<strong>${value}</strong>`
        : mark.type === 'emphasis' ? `<em>${value}</em>`
          : mark.type === 'strikethrough' ? `<del>${value}</del>`
            : mark.type === 'inlineCode' ? `<code>${value}</code>`
              : mark.type === 'footnoteReference' ? `<sup data-footnote-reference="${escapeSourceHtml(mark.identifier ?? '')}">${value}</sup>`
              : mark.href ? `<a href="${escapeSourceHtml(mark.href)}">${value}</a>` : value;
    }
    return value;
  }).join('');
}

function sourceBlockInlineHtml(block: SourceBlock): string {
  return (block.runs ?? [{ text: block.text ?? '', provenance: provenance('SOURCE_SEMANTIC') }]).map(inlineSourceHtml).join('');
}

export function sourceModelToHtml(model: CanonicalSourceDocument): string {
  const render = (block: SourceBlock): string => {
    if (block.type === 'heading') return `<h${Math.min(block.level ?? 1, 6)}>${sourceBlockInlineHtml(block)}</h${Math.min(block.level ?? 1, 6)}>`;
    if (block.type === 'paragraph') return `<p>${sourceBlockInlineHtml(block).replace(/\n/g, '<br />')}</p>`;
    if (block.type === 'blockquote') return `<blockquote>${(block.items ?? []).map(render).join('')}</blockquote>`;
    if (block.type === 'orderedList' || block.type === 'unorderedList') return `<${block.type === 'orderedList' ? 'ol' : 'ul'}>${(block.items ?? []).map((item) => `<li>${sourceBlockInlineHtml(item)}</li>`).join('')}</${block.type === 'orderedList' ? 'ol' : 'ul'}>`;
    if (block.type === 'table') {
      let cellIndex = 0;
      const renderCell = (cell: string) => {
        const html = (block.cellRuns?.[cellIndex++] ?? [{ text: cell, provenance: provenance('SOURCE_SEMANTIC') }]).map(inlineSourceHtml).join('');
        return html;
      };
      return `<table><thead><tr>${(block.rows?.[0] ?? []).map((cell) => `<th>${renderCell(cell)}</th>`).join('')}</tr></thead><tbody>${(block.rows ?? []).slice(1).map((row) => `<tr>${row.map((cell) => `<td>${renderCell(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    }
    if (block.type === 'image') return block.src ? `<figure><img src="${escapeSourceHtml(block.src)}" alt="${escapeSourceHtml(block.alt ?? '')}" /></figure>` : '';
    if (block.type === 'codeBlock') return `<pre><code${block.language ? ` data-language="${escapeSourceHtml(block.language)}"` : ''}>${escapeSourceHtml(block.text ?? '')}</code></pre>`;
    if (block.type === 'horizontalRule') return '<hr />';
    if (block.type === 'footnote') return `<p class="editorial-endnote-definition" data-footnote="true" data-footnote-id="${escapeSourceHtml(block.identifier ?? '')}">${sourceBlockInlineHtml(block)}</p>`;
    return `<sup data-footnote-reference="${escapeSourceHtml(block.text ?? '')}">${escapeSourceHtml(block.text ?? '')}</sup>`;
  };
  return model.blocks.map(render).join('');
}

export function analyzeFootnoteIntegrity(blocks: SourceBlock[], rawMarkdown?: string): FootnoteIntegrity {
  const references: string[] = [];
  const definitions: string[] = [];

  const visit = (block: SourceBlock) => {
    if (block.type === 'footnote' && block.identifier) definitions.push(block.identifier);
    for (const run of block.runs ?? []) {
      for (const mark of run.semanticMarks ?? []) {
        if (mark.type === 'footnoteReference' && mark.identifier) references.push(mark.identifier);
      }
    }
    for (const child of block.items ?? []) visit(child);
  };
  blocks.forEach(visit);

  if (rawMarkdown) {
    for (const match of rawMarkdown.matchAll(/\[\^([^\]]+)\](?!:)/g)) {
      if (match[1]) references.push(match[1]);
    }
  }

  const unique = (values: string[]) => [...new Set(values)];
  const referenceIdentifiers = unique(references);
  const definitionIdentifiers = unique(definitions);
  const duplicateDefinitions = unique(definitions.filter((id, index) => definitions.indexOf(id) !== index));

  return {
    referenceIdentifiers,
    definitionIdentifiers,
    missingDefinitions: referenceIdentifiers.filter((id) => !definitionIdentifiers.includes(id)),
    orphanDefinitions: definitionIdentifiers.filter((id) => !referenceIdentifiers.includes(id)),
    duplicateDefinitions,
  };
}

export function parseMarkdownSource(input: string): CanonicalSourceDocument {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(input.replace(/^\uFEFF/, '')) as Root;
  const blocks = tree.children
    .map((node, index) => markdownBlockFromAst(node, index))
    .filter((block): block is SourceBlock => Boolean(block));

  const model: CanonicalSourceDocument = {
    version: 1,
    format: 'markdown',
    family: 'semantic',
    capabilities: getSourceCapabilities('markdown'),
    blocks,
    sourceMetadata: { presentation: 'semantic', encoding: 'utf-8', footnotes: analyzeFootnoteIntegrity(blocks, input) },
    provenance: { source: provenance('SOURCE_SEMANTIC') },
  };
  return model;
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
