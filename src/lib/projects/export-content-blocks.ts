export type ParsedContentBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'list-item'; text: string };

export function decodeHtmlEntities(text: string) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function stripInlineHtml(text: string) {
  return decodeHtmlEntities(
    text
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
      .replace(/<\/li>\s*<li[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim(),
  );
}

export function parsePageContent(html: string | null | undefined): ParsedContentBlock[] {
  if (!html?.trim()) return [];

  const blocks: ParsedContentBlock[] = [];
  const pattern = /<(h([1-6])|p|blockquote|li)\b[^>]*>([\s\S]*?)<\/\1>/gi;

  for (const match of html.matchAll(pattern)) {
    const fullTag = match[1]?.toLowerCase();
    const headingLevel = Number(match[2] ?? 2);
    const inner = stripInlineHtml(match[3] ?? '');
    if (!inner) continue;

    if (fullTag?.startsWith('h')) {
      blocks.push({ type: 'heading', level: headingLevel, text: inner });
      continue;
    }
    if (fullTag === 'blockquote') {
      blocks.push({ type: 'quote', text: inner });
      continue;
    }
    if (fullTag === 'li') {
      blocks.push({ type: 'list-item', text: inner });
      continue;
    }
    blocks.push({ type: 'paragraph', text: inner });
  }

  if (blocks.length > 0) {
    return blocks;
  }

  return stripInlineHtml(html)
    .split(/\n{2,}/)
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text) => ({ type: 'paragraph' as const, text }));
}
