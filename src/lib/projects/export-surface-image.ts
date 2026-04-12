import sharp from 'sharp';
import type { ProjectRecord, CoverDesign } from './types';
import type { PreviewPage } from '@/lib/preview/preview-builder';
import type { PaginationConfig } from '@/lib/preview/device-configs';
import {
  createDefaultSurfaceState,
  normalizeSurfaceState,
  type SurfaceLayer,
} from './cover-surface';
import { resolveCoverSurfaceFields } from './cover-surface-resolver';
import { resolveBackCoverSurfaceFields } from './back-cover-surface-resolver';
import { COVER_TEXT_LAYOUT, BACK_COVER_TEXT_LAYOUT } from './cover-layout';
import { findSurfaceTextLayer } from './cover-layer-style';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;

const COVER_GRADIENTS: Record<CoverDesign['palette'], string> = {
  obsidian: 'linear-gradient(160deg, #0b133f 0%, #0b233f 50%, #07252f 100%)',
  teal: 'linear-gradient(160deg, #124a50 0%, #0b313f 50%, #07252f 100%)',
  sand: 'linear-gradient(160deg, #f2e3b3 0%, #e7d4a0 50%, #d4af37 100%)',
};

const COVER_TEXT_COLORS: Record<CoverDesign['palette'], { primary: string; secondary: string }> = {
  obsidian: { primary: '#f2e3b3', secondary: 'rgba(242,227,179,0.75)' },
  teal: { primary: '#f2e3b3', secondary: 'rgba(242,227,179,0.75)' },
  sand: { primary: '#0b313f', secondary: 'rgba(11,49,63,0.72)' },
};

const BACK_COVER_BACKGROUND =
  'linear-gradient(160deg, #0b133f 0%, #0b233f 50%, #07252f 100%)';
const PREVIEW_PAGE_BACKGROUND = '#0C141E';
const PREVIEW_PAGE_BORDER = 'rgba(74, 159, 216, 0.14)';
const PREVIEW_TEXT_PRIMARY = '#EDF2F8';
const PREVIEW_TEXT_TERTIARY = '#7090A8';
const PREVIEW_QUOTE_BORDER = '#4A9FD8';

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function rgbaToSvgColor(input: string | undefined, fallback: string) {
  const value = input?.trim();
  if (!value) return fallback;

  const rgba = value.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (!rgba) {
    return value;
  }

  const [, r, g, b, a] = rgba;
  const red = Number.parseInt(r, 10).toString(16).padStart(2, '0');
  const green = Number.parseInt(g, 10).toString(16).padStart(2, '0');
  const blue = Number.parseInt(b, 10).toString(16).padStart(2, '0');

  if (a == null) {
    return `#${red}${green}${blue}`;
  }

  return `rgba(${Number.parseInt(r, 10)}, ${Number.parseInt(g, 10)}, ${Number.parseInt(b, 10)}, ${a})`;
}

function charSpacingPx(charSpacing: number | undefined, fontSize: number) {
  if (!charSpacing) return 0;
  return (charSpacing / 1000) * fontSize;
}

