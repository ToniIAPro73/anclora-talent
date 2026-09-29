import JSZip from 'jszip';

export interface CanonicalFootnoteDefinition {
  id: string;
  displayNumber: string;
  html: string;
  sourceStyle?: string;
  sourcePageNumber?: number;
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

function paragraphText(paragraphXml: string) {
  return Array.from(paragraphXml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g))
    .map((match) => decodeXml(match[1]))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

function sourceFootnotePages(documentXml: string): Map<string, number> {
  const paragraphs = Array.from(documentXml.matchAll(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g)).map((match) => match[0]);
  const tocPages = paragraphs
    .filter((paragraph) => /<w:tab\b|TOC/i.test(paragraph))
    .map((paragraph) => paragraphText(paragraph).match(/(\d{1,4})\s*$/)?.[1])
    .filter((page): page is string => Boolean(page))
    .map(Number)
    .filter((page, index, pages) => Number.isFinite(page) && pages.indexOf(page) === index);
  if (tocPages.length === 0) return new Map();

  const pagesById = new Map<string, number>();
  let logicalPage = 1;
  let contentSection = -1;
  let afterToc = false;
  let pageBreakPending = false;
  let seenToc = false;
  const isTocParagraph = (paragraph: string) => /<w:tab\b|TOC/i.test(paragraph);

  for (const paragraph of paragraphs) {
    const hasPageBreak = /<w:br\b[^>]*w:type="page"|<w:lastRenderedPageBreak\b/i.test(paragraph);
    if (hasPageBreak) {
      logicalPage += 1;
      pageBreakPending = true;
    }

    const text = paragraphText(paragraph);
    const refs = Array.from(paragraph.matchAll(/w:footnoteReference[^>]*w:id="(\d+)"/g)).map((match) => match[1]);
    const isNonTocContent = Boolean(text) && !isTocParagraph(paragraph);
    if (isTocParagraph(paragraph)) {
      seenToc = true;
    }
    if (!afterToc && seenToc && isNonTocContent && (logicalPage > 2 || pageBreakPending)) {
      afterToc = true;
      contentSection = 0;
    } else if (afterToc && pageBreakPending && isNonTocContent) {
      contentSection += 1;
    }

    if (afterToc && isNonTocContent) {
      pageBreakPending = false;
    }
    if (refs.length > 0 && afterToc) {
      const sourcePageNumber = tocPages[contentSection] ?? logicalPage;
      refs.forEach((id) => pagesById.set(id, sourcePageNumber));
    }
  }

  return pagesById;
}

/** Parse the OOXML footnote part into the shared semantic model. */
export async function parseDocxFootnotes(buffer: Buffer | ArrayBuffer): Promise<CanonicalFootnoteSet> {
  const zip = await JSZip.loadAsync(buffer);
  const entry = zip.file('word/footnotes.xml');
  if (!entry) return { definitions: [], hasSeparator: false, hasContinuationSeparator: false };

  const xml = await entry.async('string');
  const documentEntry = zip.file('word/document.xml');
  const sourcePages = documentEntry ? sourceFootnotePages(await documentEntry.async('string')) : new Map<string, number>();
  const definitions: CanonicalFootnoteDefinition[] = [];
  for (const match of xml.matchAll(/<w:footnote\b([^>]*)>([\s\S]*?)<\/w:footnote>/g)) {
    const attrs = match[1];
    const id = attrs.match(/\bw:id="(-?\d+)"/)?.[1];
    if (!id || Number(id) < 1) continue;
    const paragraphs = Array.from(match[2].matchAll(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g))
      .map((paragraph) => paragraphHtml(paragraph[0]))
      .filter(Boolean);
    const html = paragraphs.join('');
    if (html) {
      definitions.push({
        id,
        displayNumber: id,
        html,
        ...(sourcePages.has(id) ? { sourcePageNumber: sourcePages.get(id) } : {}),
      });
    }
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
