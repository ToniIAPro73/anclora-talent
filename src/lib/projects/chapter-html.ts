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
  const content = block.content.trim();
  if (!content) return '';

  const escaped = escapeHtml(content);
  if (block.type === 'heading') return `<h2>${escaped}</h2>`;
  if (block.type === 'quote') return `<blockquote><p>${escaped}</p></blockquote>`;
  return `<p>${escaped}</p>`;
}

export function chapterBlocksToHtml(blocks: DocumentBlock[]): string {
  return blocks
    .map((block) => {
      const content = String(block.content || '');
      if (!content.trim()) return '';
      return content.trimStart().startsWith('<') ? content : wrapPlainBlock(block);
    })
    .filter(Boolean)
    .join('\n');
}
