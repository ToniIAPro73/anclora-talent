/**
 * EPUB 3 writer — canonical export from the composition engine (FASE F1).
 *
 * Same contract as the PDF/DOCX/HTML exports: the EPUB is built from the
 * project's semantic document + `ComposeResult` (never from hand-made HTML).
 * - One XHTML file per chapter, split with the engine's `splitChapters`
 *   (project-chapter anchors honored) and serialized via `blocksToHtml`.
 * - NAV + NCX are 100% generated from `ComposeResult.toc` with the real
 *   heading levels (H1-H3), linked to heading anchors in the chapter files.
 * - The persisted TOC chapter is skipped: the engine NAV replaces it.
 * - Images are embedded under OEBPS/images/ and their `src` rewritten;
 *   images that cannot be embedded are dropped (an EPUB must be
 *   self-contained).
 * - Liberation TTF fonts (from pdfjs-dist standard_fonts) are embedded with
 *   `font/ttf` media types when available; the build degrades gracefully to
 *   system fonts when they are not (e.g. a serverless bundle without them).
 *
 * The cover is a simple XHTML page generated from the document metadata
 * (rasterizing the designed cover server-side is out of scope for F1).
 */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import JSZip from 'jszip';
import type { ProjectRecord } from '@/lib/projects/types';
import { type ComposedPreview, projectToSemanticDocument } from '@/lib/compose/preview-adapter';
import { splitChapters, type ComposeTemplate, type TocEntry } from '@/lib/compose/compose';
import { isTocChapter } from '@/lib/preview/preview-builder';
import { blocksToHtml, type ResolvedRefs } from '@/lib/document/to-html';
import { inlineToPlainText, type DocumentBlock } from '@/lib/document/model';

export interface BuildEpubOptions {
  /** Embed Liberation TTF fonts when available (default true). */
  fonts?: boolean;
  /**
   * F2 brand theme: composer template overrides (from
   * `brandProfileToTemplateOverrides`) applied to the stylesheet — same
   * overrides passed to `composeProjectPreview` (R3: one canonical model).
   */
  template?: Partial<ComposeTemplate>;
}

interface EmbeddedImage {
  fileName: string;
  mediaType: string;
  data: Buffer;
}

interface EmbeddedFont {
  fileName: string;
  data: Buffer;
}

const LIBERATION_FONTS = [
  'LiberationSans-Regular.ttf',
  'LiberationSans-Bold.ttf',
  'LiberationSans-Italic.ttf',
  'LiberationSans-BoldItalic.ttf',
];

const IMAGE_MEDIA_TYPE_BY_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  webp: 'image/webp',
};

const IMAGE_EXTENSION_BY_MEDIA_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
};

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Deterministic UUID-shaped id derived from a seed (stable EPUB identifier). */
function stableUuid(seed: string): string {
  let hex = '';
  for (let round = 0; round < 4; round += 1) {
    let hash = 5381 + round * 7919;
    const input = `${seed}#${round}`;
    for (let i = 0; i < input.length; i += 1) {
      hash = (hash * 33) ^ input.charCodeAt(i);
    }
    hex += (hash >>> 0).toString(16).padStart(8, '0');
  }
  const chars = hex.slice(0, 32).split('');
  chars[12] = '4'; // version
  chars[16] = ((8 + (parseInt(chars[16], 16) % 4))).toString(16); // variant
  return `${chars.slice(0, 8).join('')}-${chars.slice(8, 12).join('')}-${chars
    .slice(12, 16)
    .join('')}-${chars.slice(16, 20).join('')}-${chars.slice(20, 32).join('')}`;
}