function normalizeFontWeight(weight: string | number | undefined, fallback: number) {
  if (typeof weight === 'number') return weight;
  if (typeof weight === 'string') {
    if (weight === 'bold') return 700;
    const parsed = Number.parseInt(weight, 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
}

function wrapText(text: string, maxWidth: number, fontSize: number, letterSpacing: number) {
  const normalized = text.replace(/\r/g, '').trim();
  if (!normalized) return [];

  const maxChars = Math.max(
    1,
    Math.floor(maxWidth / Math.max(fontSize * 0.56 + Math.max(letterSpacing, 0), 1)),
  );

  return normalized
    .split('\n')
    .flatMap((paragraph) => {
      const words = paragraph.trim().split(/\s+/).filter(Boolean);
      if (words.length === 0) return [''];

      const lines: string[] = [];
      let current = '';

      for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (candidate.length > maxChars && current) {
          lines.push(current);
          current = word;
        } else {
          current = candidate;
        }
      }

      if (current) lines.push(current);
      return lines;
    });
}

function textAnchorForLayer(layer: SurfaceLayer | undefined) {
  return layer?.originX === 'left' ? 'start' : 'middle';
}

function renderTextLayer({
  value,
  layer,
  fallbackTop,
  fallbackLeft,
  fallbackWidth,
  fallbackFontSize,
  fallbackLineHeight,
  fallbackColor,
  uppercase = false,
}: {
  value: string;
  layer: SurfaceLayer | undefined;
  fallbackTop: number;
  fallbackLeft: number;
  fallbackWidth: number;
  fallbackFontSize: number;
  fallbackLineHeight: number;
  fallbackColor: string;
  uppercase?: boolean;
}) {
  const content = uppercase ? value.toUpperCase() : value;
  if (!content.trim()) return '';

  const fontSize = layer?.fontSize ?? fallbackFontSize;
  const lineHeight = layer?.lineHeight ?? fallbackLineHeight;
  const letterSpacing = charSpacingPx(layer?.charSpacing, fontSize);
  const width = layer?.width ?? fallbackWidth;
  const x = typeof layer?.left === 'number' ? layer.left : fallbackLeft;
  const centerY = typeof layer?.top === 'number' ? layer.top : fallbackTop;
  const lines = wrapText(content, width, fontSize, letterSpacing);
  const totalHeight = Math.max(1, lines.length) * fontSize * lineHeight;
  const startY = centerY - totalHeight / 2 + fontSize * 0.85;
  const anchor = textAnchorForLayer(layer);
  const fill = rgbaToSvgColor(layer?.fill, fallbackColor);
  const opacity = layer?.opacity ?? 1;
  const fontFamily = escapeXml(layer?.fontFamily || 'Arial, Helvetica, sans-serif');
  const fontWeight = normalizeFontWeight(layer?.fontWeight, 400);
  const fontStyle = layer?.fontStyle ?? 'normal';

  return `
    <text
      x="${x}"
      y="${startY}"
      fill="${fill}"
      fill-opacity="${opacity}"
      font-family="${fontFamily}"
      font-size="${fontSize}"
      font-weight="${fontWeight}"
      font-style="${fontStyle}"
      letter-spacing="${letterSpacing}"
      text-anchor="${anchor}"
    >
      ${lines
        .map(
          (line, index) =>
            `<tspan x="${x}" dy="${index === 0 ? 0 : fontSize * lineHeight}">${escapeXml(line)}</tspan>`,
        )
        .join('')}
    </text>
  `;
}

async function fetchImageAsDataUrl(imageUrl: string | null | undefined) {
  if (!imageUrl?.trim()) return null;
  if (imageUrl.startsWith('data:')) return imageUrl;

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || 'image/png';
    const buffer = Buffer.from(await response.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

function normalizeCoverSurface(project: ProjectRecord) {
  const fallback = createDefaultSurfaceState('cover');
  const baseState = normalizeSurfaceState(project.cover.surfaceState ?? fallback);
  return {
    ...baseState,
    fields: {
      ...baseState.fields,
      ...resolveCoverSurfaceFields(project, baseState),
    },
  };
}

function normalizeBackCoverSurface(project: ProjectRecord) {
  const fallback = createDefaultSurfaceState('back-cover');
  const baseState = normalizeSurfaceState(project.backCover.surfaceState ?? fallback);
  return {
    ...baseState,
    fields: {
      ...baseState.fields,
      ...resolveBackCoverSurfaceFields(project, baseState),
    },
  };
}

async function rasterizeSvg(svg: string) {
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}

function wrapForeignObjectMarkup(markup: string) {
  return markup.replace(/&nbsp;/g, '&#160;');
}

function buildSvgShell({
  background,
  backgroundImage,
  overlayOpacity,
  children,
  accentColor,
}: {
  background: string;
  backgroundImage?: string | null;
  overlayOpacity: number;
  children: string;
  accentColor?: string | null;
}) {
  const gradientId = `gradient-${Math.random().toString(36).slice(2, 8)}`;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}">
      <defs>
        <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="55%" y2="100%">
          <stop offset="0%" stop-color="${background.includes('#0b133f') ? '#0b133f' : '#f2e3b3'}" />
          <stop offset="50%" stop-color="${background.includes('#124a50') ? '#0b313f' : background.includes('#f2e3b3') ? '#e7d4a0' : '#0b233f'}" />
          <stop offset="100%" stop-color="${background.includes('#124a50') ? '#07252f' : background.includes('#f2e3b3') ? '#d4af37' : '#07252f'}" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#${gradientId})" />
      ${
        backgroundImage
          ? `<image href="${backgroundImage}" x="0" y="0" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" preserveAspectRatio="xMidYMid slice" opacity="${overlayOpacity}" />`
          : ''
      }
      <rect x="0" y="0" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" fill="rgba(7,12,20,0.18)" />
      ${
        accentColor
          ? `<rect x="0" y="0" width="${CANVAS_WIDTH}" height="4" fill="${accentColor}" />`
          : ''
      }
      ${children}
    </svg>
  `;
}

export async function buildCoverExportImageDataUrl(project: ProjectRecord) {
  if (project.cover.renderedImageUrl?.trim()) {
    return project.cover.renderedImageUrl;
  }

  const surface = normalizeCoverSurface(project);
  const colors = COVER_TEXT_COLORS[project.cover.palette];
  const backgroundImage = await fetchImageAsDataUrl(project.cover.backgroundImageUrl);
  const titleLayer = findSurfaceTextLayer(surface.layers, 'title');
  const subtitleLayer = findSurfaceTextLayer(surface.layers, 'subtitle');
  const authorLayer = findSurfaceTextLayer(surface.layers, 'author');

  const title = surface.fields.title?.value || project.cover.title || project.document.title || '';
  const subtitle = surface.fields.subtitle?.visible ? surface.fields.subtitle.value : '';
  const author = surface.fields.author?.visible ? surface.fields.author.value : '';

  const children = [
    renderTextLayer({
      value: title,
      layer: titleLayer,
      fallbackTop: COVER_TEXT_LAYOUT.titleTop * CANVAS_HEIGHT,
      fallbackLeft: CANVAS_WIDTH / 2,
      fallbackWidth: COVER_TEXT_LAYOUT.titleWidth * CANVAS_WIDTH,
      fallbackFontSize: COVER_TEXT_LAYOUT.titleFontSize,
      fallbackLineHeight: COVER_TEXT_LAYOUT.titleLineHeight,
      fallbackColor: colors.primary,
    }),
    subtitle
      ? renderTextLayer({
          value: subtitle,
          layer: subtitleLayer,
          fallbackTop: COVER_TEXT_LAYOUT.subtitleTop * CANVAS_HEIGHT,
          fallbackLeft: CANVAS_WIDTH / 2,
          fallbackWidth: COVER_TEXT_LAYOUT.subtitleWidth * CANVAS_WIDTH,
          fallbackFontSize: COVER_TEXT_LAYOUT.subtitleFontSize,
          fallbackLineHeight: 1.45,
          fallbackColor: colors.secondary,
        })
      : '',
    author
      ? renderTextLayer({
          value: author,
          layer: authorLayer,
          fallbackTop: COVER_TEXT_LAYOUT.authorTop * CANVAS_HEIGHT,
          fallbackLeft: CANVAS_WIDTH / 2,
          fallbackWidth: COVER_TEXT_LAYOUT.authorWidth * CANVAS_WIDTH,
          fallbackFontSize: COVER_TEXT_LAYOUT.authorFontSize,
          fallbackLineHeight: COVER_TEXT_LAYOUT.titleLineHeight,
          fallbackColor: colors.primary,
          uppercase: true,
        })
      : '',
  ].join('');

  const svg = buildSvgShell({
    background: COVER_GRADIENTS[project.cover.palette],
    backgroundImage,
    overlayOpacity: surface.opacity ?? 1,
    children,
    accentColor: project.cover.palette === 'sand' ? '#0b313f' : '#d4af37',
  });

  return rasterizeSvg(svg);
}

export async function buildBackCoverExportImageDataUrl(project: ProjectRecord) {
  if (project.backCover.renderedImageUrl?.trim()) {
    return project.backCover.renderedImageUrl;
  }

  const surface = normalizeBackCoverSurface(project);
  const backgroundImage = await fetchImageAsDataUrl(project.backCover.backgroundImageUrl);
  const titleLayer = findSurfaceTextLayer(surface.layers, 'title');
  const bodyLayer = findSurfaceTextLayer(surface.layers, 'body');
  const authorBioLayer = findSurfaceTextLayer(surface.layers, 'authorBio');
  const primaryColor = project.backCover.accentColor || '#f2e3b3';
  const secondaryColor = 'rgba(242,227,179,0.78)';

  const title = surface.fields.title?.visible ? surface.fields.title.value : '';
  const body = surface.fields.body?.visible ? surface.fields.body.value : '';
  const authorBio = surface.fields.authorBio?.visible ? surface.fields.authorBio.value : '';

  const children = [
    title
      ? renderTextLayer({
          value: title,
          layer: titleLayer,
          fallbackTop: BACK_COVER_TEXT_LAYOUT.titleTop * CANVAS_HEIGHT,
          fallbackLeft: BACK_COVER_TEXT_LAYOUT.titleLeft * CANVAS_WIDTH,
          fallbackWidth: BACK_COVER_TEXT_LAYOUT.titleWidth * CANVAS_WIDTH,
          fallbackFontSize: BACK_COVER_TEXT_LAYOUT.titleFontSize,
          fallbackLineHeight: BACK_COVER_TEXT_LAYOUT.titleLineHeight,
          fallbackColor: primaryColor,
        })
      : '',
    body
      ? renderTextLayer({
          value: body,
          layer: bodyLayer,
          fallbackTop: BACK_COVER_TEXT_LAYOUT.bodyTop * CANVAS_HEIGHT,
          fallbackLeft: BACK_COVER_TEXT_LAYOUT.bodyLeft * CANVAS_WIDTH,
          fallbackWidth: BACK_COVER_TEXT_LAYOUT.bodyWidth * CANVAS_WIDTH,
          fallbackFontSize: BACK_COVER_TEXT_LAYOUT.bodyFontSize,
          fallbackLineHeight: BACK_COVER_TEXT_LAYOUT.bodyLineHeight,
          fallbackColor: primaryColor,
        })
      : '',
    authorBio
      ? renderTextLayer({
          value: authorBio,
          layer: authorBioLayer,
          fallbackTop: BACK_COVER_TEXT_LAYOUT.authorBioTop * CANVAS_HEIGHT,
          fallbackLeft: BACK_COVER_TEXT_LAYOUT.authorBioLeft * CANVAS_WIDTH,
          fallbackWidth: BACK_COVER_TEXT_LAYOUT.authorBioWidth * CANVAS_WIDTH,
          fallbackFontSize: BACK_COVER_TEXT_LAYOUT.authorBioFontSize,
          fallbackLineHeight: BACK_COVER_TEXT_LAYOUT.authorBioLineHeight,
          fallbackColor: secondaryColor,
        })
      : '',
  ].join('');

  const svg = buildSvgShell({
    background: BACK_COVER_BACKGROUND,
    backgroundImage,
    overlayOpacity: surface.opacity ?? 0.24,
    children,
    accentColor: null,
  });

  return rasterizeSvg(svg);
}

export async function buildContentPageExportImageDataUrl(
  page: PreviewPage,
  config: PaginationConfig,
) {
  if (page.type !== 'content') {
    return null;
  }

  const html = (page.content ?? '').trim();
  if (!html) {
    return null;
  }

  const width = config.pageWidth;
  const height = config.pageHeight;
  const innerWidth = width - config.marginLeft - config.marginRight;
  const innerHeight = height - config.marginTop - config.marginBottom;

  const foreignHtml = wrapForeignObjectMarkup(html);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect x="0" y="0" width="${width}" height="${height}" rx="8" ry="8" fill="${PREVIEW_PAGE_BACKGROUND}" stroke="${PREVIEW_PAGE_BORDER}" />
      <foreignObject x="${config.marginLeft}" y="${config.marginTop}" width="${innerWidth}" height="${innerHeight}">
        <div xmlns="http://www.w3.org/1999/xhtml" style="
          width:${innerWidth}px;
          height:${innerHeight}px;
          overflow:hidden;
          color:${PREVIEW_TEXT_PRIMARY};
          font-family: Arial, Helvetica, sans-serif;
          font-size:${config.fontSize}px;
          line-height:${config.lineHeight};
          word-wrap:break-word;
          overflow-wrap:break-word;
        ">
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; }
            p {
              margin: 0;
              color: ${PREVIEW_TEXT_PRIMARY};
              word-break: break-word;
              overflow-wrap: break-word;
            }
            p + p { margin-top: 0.8rem; }
            h1, h2, h3, h4, h5, h6 {
              margin-top: 0;
              color: ${PREVIEW_TEXT_PRIMARY};
              font-family: Arial, Helvetica, sans-serif;
            }
            h1 { font-size: 2rem; line-height: 1.1; font-weight: 800; margin-bottom: 1rem; }
            h2 { font-size: 1.5rem; line-height: 1.2; font-weight: 750; margin-bottom: 0.85rem; }
            h3 { font-size: 1.2rem; line-height: 1.3; font-weight: 700; margin-bottom: 0.75rem; }
            h4 { font-size: 1.05rem; line-height: 1.35; font-weight: 700; margin-bottom: 0.65rem; }
            h5, h6 { font-size: 0.95rem; line-height: 1.4; font-weight: 700; margin-bottom: 0.6rem; }
            ul, ol { margin: 0 0 1rem 1.5rem; padding: 0; color: ${PREVIEW_TEXT_PRIMARY}; }
            ul:not([data-bullet-style]) { list-style-type: disc; }
            ol:not([data-list-style]) { list-style-type: decimal; }
            li { margin: 0.35rem 0; color: ${PREVIEW_TEXT_PRIMARY}; }
            ul[data-bullet-style="disc"] { list-style-type: disc; }
            ul[data-bullet-style="circle"] { list-style-type: circle; }
            ul[data-bullet-style="square"] { list-style-type: square; }
            ul[data-bullet-style="diamond"],
            ul[data-bullet-style="arrow"],
            ul[data-bullet-style="check"] {
              list-style: none;
              padding-left: 0;
            }
            ul[data-bullet-style="diamond"] > li,
            ul[data-bullet-style="arrow"] > li,
            ul[data-bullet-style="check"] > li {
              position: relative;
              padding-left: 1.5rem;
            }
            ul[data-bullet-style="diamond"] > li::before { content: "◆"; }
            ul[data-bullet-style="arrow"] > li::before { content: "➤"; }
            ul[data-bullet-style="check"] > li::before { content: "✓"; }
            ul[data-bullet-style="diamond"] > li::before,
            ul[data-bullet-style="arrow"] > li::before,
            ul[data-bullet-style="check"] > li::before {
              position: absolute;
              left: 0;
              color: ${PREVIEW_TEXT_PRIMARY};
              font-weight: 700;
            }
            ol[data-list-style="decimal"] { list-style-type: decimal; }
            ol[data-list-style="upper-alpha"] { list-style-type: upper-alpha; }
            ol[data-list-style="lower-alpha"] { list-style-type: lower-alpha; }
            ol[data-list-style="upper-roman"] { list-style-type: upper-roman; }
            ol[data-list-style="lower-roman"] { list-style-type: lower-roman; }
            ol[data-list-style="decimal-parentheses"],
            ol[data-list-style="lower-alpha-parentheses"] {
              list-style: none;
              counter-reset: custom-list;
              padding-left: 0;
            }
            ol[data-list-style="decimal-parentheses"] > li,
            ol[data-list-style="lower-alpha-parentheses"] > li {
              position: relative;
              padding-left: 2rem;
              counter-increment: custom-list;
            }
            ol[data-list-style="decimal-parentheses"] > li::before { content: counter(custom-list) ") "; }
            ol[data-list-style="lower-alpha-parentheses"] > li::before { content: counter(custom-list, lower-alpha) ") "; }
            ol[data-list-style="decimal-parentheses"] > li::before,
            ol[data-list-style="lower-alpha-parentheses"] > li::before {
              position: absolute;
              left: 0;
              color: ${PREVIEW_TEXT_PRIMARY};
              font-weight: 600;
            }
            blockquote {
              margin: 1.25rem 0 0;
              padding-left: 1rem;
              border-left: 4px solid ${PREVIEW_QUOTE_BORDER};
              color: ${PREVIEW_TEXT_TERTIARY};
              font-style: italic;
            }
            img {
              max-width: 100%;
              height: auto;
              object-fit: cover;
            }
            hr[data-page-break] {
              display: none;
            }
          </style>
          <div>${foreignHtml}</div>
        </div>
      </foreignObject>
    </svg>
  `;

  return rasterizeSvg(svg);
}
