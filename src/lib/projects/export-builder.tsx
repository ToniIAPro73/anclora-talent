import {
  AlignmentType,
  Document as DocxDocument,
  HeadingLevel,
  HorizontalPositionRelativeFrom,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
  TextWrappingType,
  VerticalPositionRelativeFrom,
} from 'docx';
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import { DEVICE_PAGINATION_CONFIGS } from '@/lib/preview/device-configs';
import type { PaginationConfig } from '@/lib/preview/device-configs';
import { buildPreviewPages, type PreviewPage } from '@/lib/preview/preview-builder';
import type { ProjectRecord } from './types';
import {
  parsePageContent,
  stripInlineHtml,
  type ParsedContentBlock,
} from './export-content-blocks';
import {
  buildBackCoverExportImageDataUrl,
  buildContentPageExportImageDataUrl,
  buildCoverExportImageDataUrl,
} from './export-surface-image';

const DEFAULT_EXPORT_CONFIG = DEVICE_PAGINATION_CONFIGS.laptop;
const PDF_SCALE = 0.75;

const COVER_PALETTE_COLORS: Record<string, { bg: string; text: string; accent: string }> = {
  obsidian: { bg: '#0b133f', text: '#f2e3b3', accent: '#d4af37' },
  teal: { bg: '#124a50', text: '#f2e3b3', accent: '#4fd1c5' },
  sand: { bg: '#f2e3b3', text: '#0b313f', accent: '#d4af37' },
};

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


function renderCoverPageHtml(imageUrl: string) {
  return `
    <section class="export-page export-cover export-image-only-page">
      <img class="export-full-image" src="${escapeHtml(imageUrl)}" alt="" />
    </section>
  `;
}

function renderBackCoverPageHtml(imageUrl: string) {
  return `
    <section class="export-page export-back-cover export-image-only-page">
      <img class="export-full-image" src="${escapeHtml(imageUrl)}" alt="" />
    </section>
  `;
}

function renderLegacyCoverPageHtml(page: PreviewPage, project: ProjectRecord) {
  const cover = page.coverData;
  if (!cover) return '';

  const palette = COVER_PALETTE_COLORS[project.cover.palette] ?? COVER_PALETTE_COLORS.obsidian;
  const renderedImageUrl = cover.renderedImageUrl || '';
  const imageUrl = renderedImageUrl || cover.backgroundImageUrl || '';

  if (renderedImageUrl) {
    return `
      <section class="export-page export-cover export-image-only-page">
        <img class="export-full-image" src="${escapeHtml(renderedImageUrl)}" alt="" />
      </section>
    `;
  }

  return `
    <section class="export-page export-cover" style="background:${palette.bg}; color:${palette.text};">
      ${imageUrl ? `<img class="export-full-image" src="${escapeHtml(imageUrl)}" alt="" />` : ''}
      <div class="export-cover-overlay"></div>
      <div class="export-page-inner export-cover-inner">
        <div class="export-accent-bar" style="background:${palette.accent};"></div>
        <h1 class="export-cover-title">${escapeHtml(cover.title)}</h1>
        ${cover.showSubtitle && cover.subtitle ? `<p class="export-cover-subtitle">${escapeHtml(cover.subtitle)}</p>` : ''}
        ${cover.author ? `<p class="export-cover-author">${escapeHtml(cover.author)}</p>` : ''}
      </div>
    </section>
  `;
}

function renderLegacyBackCoverPageHtml(page: PreviewPage) {
  const backCover = page.backCoverData;
  if (!backCover) return '';
  const renderedImageUrl = backCover.renderedImageUrl || '';
  const imageUrl = renderedImageUrl || backCover.backgroundImageUrl || '';

  if (renderedImageUrl) {
    return `
      <section class="export-page export-back-cover export-image-only-page">
        <img class="export-full-image" src="${escapeHtml(renderedImageUrl)}" alt="" />
      </section>
    `;
  }

  return `
    <section class="export-page export-back-cover">
      ${imageUrl ? `<img class="export-full-image" src="${escapeHtml(imageUrl)}" alt="" />` : ''}
      <div class="export-cover-overlay"></div>
      <div class="export-page-inner export-back-cover-inner">
        <h1 class="export-back-cover-title">${escapeHtml(backCover.title)}</h1>
        ${backCover.body ? `<div class="export-back-cover-body">${backCover.body}</div>` : ''}
        ${backCover.authorBio ? `<div class="export-back-cover-bio">${escapeHtml(backCover.authorBio)}</div>` : ''}
      </div>
    </section>
  `;
}

