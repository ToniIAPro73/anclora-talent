import type { DocumentBlock } from './types';

function escapeHtml(text: string) {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return text.replace(/[&<>"']/g, (char) => map[char]);
}

function wrapPlainBlock(block: DocumentBlock): string {
  if (block.type === 'pageBreak') return '<hr data-page-break="manual" />';
  const content = block.content.trim();
  if (!content) return '';

  const escaped = escapeHtml(content);
  const properties = block.paragraphProperties ?? {};
  const isHeading = block.type === 'heading';
  const styles = [
    !isHeading && properties.firstLineIndent !== undefined ? `text-indent:${String(properties.firstLineIndent)}${typeof properties.firstLineIndent === 'number' ? 'pt' : ''}` : '',
    properties.leftIndent !== undefined ? `margin-left:${String(properties.leftIndent)}${typeof properties.leftIndent === 'number' ? 'pt' : ''}` : '',
    properties.rightIndent !== undefined ? `margin-right:${String(properties.rightIndent)}${typeof properties.rightIndent === 'number' ? 'pt' : ''}` : '',
  ].filter(Boolean).join(';');
  const attrs = styles ? ` style="${styles}"` : '';
  if (block.type === 'heading') return `<h2${attrs}>${escaped}</h2>`;
  if (block.type === 'quote') return `<blockquote><p${attrs}>${escaped}</p></blockquote>`;
  return `<p${attrs}>${escaped}</p>`;
}

export function chapterBlocksToHtml(blocks: DocumentBlock[]): string {
  return blocks
    .map((block) => {
      const content = String(block.content || '');
      if (block.type === 'pageBreak') return '<hr data-page-break="manual" />';
      if (!content.trim()) return '';
      return content.trimStart().startsWith('<') ? content : wrapPlainBlock(block);
    })
    .filter(Boolean)
    .join('\n');
}