function toIsoDate(value: string | undefined): string {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function toIsoDateTime(value: string | undefined): string {
  const date = value ? new Date(value) : new Date();
  const valid = Number.isNaN(date.getTime()) ? new Date() : date;
  return valid.toISOString().replace(/\.\d+Z$/, 'Z');
}

function imageMediaType(src: string, contentType?: string | null): string | null {
  if (contentType && IMAGE_EXTENSION_BY_MEDIA_TYPE[contentType]) return contentType;
  const dataUriMime = src.match(/^data:([^;,]+)[;,]/)?.[1];
  if (dataUriMime && IMAGE_EXTENSION_BY_MEDIA_TYPE[dataUriMime]) return dataUriMime;
  const extension = src.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_MEDIA_TYPE_BY_EXTENSION[extension] ?? null;
}

async function loadImageBytes(src: string): Promise<{ data: Buffer; mediaType: string } | null> {
  try {
    if (src.startsWith('data:')) {
      const mediaType = imageMediaType(src);
      const base64 = src.split(',', 2)[1];
      if (!mediaType || !base64) return null;
      return { data: Buffer.from(base64, 'base64'), mediaType };
    }
    const response = await fetch(src);
    if (!response.ok) return null;
    const mediaType = imageMediaType(src, response.headers.get('content-type'));
    if (!mediaType) return null;
    return { data: Buffer.from(await response.arrayBuffer()), mediaType };
  } catch (error) {
    console.error('[epub/loadImageBytes] failed', error);
    return null;
  }
}

async function loadLiberationFonts(): Promise<EmbeddedFont[]> {
  try {
    const require = createRequire(import.meta.url);
    const fontsDir = join(dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts');
    const fonts: EmbeddedFont[] = [];
    for (const fileName of LIBERATION_FONTS) {
      fonts.push({ fileName, data: await readFile(join(fontsDir, fileName)) });
    }
    return fonts;
  } catch {
    console.warn('[epub] Liberation fonts not available; building with system fonts');
    return [];
  }
}

function serializeChapterBlock(
  block: DocumentBlock,
  refs: ResolvedRefs,
  imagePathBySrc: Map<string, string>,
): string {
  if (block.type === 'image' && !imagePathBySrc.has(block.src)) {
    // Remote/unreadable image: dropped so the EPUB stays self-contained.
    return '';
  }
  let html = blocksToHtml([block], refs);
  if (block.type === 'heading') {
    // Anchor target for NAV/NCX links (toc entries point at block ids).
    html = html.replace(/^<h(\d)>/, `<h$1 id="${escapeXml(block.id)}">`);
  }
  if (block.type === 'image') {
    html = html.replace(`src="${escapeXml(block.src)}"`, `src="${imagePathBySrc.get(block.src)!}"`);
  }
  return html;
}

interface NavNode {
  entry: TocEntry;
  href: string;
  children: NavNode[];
}

/**
 * Intra-document links (`<a href="#fragment">`) are only valid in an EPUB
 * when the fragment exists as an anchor in the package. Imported documents
 * carry dead fragments (e.g. Word's `_Toc…` bookmarks from a manual TOC that
 * the generated NAV replaces); those links are unwrapped keeping their text
 * so the EPUB stays self-contained and passes EPUBCheck RSC-012.
 */
function sanitizeFragmentLinks(html: string, validFragmentIds: Set<string>): string {
  return html.replace(/<a href="#([^"]*)">([\s\S]*?)<\/a>/g, (match, fragment: string, inner: string) =>
    validFragmentIds.has(fragment) ? match : inner,
  );
}

function buildNavTree(entries: TocEntry[], hrefByBlockId: Map<string, string>): NavNode[] {
  const levels = [...new Set(entries.map((entry) => entry.level))].sort((a, b) => a - b);
  const depthByLevel = new Map(levels.map((level, index) => [level, index + 1]));
  const roots: NavNode[] = [];
  const stack: NavNode[] = [];
  for (const entry of entries) {
    const href = hrefByBlockId.get(entry.blockId);
    if (!href) continue; // toc target not in the EPUB body (e.g. skipped TOC chapter)
    const node: NavNode = { entry, href, children: [] };
    const depth = depthByLevel.get(entry.level) ?? 1;
    while (stack.length >= depth) stack.pop();
    if (stack.length === 0) roots.push(node);
    else stack[stack.length - 1].children.push(node);
    stack.push(node);
  }
  return roots;
}

function navTreeDepth(nodes: NavNode[]): number {
  let depth = 0;
  for (const node of nodes) {
    depth = Math.max(depth, 1 + navTreeDepth(node.children));
  }
  return depth;
}

