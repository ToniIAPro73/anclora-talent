import {
  AlignmentType,
  Document as DocxDocument,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
  SectionType,
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

function cleanStringForDocx(input: string) {
  return stripInlineHtml(input || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    .trim();
}

async function loadImageBytes(imageUrl: string): Promise<DocxImagePayload | null> {
  if (!imageUrl || !imageUrl.trim()) {
    return null;
  }

  try {
    if (imageUrl.startsWith('data:')) {
      const parts = imageUrl.split(',', 2);
      const mime = parts[0].match(/:(.*?);/)?.[1];
      const base64 = parts[1];
      if (!base64) return null;
      
      const buffer = Buffer.from(base64, 'base64');
      return {
        data: new Uint8Array(buffer),
        type: mime?.includes('jpeg') || mime?.includes('jpg') ? 'jpg' : 'png',
      };
    }

    const response = await fetch(imageUrl);
    if (!response.ok) return null;

    const buffer = await response.arrayBuffer();
    return {
      data: new Uint8Array(buffer),
      type: inferImageType(response.headers.get('content-type') || imageUrl),
    };
  } catch (error) {
    console.error('[docx/loadImageBytes] failed', error);
    return null;
  }
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

export async function buildProjectDocxBuffer(
  project: ProjectRecord,
  exportConfig: PaginationConfig = DEFAULT_EXPORT_CONFIG,
) {
  const PX_TO_TWIPS = 15;
  const PX_TO_EMU = 9525;

  const docxPageWidthTwips = Math.round(exportConfig.pageWidth * PX_TO_TWIPS);
  const docxPageHeightTwips = Math.round(exportConfig.pageHeight * PX_TO_TWIPS);
  const docxImageWidthEmu = Math.round(exportConfig.pageWidth * PX_TO_EMU);
  const docxImageHeightEmu = Math.round(exportConfig.pageHeight * PX_TO_EMU);

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

  const sections = pages.map((page, index) => {
    const hasImage = pageImagePayloads[index] != null;
    let children: Paragraph[] = [];

    if (hasImage) {
      children = [
        new Paragraph({
          children: [
            new ImageRun({
              data: pageImagePayloads[index]!.data,
              type: pageImagePayloads[index]!.type,
              transformation: {
                width: docxImageWidthEmu,
                height: docxImageHeightEmu,
              },
            }),
          ],
          spacing: { before: 0, after: 0, line: 0, lineRule: 'exact' },
        }),
      ];
    } else {
      children = buildDocxPageChildren(page);
    }

    if (children.length === 0) {
      children.push(new Paragraph(''));
    }

    return {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size: {
            width: docxPageWidthTwips,
            height: docxPageHeightTwips,
          },
          margin: {
            top: hasImage ? 0 : Math.round(exportConfig.marginTop * PX_TO_TWIPS),
            bottom: hasImage ? 0 : Math.round(exportConfig.marginBottom * PX_TO_TWIPS),
            left: hasImage ? 0 : Math.round(exportConfig.marginLeft * PX_TO_TWIPS),
            right: hasImage ? 0 : Math.round(exportConfig.marginRight * PX_TO_TWIPS),
            header: 0,
            footer: 0,
            gutter: 0,
          },
        },
      },
      children,
    };
  });

  const doc = new DocxDocument({
    creator: 'Anclora Talent',
    title: cleanStringForDocx(project.document.title || 'Proyecto'),
    description: cleanStringForDocx(project.document.subtitle || ''),
    sections,
  });

  return Packer.toBuffer(doc);
}
