/**
 * SemanticDocument → Markdown writer (F2 — blog derivative of the launch pack).
 *
 * Contract (AST → MD):
 * - Document metadata opens the file: `# title`, `*subtitle*` and an author
 *   line when present.
 * - heading → `#` repeated `level`; paragraph → inline flow; pageBreak → `---`.
 * - list → `- item` (unordered) or `1. item` (ordered, renumbered from 1).
 * - table → GitHub-flavored pipe table; with `hasHeader` the first row is the
 *   header, otherwise an empty header row is emitted. Caption follows as an
 *   italic line.
 * - image → `![alt](src)` with the caption as an italic line below.
 * - quote → `> …`; callout → `> **kind:** …`; code → fenced block with the
 *   declared language.
 * - Inline marks: bold `**…**`, italic `*…*`, link `[text](href)`; ref tokens
 *   materialize as their fallback text (Markdown has no live refs).
 *
 * Blocks are separated by a blank line; the output ends with a single
 * trailing newline.
 */

import type {
  DocumentBlock,
  InlineNode,
  SemanticDocument,
  TextInlineNode,
} from './model';

function escapeTableCell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function textNodeToMarkdown(node: TextInlineNode): string {
  const marks = node.marks ?? [];
  const link = marks.find((mark) => mark.type === 'link');
  const bold = marks.some((mark) => mark.type === 'bold');
  const italic = marks.some((mark) => mark.type === 'italic');

  let text = node.text;
  if (bold) text = `**${text}**`;
  if (italic) text = `*${text}*`;
  if (link?.href) text = `[${text}](${link.href})`;
  return text;
}

export function inlineToMarkdown(nodes: InlineNode[]): string {
  return nodes
    .map((node) => (node.type === 'text' ? textNodeToMarkdown(node) : node.fallback ?? ''))
    .join('')
    .trim();
}

function tableToMarkdown(block: Extract<DocumentBlock, { type: 'table' }>): string {
  const rows = block.rows.map((row) => row.map(inlineToMarkdown).map(escapeTableCell));
  if (rows.length === 0) return '';

  const columnCount = Math.max(...rows.map((row) => row.length));
  const pad = (row: string[]) => [...row, ...Array<string>(columnCount - row.length).fill('')];

  const header = block.hasHeader ? pad(rows[0]) : Array<string>(columnCount).fill('');
  const body = block.hasHeader ? rows.slice(1) : rows;

  const lines = [
    `| ${header.join(' | ')} |`,
    `| ${Array<string>(columnCount).fill('---').join(' | ')} |`,
    ...body.map((row) => `| ${pad(row).join(' | ')} |`),
  ];
  if (block.caption) lines.push(`*${block.caption}*`);
  return lines.join('\n');
}

function blockToMarkdown(block: DocumentBlock): string {
  switch (block.type) {
    case 'heading':
      return `${'#'.repeat(block.level)} ${inlineToMarkdown(block.content)}`;
    case 'paragraph':
      return inlineToMarkdown(block.content);
    case 'list':
      return block.items
        .map((itemFlow, index) => {
          const marker = block.ordered ? `${index + 1}.` : '-';
          return `${marker} ${inlineToMarkdown(itemFlow)}`;
        })
        .join('\n');
    case 'table':
      return tableToMarkdown(block);
    case 'image': {
      const alt = block.alt ?? '';
      const lines = [`![${alt}](${block.src})`];
      if (block.caption) lines.push(`*${block.caption}*`);
      return lines.join('\n');
    }
    case 'quote':
      return `> ${inlineToMarkdown(block.content)}`;
    case 'callout':
      return `> **${block.kind}:** ${inlineToMarkdown(block.content)}`;
    case 'code':
      return `\`\`\`${block.language ?? ''}\n${block.code}\n\`\`\``;
    case 'pageBreak':
      return '---';
  }
}

/** Serializes the canonical document AST to Markdown (blog derivative). */
export function documentToMarkdown(document: SemanticDocument): string {
  const parts: string[] = [];

  const { title, subtitle, author } = document.metadata;
  if (title) parts.push(`# ${title}`);
  if (subtitle) parts.push(`*${subtitle}*`);
  if (author) parts.push(author);

  for (const block of document.blocks) {
    const markdown = blockToMarkdown(block);
    if (markdown) parts.push(markdown);
  }

  return `${parts.join('\n\n')}\n`;
}