function renderNavList(nodes: NavNode[]): string {
  const items = nodes
    .map(
      (node) =>
        `<li><a href="${escapeXml(node.href)}">${escapeXml(node.entry.text)}</a>` +
        `${node.children.length > 0 ? renderNavList(node.children) : ''}</li>`,
    )
    .join('');
  return `<ol>${items}</ol>`;
}

function renderNavPoints(nodes: NavNode[], playOrder: { next: number }): string {
  return nodes
    .map((node) => {
      const order = playOrder.next;
      playOrder.next += 1;
      return (
        `<navPoint id="navPoint-${order}" playOrder="${order}">` +
        `<navLabel><text>${escapeXml(node.entry.text)}</text></navLabel>` +
        `<content src="${escapeXml(node.href)}"/>` +
        renderNavPoints(node.children, playOrder) +
        `</navPoint>`
      );
    })
    .join('');
}

function xhtmlDocument(lang: string, title: string, cssHref: string, body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}" lang="${lang}">
<head>
<meta charset="utf-8"/>
<title>${escapeXml(title)}</title>
<link rel="stylesheet" type="text/css" href="${cssHref}"/>
</head>
<body>
${body}
</body>
</html>
`;
}

/** CSS-safe single-quoted font family (strips quotes/backslashes). */
function cssFontFamily(family: string): string {
  return `'${family.replace(/['\\]/g, '')}'`;
}

function buildStylesheet(fonts: EmbeddedFont[], template?: Partial<ComposeTemplate>): string {
  const fontFaces = fonts
    .map((font) => {
      const weight = font.fileName.includes('Bold') ? 'bold' : 'normal';
      const style = font.fileName.includes('Italic') ? 'italic' : 'normal';
      return (
        `@font-face {\n  font-family: 'Liberation Sans';\n  font-weight: ${weight};\n` +
        `  font-style: ${style};\n  src: url('../fonts/${font.fileName}');\n}`
      );
    })
    .join('\n');
  const bodyFont = fonts.length > 0 ? "'Liberation Sans', Georgia, serif" : 'Georgia, serif';
  // F2 brand theme: declared families lead the stack; the embedded/system
  // fonts remain as fallback so the EPUB stays self-contained (EPUBCheck).
  const brandBodyFont = template?.bodyFontFamily
    ? `${cssFontFamily(template.bodyFontFamily)}, ${bodyFont}`
    : bodyFont;
  const brandRules = [
    template?.displayFontFamily
      ? `h1, h2, h3 { font-family: ${cssFontFamily(template.displayFontFamily)}, Georgia, serif; }`
      : '',
    template?.headingColor ? `h1, h2, h3 { color: ${template.headingColor}; }` : '',
    template?.bodyColor ? `body { color: ${template.bodyColor}; }` : '',
    template?.paperColor ? `body { background-color: ${template.paperColor}; }` : '',
    template?.accentColor ? `blockquote { border-left-color: ${template.accentColor}; }` : '',
    template?.accentMutedColor
      ? `caption, figcaption { color: ${template.accentMutedColor}; }`
      : '',
  ]
    .filter(Boolean)
    .join('\n');
  return `${fontFaces}
body { font-family: ${brandBodyFont}; line-height: 1.5; margin: 5%; }
h1 { font-size: 1.6em; margin: 1em 0 0.6em; }
h2 { font-size: 1.3em; margin: 0.9em 0 0.5em; }
h3 { font-size: 1.1em; margin: 0.8em 0 0.4em; }
p { margin: 0 0 0.8em; }
table { border-collapse: collapse; width: 100%; margin: 1em 0; }
th, td { border: 1px solid #999; padding: 0.3em 0.5em; text-align: left; vertical-align: top; }
caption { font-size: 0.9em; color: #555; margin-bottom: 0.3em; }
figure { margin: 1em 0; text-align: center; }
figcaption { font-size: 0.9em; color: #555; }
img { max-width: 100%; }
blockquote { margin: 1em 0 1em 1.5em; padding-left: 1em; border-left: 3px solid #d4af37; font-style: italic; }
pre { font-family: monospace; white-space: pre-wrap; }
.cover { text-align: center; margin-top: 25%; }
.cover h1 { font-size: 2em; }
.cover-subtitle { font-size: 1.2em; color: #555; }
.cover-author { margin-top: 2em; font-weight: bold; }
${brandRules ? `${brandRules}\n` : ''}`;
}

