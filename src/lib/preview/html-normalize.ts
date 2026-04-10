/**
 * HTML Normalization Utility
 * Shared between editor and preview to ensure consistent rendering truth.
 */

export function normalizeDocumentHtml(content: string): string {
  if (!content) return '';
  
  let normalized = content.trim();

  // 1. Remove imported decorative separators that shouldn't be in the flow
  normalized = normalized.replace(
    /<p[^>]*>\s*(?:<[^>]+>\s*)*[─—–_=*·.\s]{5,}(?:\s*<\/[^>]+>)*\s*<\/p>/gi,
    '',
  );

  // 2. Remove standard <hr> tags that are not page breaks
  normalized = normalized.replace(/<hr(?![^>]*data-page-break=)[^>]*\/?>/gi, '');

  // 3. Normalize all page break variants to the canonical "manual" type
  normalized = normalized.replace(
    /<hr\s+data-page-break="(?:true|manual)"\s*\/?>/gi,
    '<hr data-page-break="manual">',
  );

  // 4. Preserve auto breaks as is
  normalized = normalized.replace(
    /<hr\s+data-page-break="auto"\s*\/?>/gi,
    '<hr data-page-break="auto">',
  );

  // 5. Clean up empty paragraphs at the start/end
  normalized = normalized.replace(/^(<p[^>]*>\s*<\/p>)+|(<p[^>]*>\s*<\/p>)+$/gi, '');

  return normalized;
}

/**
 * Editor/Preview HTML normalization used for pagination.
 * Copiado de useChapterEditor para compartir la misma “verdad” visual.
 */
export function normalizeHtmlContent(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return '';

  const normalizeBreakMarkup = (html: string) =>
    html
      // Decorative separators
      .replace(
        /<p[^>]*>\s*(?:<[^>]+>\s*)*[─—–_=*·.\s]{5,}(?:\s*<\/[^>]+>)*\s*<\/p>/gi,
        '',
      )
      // <hr> que no son page-breaks
      .replace(/<hr(?![^>]*data-page-break=)[^>]*\/?>/gi, '')
      // true/manual → manual
      .replace(/<hr\s+data-page-break="true"\s*\/?>/gi, '<hr data-page-break="manual">')
      .replace(/<hr\s+data-page-break="manual"\s*\/?>/gi, '<hr data-page-break="manual">')
      // auto se preserva
      .replace(/<hr\s+data-page-break="auto"\s*\/?>/gi, '<hr data-page-break="auto">');

  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${trimmed}</div>`, 'text/html');
    const html = doc.body.firstElementChild?.innerHTML ?? '';
    return normalizeBreakMarkup(html.replace(/>\s+</g, '><').replace(/&nbsp;/g, ' '));
  }

  return normalizeBreakMarkup(trimmed.replace(/>\s+</g, '><').replace(/&nbsp;/g, ' '));
}