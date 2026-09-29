import JSZip from 'jszip';
import { DOMParser, type Document as XmlDocument, type Element as XmlElement, type Node as XmlNode } from '@xmldom/xmldom';
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
  sourceStyleId?: string;
  paragraphProperties?: Record<string, string | number | boolean>;
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
    presentationProfile?: SourcePresentationProfile;
    footnotes?: FootnoteIntegrity;
  };
  provenance: Record<string, SourceProvenanceEntry>;
}

/** Presentation facts extracted from the source, never a Talent fallback. */
export interface SourcePresentationProfile {
  status: 'extracted' | 'not-available' | 'none';
  fontFamily?: string;
  fontSizePt?: number;
  lineHeight?: number;
  pageWidthPt?: number;
  pageHeightPt?: number;
  orientation?: 'portrait' | 'landscape';
  marginsPt?: { top: number; bottom: number; left: number; right: number };
  toc?: { leaderStyle?: 'dots' | 'none' | 'custom'; leaderText?: string };
  footer?: {
    alignment?: 'left' | 'center' | 'right' | 'justify';
    runs: Array<{ type: 'text' | 'page'; text?: string; fontFamily?: string; fontSizePt?: number; color?: string }>;
    fontFamily?: string;
    fontSizePt?: number;
    color?: string;
  };
  provenance: SourceProvenanceKind;
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

export interface SourceTextMetrics {
  lines: number;
  words: number;
  characters: number;
}

export function summarizeSourceText(model: CanonicalSourceDocument): SourceTextMetrics {
  const text = model.blocks.map((block) => block.text ?? '').join('\n');
  return {
    lines: text ? text.split(/\r?\n/).length : 0,
    words: text.trim() ? text.trim().split(/\s+/).length : 0,
    characters: text.length,
  };
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
  if (marks.length === 0 && !run.directFormatting) return escapeSourceHtml(run.text);
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
    const direct = run.directFormatting ?? {};
    const styles = [
      direct.fontFamily ? `font-family:${escapeSourceHtml(String(direct.fontFamily))}` : '',
      direct.fontSizePt !== undefined ? `font-size:${escapeSourceHtml(String(direct.fontSizePt))}pt` : '',
      direct.color ? `color:${escapeSourceHtml(String(direct.color))}` : '',
      direct.bold ? 'font-weight:700' : '',
      direct.italic ? 'font-style:italic' : '',
      direct.highlight ? `background-color:${escapeSourceHtml(String(direct.highlight))}` : '',
      direct.underline ? 'text-decoration:underline' : '',
      direct.strike ? 'text-decoration:line-through' : '',
    ].filter(Boolean).join(';');
    if (styles) value = `<span style="${styles}">${value}</span>`;
    return value;
  }).join('');
}

function sourceBlockInlineHtml(block: SourceBlock): string {
  return (block.runs ?? [{ text: block.text ?? '', provenance: provenance('SOURCE_SEMANTIC') }]).map(inlineSourceHtml).join('');
}

function sourceBlockStyle(block: SourceBlock): string {
  const properties = block.paragraphProperties ?? {};
  const styles = [
    properties.textAlign ? `text-align:${escapeSourceHtml(String(properties.textAlign))}` : '',
    properties.lineHeight !== undefined ? `line-height:${escapeSourceHtml(String(properties.lineHeight))}` : '',
    properties.spacingBefore !== undefined ? `margin-top:${escapeSourceHtml(String(properties.spacingBefore))}pt` : '',
    properties.spacingAfter !== undefined ? `margin-bottom:${escapeSourceHtml(String(properties.spacingAfter))}pt` : '',
    properties.firstLineIndent !== undefined ? `text-indent:${escapeSourceHtml(String(properties.firstLineIndent))}pt` : '',
    properties.leftIndent !== undefined ? `margin-left:${escapeSourceHtml(String(properties.leftIndent))}pt` : '',
    properties.rightIndent !== undefined ? `margin-right:${escapeSourceHtml(String(properties.rightIndent))}pt` : '',
  ].filter(Boolean).join(';');
  return styles ? ` style="${styles}"` : '';
}

