import JSZip from 'jszip';

export interface CanonicalFootnoteDefinition {
  id: string;
  displayNumber: string;
  html: string;
  sourceStyle?: string;
}

export interface CanonicalFootnoteSet {
  definitions: CanonicalFootnoteDefinition[];
  hasSeparator: boolean;
  hasContinuationSeparator: boolean;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function runHtml(runXml: string) {
  const text = Array.from(runXml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g))
    .map((match) => decodeXml(match[1]))
    .join('');
  if (!text) return '';

  const rpr = runXml.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/)?.[1] ?? '';
  let html = escapeHtml(text);
  if (/<w:b(?:\s[^>]*)?\s*\/>|<w:b\b[^>]*>/.test(rpr)) html = `<strong>${html}</strong>`;
  if (/<w:i(?:\s[^>]*)?\s*\/>|<w:i\b[^>]*>/.test(rpr)) html = `<em>${html}</em>`;
  if (/<w:u\b[^>]*\/>|<w:u\b[^>]*>/.test(rpr)) html = `<u>${html}</u>`;
  return html;
}

function paragraphHtml(paragraphXml: string) {
  const runs = Array.from(paragraphXml.matchAll(/<w:r\b[^>]*>[\s\S]*?<\/w:r>/g))
    .map((match) => runHtml(match[0]))
    .join('');
  return runs.trim();
}

/** Parse the OOXML footnote part into the shared semantic model. */
export async function parseDocxFootnotes(buffer: Buffer | ArrayBuffer): Promise<CanonicalFootnoteSet> {
  const zip = await JSZip.loadAsync(buffer);
  const entry = zip.file('word/footnotes.xml');
  if (!entry) return { definitions: [], hasSeparator: false, hasContinuationSeparator: false };

  const xml = await entry.async('string');
  const definitions: CanonicalFootnoteDefinition[] = [];
  for (const match of xml.matchAll(/<w:footnote\b([^>]*)>([\s\S]*?)<\/w:footnote>/g)) {
    const attrs = match[1];
    const id = attrs.match(/\bw:id="(-?\d+)"/)?.[1];
    if (!id || Number(id) < 1) continue;
    const paragraphs = Array.from(match[2].matchAll(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g))
      .map((paragraph) => paragraphHtml(paragraph[0]))
      .filter(Boolean);
    const html = paragraphs.join('');
    if (html) definitions.push({ id, displayNumber: id, html });
  }

  return {
    definitions,
    hasSeparator: /w:id="-1"[^>]*w:type="separator"/.test(xml),
    hasContinuationSeparator: /w:id="0"[^>]*w:type="continuationSeparator"/.test(xml),
  };
}

export function normalizeFootnoteReferenceMarkup(html: string) {
  return html.replace(
    /<sup[^>]*>\s*<a\b[^>]*href="#footnote-(\d+)"[^>]*>\s*(?:\[)?\1(?:\])?\s*<\/a>\s*<\/sup>/gi,
    '<sup data-footnote-reference="$1">$1</sup>',
  );
}
