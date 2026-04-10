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

export function mergeAdjacentLists(html: string): string {
  if (typeof window === 'undefined') return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');

  doc.querySelectorAll('ul + ul, ol + ol').forEach((second) => {
    const first = second.previousElementSibling!;
    // Solo fusionar si mismo tag y mismos atributos clave
    if (
      first.tagName === second.tagName &&
      first.getAttribute('data-bullet-style') === second.getAttribute('data-bullet-style') &&
      first.getAttribute('data-list-style') === second.getAttribute('data-list-style')
    ) {
      while (second.firstChild) first.appendChild(second.firstChild);
      second.remove();
    }
  });

  return doc.body.innerHTML;
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
      .replace(
        /<p[^>]*>\s*(?:<[^>]+>\s*)*[─—–_=*·.\s]{5,}(?:\s*<\/[^>]+>)*\s*<\/p>/gi,
        '',
      )
      .replace(/<hr(?![^>]*data-page-break=)[^>]*\/?>/gi, '')
      .replace(/<hr\s+data-page-break="true"\s*\/?>/gi, '<hr data-page-break="manual">')
      .replace(/<hr\s+data-page-break="manual"\s*\/?>/gi, '<hr data-page-break="manual">')
      .replace(/<hr\s+data-page-break="auto"\s*\/?>/gi, '<hr data-page-break="auto">');

  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${trimmed}</div>`, 'text/html');
    const root = doc.body.firstElementChild!;

    // ── Fusionar listas adyacentes del mismo tipo ──────────────────────────
    root.querySelectorAll('ul + ul, ol + ol').forEach((second) => {
      const first = second.previousElementSibling!;
      if (
        first.tagName === second.tagName &&
        first.getAttribute('data-bullet-style') === second.getAttribute('data-bullet-style') &&
        first.getAttribute('data-list-style')   === second.getAttribute('data-list-style')
      ) {
        while (second.firstChild) first.appendChild(second.firstChild);
        second.remove();
      }
    });
    // ───────────────────────────────────────────────────────────────────────

    const html = root.innerHTML ?? '';
    return normalizeBreakMarkup(html.replace(/>\s+</g, '><').replace(/&nbsp;/g, ' '));
  }

  return normalizeBreakMarkup(trimmed.replace(/>\s+</g, '><').replace(/&nbsp;/g, ' '));
}