function renderContentPageHtml(page: PreviewPage) {
  return `
    <section class="export-page export-content-page">
      <div class="export-page-inner export-content-inner">
        ${page.content ?? ''}
      </div>
    </section>
  `;
}

export function buildExportPreview(project: ProjectRecord) {
  return buildPreviewPages(project, DEFAULT_EXPORT_CONFIG);
}

export async function renderProjectExportHtml(
  project: ProjectRecord,
  exportConfig: PaginationConfig = DEFAULT_EXPORT_CONFIG,
) {
  const pages = buildPreviewPages(project, exportConfig);
  const coverImageUrl = await buildCoverExportImageDataUrl(project);
  const backCoverImageUrl = await buildBackCoverExportImageDataUrl(project);
  const sections = pages
    .map((page) => {
      if (page.type === 'cover') {
        return coverImageUrl
          ? renderCoverPageHtml(coverImageUrl)
          : renderLegacyCoverPageHtml(page, project);
      }
      if (page.type === 'back-cover') {
        return backCoverImageUrl
          ? renderBackCoverPageHtml(backCoverImageUrl)
          : renderLegacyBackCoverPageHtml(page);
      }
      return renderContentPageHtml(page);
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="${project.document.language ?? 'es'}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(project.document.title)}</title>
  <style>
    :root {
      --page-width: ${exportConfig.pageWidth}px;
      --page-height: ${exportConfig.pageHeight}px;
      --page-margin-top: ${exportConfig.marginTop}px;
      --page-margin-bottom: ${exportConfig.marginBottom}px;
      --page-margin-left: ${exportConfig.marginLeft}px;
      --page-margin-right: ${exportConfig.marginRight}px;
      --paper-bg: #ffffff;
      --paper-border: #d7dde7;
      --body-text: #1c2430;
      --muted-text: #5f6b7a;
      --quote-border: #d4af37;
      --app-bg: #0a1019;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: Georgia, serif;
      background: var(--app-bg);
      color: var(--body-text);
      padding: 32px;
    }
    .export-document {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
    }
    .export-page {
      position: relative;
      width: var(--page-width);
      min-height: var(--page-height);
      overflow: hidden;
      background: var(--paper-bg);
      border: 1px solid var(--paper-border);
      box-shadow: 0 24px 60px rgba(0,0,0,0.25);
      page-break-after: always;
      break-after: page;
    }
    .export-image-only-page {
      background: #000;
    }
    .export-page-inner {
      position: relative;
      width: 100%;
      min-height: var(--page-height);
      padding: var(--page-margin-top) var(--page-margin-right) var(--page-margin-bottom) var(--page-margin-left);
      z-index: 1;
    }
    .export-full-image {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      z-index: 0;
    }
    .export-cover-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(to bottom, rgba(7,12,20,0.15), rgba(7,12,20,0.5));
      z-index: 0;
    }
    .export-cover-inner, .export-back-cover-inner {
      color: #f2e3b3;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .export-accent-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
    }
    .export-eyebrow {
      margin: 0 0 18px;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.28em;
      opacity: 0.9;
      font-weight: 700;
    }
    .export-cover-title, .export-back-cover-title {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 44px;
      line-height: 1.08;
      font-weight: 900;
    }
    .export-cover-subtitle {
      margin: 18px 0 0;
      font-size: 18px;
      line-height: 1.55;
      opacity: 0.86;
      max-width: 80%;
    }
    .export-cover-author {
      margin: 28px 0 0;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .export-content-inner h1,
    .export-content-inner h2,
    .export-content-inner h3,
    .export-content-inner h4,
    .export-content-inner h5,
    .export-content-inner h6 {
      font-family: Arial, Helvetica, sans-serif;
      color: #111827;
      margin-top: 0;
      margin-bottom: 0.75rem;
    }
    .export-content-inner h2 { font-size: 1.5rem; }
    .export-content-inner p,
    .export-content-inner li,
    .export-back-cover-body {
      font-size: 16px;
      line-height: 1.7;
      color: ${project.cover.palette === 'sand' ? '#1c2430' : '#f7f0cf'};
    }
    .export-content-page .export-content-inner p,
    .export-content-page .export-content-inner li {
      color: var(--body-text);
    }
    .export-content-inner blockquote,
    .export-back-cover-bio {
      margin: 1.25rem 0 0;
      padding-left: 1rem;
      border-left: 4px solid var(--quote-border);
      color: var(--muted-text);
      font-style: italic;
    }
    .export-back-cover {
      background: linear-gradient(160deg, #0b133f 0%, #0b233f 50%, #07252f 100%);
    }
    .export-back-cover-title {
      max-width: 75%;
      margin-bottom: 20px;
    }
    .export-back-cover-body {
      max-width: 72%;
      white-space: pre-wrap;
    }
    .export-back-cover-bio {
      max-width: 62%;
      white-space: pre-wrap;
      color: rgba(242,227,179,0.78);
    }
    @page {
      size: 6in 9in;
      margin: 0;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .export-document { gap: 0; }
      .export-page {
        border: none;
        box-shadow: none;
        width: 6in;
        min-height: 9in;
      }
    }
  </style>
</head>
<body>
  <main class="export-document">
    ${sections}
  </main>
</body>
</html>`;
}

const pdfStyles = StyleSheet.create({
  page: {
    position: 'relative',
    backgroundColor: '#ffffff',
  },
  pageInner: {
    height: '100%',
  },
  fullImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  coverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(7,12,20,0.35)',
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  coverInner: {
    position: 'relative',
    height: '100%',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 8,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 14,
    fontFamily: 'Helvetica-Bold',
  },
  coverTitle: {
    fontSize: 32,
    lineHeight: 1.08,
    fontFamily: 'Helvetica-Bold',
  },
  coverSubtitle: {
    marginTop: 14,
    fontSize: 14,
    lineHeight: 1.5,
  },
  coverAuthor: {
    marginTop: 24,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontFamily: 'Helvetica-Bold',
  },
  heading1: {
    fontSize: 22,
    lineHeight: 1.15,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 10,
    color: '#111827',
  },
  heading2: {
    fontSize: 18,
    lineHeight: 1.18,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
    color: '#111827',
  },
  paragraph: {
    fontSize: 10.5,
    lineHeight: 1.65,
    marginBottom: 8,
    color: '#2b3442',
  },
  quote: {
    fontSize: 10.5,
    lineHeight: 1.6,
    marginBottom: 8,
    marginLeft: 10,
    paddingLeft: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#d4af37',
    color: '#5f6b7a',
    fontStyle: 'italic',
  },
  listItem: {
    fontSize: 10.5,
    lineHeight: 1.65,
    marginBottom: 6,
    marginLeft: 12,
    color: '#2b3442',
  },
  backCoverBody: {
    marginTop: 16,
    fontSize: 12,
    lineHeight: 1.6,
    color: '#f2e3b3',
  },
  backCoverBio: {
    marginTop: 20,
    fontSize: 10,
    lineHeight: 1.4,
    color: 'rgba(242,227,179,0.78)',
  },
});

function renderPdfContentBlock(block: ParsedContentBlock, index: number) {
  if (block.type === 'heading') {
    return (
      <Text key={`pdf-heading-${index}`} style={block.level <= 1 ? pdfStyles.heading1 : pdfStyles.heading2}>
        {block.text}
      </Text>
    );
  }
  if (block.type === 'quote') {
    return (
      <Text key={`pdf-quote-${index}`} style={pdfStyles.quote}>
        {block.text}
      </Text>
    );
  }
  if (block.type === 'list-item') {
    return (
      <Text key={`pdf-li-${index}`} style={pdfStyles.listItem}>
        • {block.text}
      </Text>
    );
  }
  return (
    <Text key={`pdf-p-${index}`} style={pdfStyles.paragraph}>
      {block.text}
    </Text>
  );
}

export async function buildProjectPdf(project: ProjectRecord) {
  return buildProjectPdfWithConfig(project, DEFAULT_EXPORT_CONFIG);
}

export async function buildProjectPdfWithConfig(
  project: ProjectRecord,
  exportConfig: PaginationConfig,
) {
  const pdfPageWidth = exportConfig.pageWidth * PDF_SCALE;
  const pdfPageHeight = exportConfig.pageHeight * PDF_SCALE;
  const pdfMarginTop = exportConfig.marginTop * PDF_SCALE;
  const pdfMarginBottom = exportConfig.marginBottom * PDF_SCALE;
  const pdfMarginLeft = exportConfig.marginLeft * PDF_SCALE;
  const pdfMarginRight = exportConfig.marginRight * PDF_SCALE;
  const pages = buildPreviewPages(project, exportConfig);
  const palette = COVER_PALETTE_COLORS[project.cover.palette] ?? COVER_PALETTE_COLORS.obsidian;
  const coverImageUrl = await buildCoverExportImageDataUrl(project);
  const backCoverImageUrl = await buildBackCoverExportImageDataUrl(project);
  const contentImageUrls = await Promise.all(
    pages.map((page) =>
      buildContentPageExportImageDataUrl(page, exportConfig, {
        allowSvgFallback: false,
      }),
    ),
  );

  return (
    <Document
      title={project.document.title || 'Proyecto'}
      author={project.document.author || 'Anclora Talent'}
      subject={project.document.subtitle || project.title || ''}
    >
      {pages.map((page, pageIndex) => {
        if (page.type === 'cover' && page.coverData) {
          if (coverImageUrl) {
            return (
              <Page key={`pdf-cover-${pageIndex}`} size={[pdfPageWidth, pdfPageHeight]} style={[pdfStyles.page, { width: pdfPageWidth, height: pdfPageHeight }]}>
                <Image src={coverImageUrl} style={pdfStyles.fullImage} />
              </Page>
            );
          }

          const imageUrl = page.coverData.backgroundImageUrl || '';
          return (
            <Page key={`pdf-cover-${pageIndex}`} size={[pdfPageWidth, pdfPageHeight]} style={[pdfStyles.page, { width: pdfPageWidth, height: pdfPageHeight, backgroundColor: palette.bg }]}>
              {imageUrl ? <Image src={imageUrl} style={pdfStyles.fullImage} /> : null}
              {imageUrl ? <View style={pdfStyles.coverOverlay} /> : null}
              <View style={[pdfStyles.accentBar, { backgroundColor: palette.accent }]} />
              <View style={[pdfStyles.pageInner, pdfStyles.coverInner, { paddingTop: pdfMarginTop, paddingBottom: pdfMarginBottom, paddingLeft: pdfMarginLeft, paddingRight: pdfMarginRight }]}>
                <Text style={[pdfStyles.coverTitle, { color: palette.text }]}>{page.coverData.title}</Text>
                {page.coverData.showSubtitle && page.coverData.subtitle ? (
                  <Text style={[pdfStyles.coverSubtitle, { color: palette.text }]}>{page.coverData.subtitle}</Text>
                ) : null}
                {page.coverData.author ? (
                  <Text style={[pdfStyles.coverAuthor, { color: palette.text }]}>{page.coverData.author}</Text>
                ) : null}
              </View>
            </Page>
          );
        }

        if (page.type === 'back-cover' && page.backCoverData) {
          if (backCoverImageUrl) {
            return (
              <Page key={`pdf-back-cover-${pageIndex}`} size={[pdfPageWidth, pdfPageHeight]} style={[pdfStyles.page, { width: pdfPageWidth, height: pdfPageHeight }]}>
                <Image src={backCoverImageUrl} style={pdfStyles.fullImage} />
              </Page>
            );
          }

          const imageUrl = page.backCoverData.backgroundImageUrl || '';
          return (
            <Page key={`pdf-back-cover-${pageIndex}`} size={[pdfPageWidth, pdfPageHeight]} style={[pdfStyles.page, { width: pdfPageWidth, height: pdfPageHeight, backgroundColor: '#0b133f' }]}>
              {imageUrl ? <Image src={imageUrl} style={pdfStyles.fullImage} /> : null}
              {imageUrl ? <View style={pdfStyles.coverOverlay} /> : null}
              <View style={[pdfStyles.pageInner, pdfStyles.coverInner, { paddingTop: pdfMarginTop, paddingBottom: pdfMarginBottom, paddingLeft: pdfMarginLeft, paddingRight: pdfMarginRight }]}>
                <Text style={[pdfStyles.coverTitle, { color: '#f2e3b3', maxWidth: pdfPageWidth * 0.75 }]}>{page.backCoverData.title}</Text>
                {page.backCoverData.body ? (
                  <Text style={[pdfStyles.backCoverBody, { width: pdfPageWidth * 0.72 }]}>
                    {stripInlineHtml(page.backCoverData.body)}
                  </Text>
                ) : null}
                {page.backCoverData.authorBio ? (
                  <Text style={[pdfStyles.backCoverBio, { width: pdfPageWidth * 0.62 }]}>
                    {page.backCoverData.authorBio}
                  </Text>
                ) : null}
              </View>
            </Page>
          );
        }

        const contentImageUrl = contentImageUrls[pageIndex];
        if (page.type === 'content' && !contentImageUrl) {
          throw new Error(
            `PDF export requires a rendered preview image for content page ${page.pageNumber}.`,
          );
        }

        if (contentImageUrl) {
          return (
            <Page key={`pdf-content-${pageIndex}`} size={[pdfPageWidth, pdfPageHeight]} style={[pdfStyles.page, { width: pdfPageWidth, height: pdfPageHeight }]}>
              <Image src={contentImageUrl} style={pdfStyles.fullImage} />
            </Page>
          );
        }

        const blocks = parsePageContent(page.content);
        return (
          <Page key={`pdf-content-${pageIndex}`} size={[pdfPageWidth, pdfPageHeight]} style={[pdfStyles.page, { width: pdfPageWidth, height: pdfPageHeight }]}>
            <View style={[pdfStyles.pageInner, { paddingTop: pdfMarginTop, paddingBottom: pdfMarginBottom, paddingLeft: pdfMarginLeft, paddingRight: pdfMarginRight }]}>
              {blocks.map((block, index) => renderPdfContentBlock(block, index))}
            </View>
          </Page>
        );
      })}
    </Document>
  );
}

function toDocxHeadingLevel(level: number) {
  switch (level) {
    case 1:
      return HeadingLevel.HEADING_1;
    case 2:
      return HeadingLevel.HEADING_2;
    case 3:
      return HeadingLevel.HEADING_3;
    default:
      return HeadingLevel.HEADING_4;
  }
}
function buildDocxPageChildren(page: PreviewPage) {
  if (page.type === 'cover' && page.coverData) {
    return [
      new Paragraph({
        text: page.coverData.title,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
      }),
      ...(page.coverData.showSubtitle && page.coverData.subtitle
        ? [
            new Paragraph({
              text: page.coverData.subtitle,
              alignment: AlignmentType.CENTER,
              spacing: { after: 240 },
            }),
          ]
        : []),
      ...(page.coverData.author
        ? [
            new Paragraph({
              text: page.coverData.author,
              alignment: AlignmentType.CENTER,
            }),
          ]
        : []),
    ];
  }

  if (page.type === 'back-cover' && page.backCoverData) {
    return [
      new Paragraph({
        text: page.backCoverData.title,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.LEFT,
        spacing: { after: 240 },
      }),
      ...(page.backCoverData.body
        ? [
            new Paragraph({
              text: stripInlineHtml(page.backCoverData.body),
              spacing: { after: 240 },
            }),
          ]
        : []),
      ...(page.backCoverData.authorBio
        ? [
            new Paragraph({
              text: page.backCoverData.authorBio,
              spacing: { before: 180 },
              thematicBreak: true,
            }),
          ]
        : []),
    ];
  }

  const blocks = parsePageContent(page.content);
  return blocks.map((block) => {
    if (block.type === 'heading') {
      return new Paragraph({
        text: block.text,
        heading: toDocxHeadingLevel(block.level),
        spacing: { after: 160 },
      });
    }
    if (block.type === 'quote') {
      return new Paragraph({
        children: [new TextRun({ text: block.text, italics: true })],
        indent: { left: 420 },
        border: {
          left: { color: 'D4AF37', size: 12, style: 'single' },
        },
        spacing: { after: 160 },
      });
    }
    if (block.type === 'list-item') {
      return new Paragraph({
        text: block.text,
        bullet: { level: 0 },
        spacing: { after: 80 },
      });
    }
    return new Paragraph({
      text: block.text,
      spacing: { after: 140 },
    });
  });
}

type DocxImagePayload = {
  data: Uint8Array;
  type: 'png' | 'jpg' | 'gif' | 'bmp';
};

function inferImageType(imageUrl: string): DocxImagePayload['type'] {
  const lowerUrl = imageUrl.toLowerCase();
  if (lowerUrl.includes('image/jpeg') || lowerUrl.endsWith('.jpeg')) return 'jpg';
  if (lowerUrl.includes('image/jpg') || lowerUrl.endsWith('.jpg')) return 'jpg';
  if (lowerUrl.includes('image/gif') || lowerUrl.endsWith('.gif')) return 'gif';
  if (lowerUrl.includes('image/bmp') || lowerUrl.endsWith('.bmp')) return 'bmp';
  return 'png';
}

async function loadImageBytes(imageUrl: string): Promise<DocxImagePayload | null> {
  if (!imageUrl.trim()) {
    return null;
  }

  if (imageUrl.startsWith('data:')) {
    const [, base64 = ''] = imageUrl.split(',', 2);
    return base64
      ? {
          data: Uint8Array.from(Buffer.from(base64, 'base64')),
          type: inferImageType(imageUrl),
        }
      : null;
  }

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return null;
    }

    const buffer = await response.arrayBuffer();
    return {
      data: new Uint8Array(buffer),
      type: inferImageType(response.headers.get('content-type') || imageUrl),
    };
  } catch {
    return null;
  }
}

export async function buildProjectDocxBuffer(
  project: ProjectRecord,
  exportConfig: PaginationConfig = DEFAULT_EXPORT_CONFIG,
) {
  const docxPageWidth = exportConfig.pageWidth;
  const docxPageHeight = exportConfig.pageHeight;
  const pages = buildPreviewPages(project, exportConfig);
  const coverImageUrl = await buildCoverExportImageDataUrl(project);
  const backCoverImageUrl = await buildBackCoverExportImageDataUrl(project);
  const contentImageUrls = await Promise.all(
    pages.map((page) => buildContentPageExportImageDataUrl(page, exportConfig)),
  );
  const pageImagePayloads = await Promise.all(
    pages.map(async (page, index) => {
      const imageUrl =
        page.type === 'cover'
          ? coverImageUrl
          : page.type === 'back-cover'
            ? backCoverImageUrl
            : contentImageUrls[index] ?? null;

      return imageUrl ? loadImageBytes(imageUrl) : null;
    }),
  );

  const sections = pages.map((page, index) => ({
    properties: {
      page: {
        size: {
          width: 8640,
          height: 12960,
        },
        margin: {
          top: pageImagePayloads[index] != null ? 0 : 1080,
          bottom: pageImagePayloads[index] != null ? 0 : 1080,
          left: pageImagePayloads[index] != null ? 0 : 1080,
          right: pageImagePayloads[index] != null ? 0 : 1080,
          header: 0,
          footer: 0,
          gutter: 0,
        },
      },
    },
    children:
      pageImagePayloads[index] != null
        ? [
            new Paragraph({
              children: [
                new ImageRun({
                  data: pageImagePayloads[index]!.data,
                  type: pageImagePayloads[index]!.type,
                  transformation: {
                    width: docxPageWidth,
                    height: docxPageHeight,
                  },
                  floating: {
                    horizontalPosition: {
                      relative: HorizontalPositionRelativeFrom.PAGE,
                      offset: 0,
                    },
                    verticalPosition: {
                      relative: VerticalPositionRelativeFrom.PAGE,
                      offset: 0,
                    },
                    wrap: {
                      type: TextWrappingType.NONE,
                    },
                    margins: {
                      top: 0,
                      bottom: 0,
                      left: 0,
                      right: 0,
                    },
                    allowOverlap: true,
                    behindDocument: false,
                  },
                }),
              ],
              spacing: { before: 0, after: 0, line: 1, lineRule: 'auto' as const },
            }),
          ]
        : buildDocxPageChildren(page),
  }));

  const doc = new DocxDocument({
    creator: 'Anclora Talent',
    title: project.document.title,
    description: project.document.subtitle,
    sections,
  });

  return Packer.toBuffer(doc);
}