export function sourceModelToHtml(model: CanonicalSourceDocument): string {
  const render = (block: SourceBlock): string => {
    const sourceAttribute = block.sourceStyleId ? ` data-source-style-id="${escapeSourceHtml(block.sourceStyleId)}"` : '';
    if (block.type === 'heading') return `<h${Math.min(block.level ?? 1, 6)}${sourceAttribute}${sourceBlockStyle(block)}>${sourceBlockInlineHtml(block)}</h${Math.min(block.level ?? 1, 6)}>`;
    if (block.type === 'paragraph') return `<p${sourceAttribute}${sourceBlockStyle(block)}>${sourceBlockInlineHtml(block).replace(/\n/g, '<br />')}</p>`;
    if (block.type === 'blockquote') return `<blockquote>${(block.items ?? []).map(render).join('')}</blockquote>`;
    if (block.type === 'orderedList' || block.type === 'unorderedList') return `<${block.type === 'orderedList' ? 'ol' : 'ul'}>${(block.items ?? []).map((item) => `<li>${sourceBlockInlineHtml(item)}${(item.items ?? []).map(render).join('')}</li>`).join('')}</${block.type === 'orderedList' ? 'ol' : 'ul'}>`;
    if (block.type === 'table') {
      let cellIndex = 0;
      const renderCell = (cell: string) => {
        const html = (block.cellRuns?.[cellIndex++] ?? [{ text: cell, provenance: provenance('SOURCE_SEMANTIC') }]).map(inlineSourceHtml).join('');
        return html;
      };
      return `<table><thead><tr>${(block.rows?.[0] ?? []).map((cell) => `<th>${renderCell(cell)}</th>`).join('')}</tr></thead><tbody>${(block.rows ?? []).slice(1).map((row) => `<tr>${row.map((cell) => `<td>${renderCell(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    }
    if (block.type === 'image') return block.src ? `<p><img src="${escapeSourceHtml(block.src)}" alt="${escapeSourceHtml(block.alt ?? '')}" /></p>` : '';
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

function odtLengthToPt(value: string | undefined) {
  if (!value) return undefined;
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount)) return undefined;
  if (value.endsWith('in')) return amount * 72;
  if (value.endsWith('cm')) return amount * 72 / 2.54;
  if (value.endsWith('mm')) return amount * 72 / 25.4;
  if (value.endsWith('pt')) return amount;
  return undefined;
}

type OdtScalar = string | number | boolean;
interface OdtStyleDefinition {
  name: string;
  family: string;
  parent?: string;
  text: Record<string, OdtScalar>;
  paragraph: Record<string, OdtScalar>;
}

function odtAttr(element: XmlElement, localName: string): string | undefined {
  for (let index = 0; index < element.attributes.length; index += 1) {
    const attribute = element.attributes.item(index);
    if (attribute?.localName === localName || attribute?.name === localName || attribute?.name?.endsWith(`:${localName}`)) return attribute.value;
  }
  return undefined;
}

function odtChildren(node: XmlNode): XmlElement[] {
  return Array.from(node.childNodes).filter((child): child is XmlElement => child.nodeType === 1);
}

function odtWalk(node: XmlNode, visit: (element: XmlElement) => void) {
  for (const child of odtChildren(node)) {
    visit(child);
    odtWalk(child, visit);
  }
}

function odtProperties(element: XmlElement | undefined): Record<string, OdtScalar> {
  if (!element) return {};
  const result: Record<string, OdtScalar> = {};
  for (let index = 0; index < element.attributes.length; index += 1) {
    const attribute = element.attributes.item(index);
    if (!attribute?.localName) continue;
    result[attribute.localName] = attribute.value;
  }
  return result;
}

function collectOdtStyles(document: XmlDocument): Map<string, OdtStyleDefinition> {
  const styles = new Map<string, OdtStyleDefinition>();
  odtWalk(document, (element) => {
    if (element.localName === 'list-style') {
      const name = odtAttr(element, 'name');
      if (!name) return;
      let ordered = false;
      odtWalk(element, (child) => { if (child.localName === 'list-level-style-number') ordered = true; });
      styles.set(`list:${name}`, { name, family: 'list', text: ordered ? { 'num-format': '1' } : { 'bullet-char': '•' }, paragraph: {} });
      return;
    }
    if (element.localName !== 'style' && element.localName !== 'default-style') return;
    const family = odtAttr(element, 'family') ?? 'paragraph';
    const name = odtAttr(element, 'name') ?? `__default_${family}`;
    const text = odtChildren(element).find((child) => child.localName === 'text-properties');
    const paragraph = odtChildren(element).find((child) => child.localName === 'paragraph-properties');
    styles.set(`${family}:${name}`, {
      name,
      family,
      parent: odtAttr(element, 'parent-style-name'),
      text: odtProperties(text),
      paragraph: odtProperties(paragraph),
    });
  });
  return styles;
}

function resolveOdtStyle(styles: Map<string, OdtStyleDefinition>, family: string, name?: string, seen = new Set<string>()): OdtStyleDefinition {
  const key = name ? `${family}:${name}` : `${family}:__default_${family}`;
  if (seen.has(key)) return { name: name ?? '', family, text: {}, paragraph: {} };
  seen.add(key);
  const current = styles.get(key);
  if (!current) return { name: name ?? '', family, text: {}, paragraph: {} };
  const parent = current.parent
    ? resolveOdtStyle(styles, family, current.parent, seen)
    : name && name !== `__default_${family}`
      ? resolveOdtStyle(styles, family, undefined, seen)
      : { name: '', family, text: {}, paragraph: {} };
  return {
    ...current,
    text: { ...parent.text, ...current.text },
    paragraph: { ...parent.paragraph, ...current.paragraph },
  };
}

function odtFontFamily(value: OdtScalar | undefined) {
  return typeof value === 'string' ? value.split(',')[0].trim().replace(/^'+|'+$/g, '') : undefined;
}

function odtTextFormatting(style: OdtStyleDefinition, href?: string): Record<string, OdtScalar> {
  const result: Record<string, OdtScalar> = {};
  const fontFamily = odtFontFamily(style.text['font-family']);
  const fontSize = odtLengthToPt(typeof style.text['font-size'] === 'string' ? style.text['font-size'] : undefined);
  if (fontFamily) result.fontFamily = fontFamily;
  if (fontSize !== undefined) result.fontSizePt = fontSize;
  if (style.text['font-weight']) result.bold = style.text['font-weight'] === 'bold';
  if (style.text['font-style']) result.italic = style.text['font-style'] === 'italic';
  if (style.text['text-underline-style']) result.underline = style.text['text-underline-style'] !== 'none';
  if (style.text.color) result.color = style.text.color;
  if (style.text['background-color']) result.highlight = style.text['background-color'];
  if (href) result.href = href;
  return result;
}

function odtParagraphFormatting(style: OdtStyleDefinition): Record<string, OdtScalar> {
  const result: Record<string, OdtScalar> = {};
  const map: Array<[string, string]> = [
    ['text-align', 'textAlign'], ['line-height', 'lineHeight'], ['margin-top', 'spacingBefore'],
    ['margin-bottom', 'spacingAfter'], ['text-indent', 'firstLineIndent'], ['margin-left', 'leftIndent'],
    ['margin-right', 'rightIndent'], ['break-before', 'pageBreakBefore'], ['keep-with-next', 'keepNext'],
  ];
  for (const [from, to] of map) {
    const value = style.paragraph[from];
    if (value === undefined) continue;
    if (typeof value === 'string' && value.endsWith('%')) result[to] = Number.parseFloat(value) / 100;
    else if (['spacingBefore', 'spacingAfter', 'firstLineIndent', 'leftIndent', 'rightIndent'].includes(to)) result[to] = odtLengthToPt(typeof value === 'string' ? value : undefined) ?? value;
    else result[to] = value;
  }
  return result;
}

function odtPresentationProfile(styles: Map<string, OdtStyleDefinition>, document: XmlDocument): SourcePresentationProfile {
  const standard = resolveOdtStyle(styles, 'paragraph', 'Standard');
  const fontFamily = odtFontFamily(standard.text['font-family']);
  const fontSizePt = odtLengthToPt(typeof standard.text['font-size'] === 'string' ? standard.text['font-size'] : undefined);
  const lineHeightRaw = standard.paragraph['line-height'];
  const lineHeight = typeof lineHeightRaw === 'string' && lineHeightRaw.endsWith('%') ? Number.parseFloat(lineHeightRaw) / 100 : undefined;
  let pageProperties: Record<string, OdtScalar> = {};
  odtWalk(document, (element) => {
    if (!pageProperties['margin-top'] && element.localName === 'page-layout-properties') pageProperties = odtProperties(element);
  });
  const marginsPt = {
    top: odtLengthToPt(typeof pageProperties['margin-top'] === 'string' ? pageProperties['margin-top'] : undefined),
    bottom: odtLengthToPt(typeof pageProperties['margin-bottom'] === 'string' ? pageProperties['margin-bottom'] : undefined),
    left: odtLengthToPt(typeof pageProperties['margin-left'] === 'string' ? pageProperties['margin-left'] : undefined),
    right: odtLengthToPt(typeof pageProperties['margin-right'] === 'string' ? pageProperties['margin-right'] : undefined),
  };
  const pageWidthPt = odtLengthToPt(typeof pageProperties['page-width'] === 'string' ? pageProperties['page-width'] : undefined);
  const pageHeightPt = odtLengthToPt(typeof pageProperties['page-height'] === 'string' ? pageProperties['page-height'] : undefined);
  const orientation = pageWidthPt !== undefined && pageHeightPt !== undefined && pageWidthPt > pageHeightPt ? 'landscape' as const : 'portrait' as const;
  const hasMargins = Object.values(marginsPt).every((value) => value !== undefined);
  let leaderStyle: 'dots' | 'none' | 'custom' | undefined;
  let leaderText: string | undefined;
  odtWalk(document, (element) => {
    if (leaderStyle || element.localName !== 'tab-stop') return;
    const raw = odtAttr(element, 'leader-style');
    if (!raw) return;
    leaderStyle = raw === 'dotted' ? 'dots' : raw === 'none' ? 'none' : 'custom';
    leaderText = odtAttr(element, 'leader-text');
  });
  let footer: SourcePresentationProfile['footer'];
  odtWalk(document, (element) => {
    if (footer || element.localName !== 'footer') return;
    const paragraph = odtChildren(element).find((child) => child.localName === 'p');
    if (!paragraph) return;
    const paragraphStyle = resolveOdtStyle(styles, 'paragraph', odtAttr(paragraph, 'style-name'));
    const alignmentValue = paragraphStyle.paragraph['text-align'];
    const alignment = alignmentValue === 'center' ? 'center' : alignmentValue === 'end' || alignmentValue === 'right' ? 'right' : alignmentValue === 'justify' ? 'justify' : alignmentValue === 'start' || alignmentValue === 'left' ? 'left' : undefined;
    const formatting = odtTextFormatting(paragraphStyle);
    const styleFormatting = { fontFamily: typeof formatting.fontFamily === 'string' ? formatting.fontFamily : undefined, fontSizePt: typeof formatting.fontSizePt === 'number' ? formatting.fontSizePt : undefined, color: typeof formatting.color === 'string' ? formatting.color : undefined };
    const runs: NonNullable<SourcePresentationProfile['footer']>['runs'] = [];
    for (const child of Array.from(paragraph.childNodes)) {
      const localName = (child as XmlElement).localName;
      if (localName === 'page-number') runs.push({ type: 'page', ...styleFormatting });
      else if (child.nodeType === 3 || child.nodeType === 4) {
        const text = child.nodeValue ?? '';
        if (text) runs.push({ type: 'text', text, ...styleFormatting });
      } else if (localName === 'span') {
        const text = child.textContent ?? '';
        if (text) runs.push({ type: 'text', text, ...styleFormatting });
      }
    }
    if (runs.length > 0) footer = { alignment, runs, ...styleFormatting };
  });
  if (!fontFamily && fontSizePt === undefined && lineHeight === undefined && !hasMargins && pageWidthPt === undefined && pageHeightPt === undefined && !leaderStyle && !footer) {
    return { status: 'not-available', provenance: 'REFERENCE' };
  }
  return {
    status: 'extracted',
    ...(fontFamily ? { fontFamily } : {}),
    ...(fontSizePt !== undefined ? { fontSizePt } : {}),
    ...(lineHeight !== undefined ? { lineHeight } : {}),
    ...(pageWidthPt !== undefined ? { pageWidthPt } : {}),
    ...(pageHeightPt !== undefined ? { pageHeightPt } : {}),
    ...(pageWidthPt !== undefined && pageHeightPt !== undefined ? { orientation } : {}),
    ...(hasMargins ? { marginsPt: marginsPt as { top: number; bottom: number; left: number; right: number } } : {}),
    ...(leaderStyle ? { toc: { leaderStyle, ...(leaderText ? { leaderText } : {}) } } : {}),
    ...(footer ? { footer } : {}),
    provenance: 'SOURCE_STYLE',
  };
}

function odtRuns(element: XmlElement, styles: Map<string, OdtStyleDefinition>, inherited: Record<string, OdtScalar> = {}, inheritedStyle?: string): SourceTextRun[] {
  const runs: SourceTextRun[] = [];
  const append = (text: string, formatting: Record<string, OdtScalar>, styleId?: string) => {
    if (!text) return;
    const previous = runs.at(-1);
    if (previous && JSON.stringify(previous.directFormatting ?? {}) === JSON.stringify(formatting) && previous.sourceStyleId === styleId) {
      previous.text += text;
      return;
    }
    const semanticMarks = formatting.href ? [{ type: 'link' as const, start: 0, end: text.length, href: String(formatting.href) }] : undefined;
    const directFormatting = { ...formatting };
    delete directFormatting.href;
    runs.push({ text, ...(styleId ? { sourceStyleId: styleId } : {}), ...(Object.keys(directFormatting).length ? { directFormatting } : {}), ...(semanticMarks ? { semanticMarks } : {}), provenance: provenance(styleId ? 'SOURCE_STYLE' : 'SOURCE_EXPLICIT', 'content.xml') });
  };
  const visit = (node: XmlNode, formatting: Record<string, OdtScalar>, styleId?: string) => {
    if (node.nodeType === 3 || node.nodeType === 4) {
      append(node.nodeValue ?? '', formatting, styleId);
      return;
    }
    if (node.nodeType !== 1) return;
    const element = node as XmlElement;
    const localName = element.localName;
    if (localName === 's') {
      const count = Number.parseInt(odtAttr(element, 'c') ?? '1', 10);
      append(' '.repeat(Number.isFinite(count) ? Math.max(1, count) : 1), formatting, styleId);
      return;
    }
    if (localName === 'tab') { append('\t', formatting, styleId); return; }
    if (localName === 'line-break') { append('\n', formatting, styleId); return; }
    if (localName === 'soft-page-break') { append('\f', formatting, styleId); return; }
    if (localName === 'note') {
      const citation = odtChildren(element).find((child) => child.localName === 'note-citation');
      const identifier = odtAttr(element, 'id') ?? citation?.textContent?.trim() ?? '';
      const value = citation?.textContent?.trim() ?? '';
      if (value) {
        append(value, formatting, styleId);
        const run = runs.at(-1);
        if (run) run.semanticMarks = [...(run.semanticMarks ?? []), { type: 'footnoteReference', start: Math.max(0, run.text.length - value.length), end: run.text.length, identifier }];
      }
      return;
    }
    const nextStyleId = localName === 'span' || localName === 'a' ? odtAttr(element, 'style-name') ?? styleId : styleId;
    const family = localName === 'span' || localName === 'a' ? 'text' : 'paragraph';
    const style = resolveOdtStyle(styles, family, nextStyleId);
    const href = localName === 'a' ? odtAttr(element, 'href') : undefined;
    const nextFormatting = { ...formatting, ...odtTextFormatting(style, href) };
    for (const child of Array.from(element.childNodes)) visit(child, nextFormatting, nextStyleId);
  };
  for (const child of Array.from(element.childNodes)) visit(child, { ...inherited }, inheritedStyle);
  return runs;
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
  const styles = await zip.file('styles.xml')?.async('text');
  const parser = new DOMParser({ onError: (level, message) => { if (level === 'error' || level === 'fatalError') throw new Error(`Invalid ODT XML: ${message}`); } });
  const contentDocument = parser.parseFromString(content, 'application/xml');
  const styleDocument = styles ? parser.parseFromString(styles, 'application/xml') : undefined;
  const styleMap = new Map<string, OdtStyleDefinition>();
  if (styleDocument) for (const [key, value] of collectOdtStyles(styleDocument)) styleMap.set(key, value);
  for (const [key, value] of collectOdtStyles(contentDocument)) styleMap.set(key, value);
  const root = (() => {
    let found: XmlElement | undefined;
    odtWalk(contentDocument, (element) => { if (!found && element.localName === 'text') found = element; });
    return found;
  })();
  if (!root) throw new Error('ODT office:text is missing');
  const blocks: SourceBlock[] = [];
  const media = new Map<string, string>();
  const mimeFor = (path: string) => path.toLowerCase().endsWith('.png') ? 'image/png' : path.toLowerCase().endsWith('.jpg') || path.toLowerCase().endsWith('.jpeg') ? 'image/jpeg' : path.toLowerCase().endsWith('.svg') ? 'image/svg+xml' : 'application/octet-stream';
  for (const [path, file] of Object.entries(zip.files)) {
    if (!path.startsWith('Pictures/') || file.dir) continue;
    media.set(path, `data:${mimeFor(path)};base64,${await file.async('base64')}`);
  }
  const parseParagraph = (element: XmlElement): SourceBlock | null => {
    const styleId = odtAttr(element, 'style-name');
    const style = resolveOdtStyle(styleMap, 'paragraph', styleId);
    const runs = odtRuns(element, styleMap, odtTextFormatting(style), styleId);
    const text = runs.map((run) => run.text).join('');
    if (!text.trim()) return null;
    const isHeading = element.localName === 'h';
    const level = isHeading ? Number.parseInt(odtAttr(element, 'outline-level') ?? '1', 10) : undefined;
    return {
      id: stableId('odt', blocks.length, text),
      type: isHeading ? 'heading' : 'paragraph',
      ...(level ? { level } : {}),
      text,
      runs,
      ...(styleId ? { sourceStyleId: styleId } : {}),
      paragraphProperties: odtParagraphFormatting(style),
      provenance: provenance(isHeading ? 'SOURCE_SEMANTIC' : styleId ? 'SOURCE_STYLE' : 'SOURCE_EXPLICIT', 'content.xml'),
    };
  };
  const parseList = (element: XmlElement): SourceBlock => {
    const listStyle = odtAttr(element, 'style-name');
    const listDefinition = resolveOdtStyle(styleMap, 'list', listStyle);
    const ordered = listDefinition.text['num-format'] !== undefined || /number|ordered|decimal/i.test(listStyle ?? '');
    const items: SourceBlock[] = [];
    for (const item of odtChildren(element).filter((child) => child.localName === 'list-item')) {
      const paragraphs = odtChildren(item).flatMap((child) => child.localName === 'p' || child.localName === 'h' ? [parseParagraph(child)].filter((value): value is SourceBlock => Boolean(value)) : child.localName === 'list' ? [parseList(child)] : []);
      if (paragraphs.length) items.push({ id: stableId('odt-item', items.length, paragraphs.map((block) => block.text ?? '').join('\n')), type: 'paragraph', text: paragraphs.map((block) => block.text ?? '').join('\n'), runs: paragraphs[0].runs, items: paragraphs.slice(1), provenance: provenance('SOURCE_SEMANTIC', 'content.xml') });
    }
    return { id: stableId('odt-list', blocks.length, items.map((item) => item.text ?? '').join('\n')), type: ordered ? 'orderedList' : 'unorderedList', text: items.map((item) => item.text ?? '').join('\n'), items, provenance: provenance('SOURCE_SEMANTIC', 'content.xml') };
  };
  const parseTable = (element: XmlElement): SourceBlock => {
    const rows: string[][] = [];
    const cellRuns: SourceTextRun[][] = [];
    for (const row of odtChildren(element).filter((child) => child.localName === 'table-row')) {
      const cells: string[] = [];
      for (const cell of odtChildren(row).filter((child) => child.localName === 'table-cell')) {
        const paragraphs = odtChildren(cell).filter((child) => child.localName === 'p' || child.localName === 'h');
        const runs = paragraphs.flatMap((paragraph) => odtRuns(paragraph, styleMap, odtTextFormatting(resolveOdtStyle(styleMap, 'paragraph', odtAttr(paragraph, 'style-name'))), odtAttr(paragraph, 'style-name')));
        cells.push(runs.map((run) => run.text).join('\n'));
        cellRuns.push(runs);
      }
      if (cells.length) rows.push(cells);
    }
    return { id: stableId('odt-table', blocks.length, rows.flat().join('|')), type: 'table', text: rows.map((row) => row.join(' | ')).join('\n'), rows, cellRuns, provenance: provenance('SOURCE_EXPLICIT', 'content.xml') };
  };
  const parseImage = (element: XmlElement): SourceBlock | null => {
    let image: XmlElement | undefined;
    odtWalk(element, (child) => { if (!image && child.localName === 'image') image = child; });
    const href = image ? odtAttr(image, 'href') : undefined;
    if (!href) return null;
    const source = media.get(href) ?? href;
    return { id: stableId('odt-image', blocks.length, source), type: 'image', text: odtAttr(element, 'name') ?? '', src: source, alt: odtAttr(element, 'name'), provenance: provenance('SOURCE_EXPLICIT', 'content.xml') };
  };
  const parseChildren = (parent: XmlElement) => {
    for (const element of odtChildren(parent)) {
      const parsed = element.localName === 'p' || element.localName === 'h' ? parseParagraph(element) : element.localName === 'list' ? parseList(element) : element.localName === 'table' ? parseTable(element) : element.localName === 'frame' ? parseImage(element) : element.localName === 'section' ? (parseChildren(element), null) : null;
      if (parsed) blocks.push(parsed);
      // ODT commonly wraps an embedded image in an otherwise empty text:p.
      // The paragraph parser intentionally ignores non-text content, so project
      // the nested frame here instead of silently dropping the image block.
      if (element.localName === 'p' || element.localName === 'h') {
        for (const child of odtChildren(element)) {
          if (child.localName === 'frame') {
            const image = parseImage(child);
            if (image) blocks.push(image);
          }
        }
      }
    }
  };
  parseChildren(root);
  const presentationProfile = odtPresentationProfile(styleMap, styleDocument ?? contentDocument);
  const contentPresentationProfile = odtPresentationProfile(styleMap, contentDocument);
  return {
    version: 1,
    format: 'odt',
    family: 'rich',
    capabilities: getSourceCapabilities('odt'),
    blocks,
    sourceMetadata: {
      presentation: 'rich',
      presentationProfile: {
        ...presentationProfile,
        ...(contentPresentationProfile.toc ? { toc: contentPresentationProfile.toc } : {}),
      },
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