/**
 * Builds a valid EPUB 3 package for the project from its composed result.
 * `composed` must come from `composeProjectPreview` (same run the export
 * gate validates), so NAV/NCX, numbering and refs match the print exports.
 */
export async function buildEpub(
  project: ProjectRecord,
  composed: ComposedPreview,
  options: BuildEpubOptions = {},
): Promise<Buffer> {
  const { toc, refs } = composed.result;
  const { document, chapterStartIds, chapterById } = projectToSemanticDocument(project);
  const metadata = document.metadata;
  const lang = metadata.language ?? project.document.language ?? 'es';

  const startIds = chapterStartIds.length > 0 ? new Set(chapterStartIds) : undefined;
  const slices = splitChapters(document.blocks, 1, startIds).filter((slice) => {
    const contentBlocks = slice.blocks.filter((block) => block.type !== 'pageBreak');
    if (contentBlocks.length === 0) return false;
    // The persisted TOC chapter is fully replaced by the generated NAV.
    const chapterInfo = chapterById.get(slice.blocks[0].id);
    const heading = slice.heading?.type === 'heading' ? slice.heading : null;
    return !(chapterInfo?.isToc || (heading && isTocChapter(inlineToPlainText(heading.content))));
  });

  // Embed images (deduplicated by source) and rewrite their src.
  const imageSrcs = new Set<string>();
  for (const slice of slices) {
    for (const block of slice.blocks) {
      if (block.type === 'image') imageSrcs.add(block.src);
    }
  }
  const images: EmbeddedImage[] = [];
  const imagePathBySrc = new Map<string, string>();
  let imageIndex = 0;
  for (const src of imageSrcs) {
    const loaded = await loadImageBytes(src);
    if (!loaded) continue;
    imageIndex += 1;
    const extension = IMAGE_EXTENSION_BY_MEDIA_TYPE[loaded.mediaType] ?? 'png';
    const fileName = `image-${imageIndex}.${extension}`;
    images.push({ fileName, mediaType: loaded.mediaType, data: loaded.data });
    imagePathBySrc.set(src, `../images/${fileName}`);
  }

  const fonts = options.fonts === false ? [] : await loadLiberationFonts();

  // Chapter XHTML files + block-id → href index for the generated TOC links.
  const chapters: { id: string; fileName: string; title: string }[] = [];
  const hrefByBlockId = new Map<string, string>();
  const chapterFiles = new Map<string, string>();
  // Anchors actually present in the EPUB: headings get `id` attributes.
  const anchorIds = new Set<string>();
  for (const slice of slices) {
    for (const block of slice.blocks) {
      if (block.type === 'heading') anchorIds.add(block.id);
    }
  }
  slices.forEach((slice, index) => {
    const fileName = `chapter-${index + 1}.xhtml`;
    const title =
      slice.heading?.type === 'heading' ? inlineToPlainText(slice.heading.content) : metadata.title;
    chapters.push({ id: `chapter-${index + 1}`, fileName, title });
    for (const block of slice.blocks) {
      hrefByBlockId.set(block.id, `text/${fileName}#${block.id}`);
    }
    const body = slice.blocks
      .filter((block) => block.type !== 'pageBreak')
      .map((block) => serializeChapterBlock(block, refs, imagePathBySrc))
      .join('');
    const xhtml = xhtmlDocument(lang, title, '../styles/epub.css', sanitizeFragmentLinks(body, anchorIds));
    chapterFiles.set(`OEBPS/text/${fileName}`, xhtml);
  });

  const navTree = buildNavTree(toc, hrefByBlockId);
  const ncxDepth = Math.max(navTreeDepth(navTree), 1);

  const identifier = metadata.isbn
    ? `urn:isbn:${metadata.isbn.replace(/[^0-9Xx]/g, '')}`
    : `urn:uuid:${stableUuid(project.id)}`;

  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
`;

  const subjects = (metadata.keywords ?? [])
    .map((keyword) => `    <dc:subject>${escapeXml(keyword)}</dc:subject>`)
    .join('\n');
  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0" xml:lang="${lang}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${escapeXml(identifier)}</dc:identifier>
    <dc:title>${escapeXml(metadata.title)}</dc:title>
${metadata.author ? `    <dc:creator>${escapeXml(metadata.author)}</dc:creator>\n` : ''}    <dc:language>${escapeXml(lang)}</dc:language>
    <dc:date>${toIsoDate(project.createdAt)}</dc:date>
    <meta property="dcterms:modified">${toIsoDateTime(project.updatedAt)}</meta>
${metadata.description ? `    <dc:description>${escapeXml(metadata.description)}</dc:description>\n` : ''}${subjects ? `${subjects}\n` : ''}  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="styles/epub.css" media-type="text/css"/>
    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>
${chapters
  .map(
    (chapter) =>
      `    <item id="${chapter.id}" href="text/${chapter.fileName}" media-type="application/xhtml+xml"/>`,
  )
  .join('\n')}
${fonts
  .map(
    (font, index) =>
      `    <item id="font-${index + 1}" href="fonts/${font.fileName}" media-type="font/ttf"/>`,
  )
  .join('\n')}
${images
  .map(
    (image, index) =>
      `    <item id="img-${index + 1}" href="images/${image.fileName}" media-type="${image.mediaType}"/>`,
  )
  .join('\n')}
  </manifest>
  <spine toc="ncx">
    <itemref idref="cover"/>
${chapters.map((chapter) => `    <itemref idref="${chapter.id}"/>`).join('\n')}
  </spine>
</package>
`;

  const tocHeading = lang.startsWith('en') ? 'Contents' : 'Índice';
  const navXhtml = xhtmlDocument(
    lang,
    `${metadata.title} — ${tocHeading}`,
    'styles/epub.css',
    `<nav epub:type="toc" id="toc">
<h1>${escapeXml(tocHeading)}</h1>
${renderNavList(navTree)}
</nav>`,
  );

  const ncx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="${lang}">
<head>
<meta name="dtb:uid" content="${escapeXml(identifier)}"/>
<meta name="dtb:depth" content="${ncxDepth}"/>
<meta name="dtb:totalPageCount" content="0"/>
<meta name="dtb:maxPageNumber" content="0"/>
</head>
<docTitle><text>${escapeXml(metadata.title)}</text></docTitle>
<navMap>
${renderNavPoints(navTree, { next: 1 })}
</navMap>
</ncx>
`;

  const coverBody = `<section class="cover" epub:type="cover">
<h1>${escapeXml(metadata.title)}</h1>
${metadata.subtitle ? `<p class="cover-subtitle">${escapeXml(metadata.subtitle)}</p>` : ''}
${metadata.author ? `<p class="cover-author">${escapeXml(metadata.author)}</p>` : ''}
</section>`;
  const coverXhtml = xhtmlDocument(lang, metadata.title, 'styles/epub.css', coverBody);

  const zip = new JSZip();
  // OCF contract: mimetype is the first entry and stored uncompressed.
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file('META-INF/container.xml', containerXml);
  zip.file('OEBPS/content.opf', opf);
  zip.file('OEBPS/nav.xhtml', navXhtml);
  zip.file('OEBPS/toc.ncx', ncx);
  zip.file('OEBPS/cover.xhtml', coverXhtml);
  zip.file('OEBPS/styles/epub.css', buildStylesheet(fonts, options.template));
  for (const [path, content] of chapterFiles) {
    zip.file(path, content);
  }
  for (const font of fonts) {
    zip.file(`OEBPS/fonts/${font.fileName}`, font.data);
  }
  for (const image of images) {
    zip.file(`OEBPS/images/${image.fileName}`, image.data);
  }

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}
