import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import type { Browser } from 'playwright-core';
import type { ProjectRecord, CoverDesign } from './types';
import { parsePageContent, type ParsedContentBlock } from './export-content-blocks';
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
import { fabricCharSpacingToCss, findSurfaceTextLayer } from './cover-layer-style';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const EXPORT_PAGE_WIDTH = 576;
const EXPORT_PAGE_HEIGHT = 864;
const EMBEDDED_BODY_FONT_FAMILY = 'AncloraExportSans';
const EMBEDDED_FONT_FILES = {
  regular: resolve(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf'),
  bold: resolve(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts/LiberationSans-Bold.ttf'),
  italic: resolve(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts/LiberationSans-Italic.ttf'),
  boldItalic: resolve(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts/LiberationSans-BoldItalic.ttf'),
} as const;

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
const PREVIEW_PAGE_BACKGROUND = '#FFFFFF';
const PREVIEW_TEXT_PRIMARY = '#0C1820';
const PREVIEW_TEXT_TERTIARY = '#5F6B7A';
const PREVIEW_QUOTE_BORDER = '#D4AF37';

let embeddedFontFaceCssPromise: Promise<string> | null = null;
let playwrightBrowserPromise: Promise<Browser> | null = null;

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
  const fontFamily = EMBEDDED_BODY_FONT_FAMILY;
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

async function launchLocalPlaywrightBrowser() {
  const { chromium } = await import('@playwright/test');
  return chromium.launch({ headless: true });
}

async function launchServerChromiumBrowser() {
  const [{ chromium }, chromiumBinaryModule] = await Promise.all([
    import('playwright-core'),
    import('@sparticuz/chromium'),
  ]);
  const chromiumBinary = chromiumBinaryModule.default;
  const executablePath = await chromiumBinary.executablePath();

  return chromium.launch({
    args: chromiumBinary.args,
    executablePath,
    headless: true,
  });
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return error;
}

async function getPlaywrightBrowser() {
  if (playwrightBrowserPromise) {
    try {
      const cached = await playwrightBrowserPromise;
      if (cached.isConnected()) {
        return cached;
      }
    } catch {
      // fall through to relaunch
    }
    playwrightBrowserPromise = null;
  }

  playwrightBrowserPromise = (async () => {
    try {
      return await launchLocalPlaywrightBrowser();
    } catch (localError) {
      try {
        return await launchServerChromiumBrowser();
      } catch (serverError) {
        console.error('[export/render] browser launch failed', {
          localError: serializeError(localError),
          serverError: serializeError(serverError),
        });
        throw serverError;
      }
    }
  })().catch((error) => {
    playwrightBrowserPromise = null;
    throw error;
  });

  return playwrightBrowserPromise;
}

function isBrowserClosedError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const msg = error.message || '';
  return (
    msg.includes('Target page, context or browser has been closed') ||
    msg.includes('Browser has been closed') ||
    msg.includes('has been closed') ||
    msg.includes('Target closed') ||
    msg.includes('Connection closed')
  );
}

const RENDER_CONCURRENCY = 3;
let activeRenders = 0;
const renderQueue: Array<() => void> = [];

async function withRenderSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (activeRenders >= RENDER_CONCURRENCY) {
    await new Promise<void>((resolve) => renderQueue.push(resolve));
  }
  activeRenders++;
  try {
    return await fn();
  } finally {
    activeRenders--;
    const next = renderQueue.shift();
    if (next) next();
  }
}

function googleFontHref(fontFamily: string) {
  const normalized = fontFamily.trim().replace(/^['"]|['"]$/g, '');
  if (!normalized) return null;
  const family = normalized.split(',')[0]?.trim();
  if (!family) return null;

  const encoded = family.replace(/\s+/g, '+');
  return `https://fonts.googleapis.com/css2?family=${encoded}:wght@400;500;700;800;900&display=swap`;
}

function collectGoogleFontLinks(fontFamilies: Array<string | null | undefined>) {
  const links = new Set<string>();
  links.add('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800;900&display=swap');

  for (const fontFamily of fontFamilies) {
    const href = fontFamily ? googleFontHref(fontFamily) : null;
    if (href) links.add(href);
  }

  return Array.from(links)
    .map((href) => `<link rel="stylesheet" href="${href}" />`)
    .join('\n');
}

async function renderOnce({
  html,
  width,
  height,
}: {
  html: string;
  width: number;
  height: number;
}) {
  const browser = await getPlaywrightBrowser();
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });

  try {
    // Use 'load' rather than 'networkidle' so that an unreachable Google Fonts
    // CDN can't stall the screenshot (the inlined @font-face fallback ensures
    // we still have Latin glyphs when the external CSS never loads).
    await page.setContent(html, { waitUntil: 'load' });
    await page.waitForFunction(async () => {
      const images = Array.from(document.images);
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true });
            img.addEventListener('error', () => resolve(), { once: true });
          });
        }),
      );

      if ('fonts' in document) {
        await (document as Document & { fonts: FontFaceSet }).fonts.ready;
      }

      return true;
    });

    // Use JPEG with 80% quality to keep file sizes manageable for DOCX
    const buffer = await page.locator('#export-page').screenshot({
      type: 'jpeg',
      quality: 80,
    });
    return `data:image/jpeg;base64,${buffer.toString('base64')}`;
  } finally {
    try {
      await page.close();
    } catch {
      // page already closed — ignore
    }
  }
}

async function renderHtmlToImageDataUrl(input: {
  html: string;
  width: number;
  height: number;
}) {
  return withRenderSlot(async () => {
    try {
      return await renderOnce(input);
    } catch (error) {
      if (isBrowserClosedError(error)) {
        console.warn('[export/render] browser closed, relaunching and retrying once');
        playwrightBrowserPromise = null;
        try {
          return await renderOnce(input);
        } catch (retryError) {
          console.error(
            '[export/render] html to jpeg failed after retry',
            serializeError(retryError),
          );
          return null;
        }
      }
      console.error('[export/render] html to jpeg failed', serializeError(error));
      return null;
    }
  });
}

async function loadEmbeddedFontFaceCss() {
  if (!embeddedFontFaceCssPromise) {
    embeddedFontFaceCssPromise = (async () => {
      const [regular, bold, italic, boldItalic] = await Promise.all([
        readFile(EMBEDDED_FONT_FILES.regular),
        readFile(EMBEDDED_FONT_FILES.bold),
        readFile(EMBEDDED_FONT_FILES.italic),
        readFile(EMBEDDED_FONT_FILES.boldItalic),
      ]);

      return `
        @font-face {
          font-family: '${EMBEDDED_BODY_FONT_FAMILY}';
          src: url(data:font/ttf;base64,${regular.toString('base64')}) format('truetype');
          font-style: normal;
          font-weight: 400;
        }
        @font-face {
          font-family: '${EMBEDDED_BODY_FONT_FAMILY}';
          src: url(data:font/ttf;base64,${bold.toString('base64')}) format('truetype');
          font-style: normal;
          font-weight: 700;
        }
        @font-face {
          font-family: '${EMBEDDED_BODY_FONT_FAMILY}';
          src: url(data:font/ttf;base64,${italic.toString('base64')}) format('truetype');
          font-style: italic;
          font-weight: 400;
        }
        @font-face {
          font-family: '${EMBEDDED_BODY_FONT_FAMILY}';
          src: url(data:font/ttf;base64,${boldItalic.toString('base64')}) format('truetype');
          font-style: italic;
          font-weight: 700;
        }
      `;
    })();
  }

  return embeddedFontFaceCssPromise;
}

function renderBodyTextBlock({
  text,
  x,
  y,
  width,
  fontSize,
  lineHeight,
  fill,
  fontWeight = 400,
  fontStyle = 'normal',
}: {
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  lineHeight: number;
  fill: string;
  fontWeight?: number;
  fontStyle?: 'normal' | 'italic';
}) {
  const lines = wrapText(text, width, fontSize, 0);
  const lineAdvance = fontSize * lineHeight;

  return {
    markup: `
      <text
        x="${x}"
        y="${y + fontSize * 0.85}"
        fill="${fill}"
        font-family="${EMBEDDED_BODY_FONT_FAMILY}"
        font-size="${fontSize}"
        font-weight="${fontWeight}"
        font-style="${fontStyle}"
        text-anchor="start"
      >
        ${lines
          .map(
            (line, index) =>
              `<tspan x="${x}" dy="${index === 0 ? 0 : lineAdvance}">${escapeXml(line)}</tspan>`,
          )
          .join('')}
      </text>
    `,
    height: Math.max(1, lines.length) * lineAdvance,
  };
}

async function buildCoverFallbackSvg(project: ProjectRecord) {
  const surface = normalizeCoverSurface(project);
  const backgroundImage = await fetchImageAsDataUrl(project.cover.backgroundImageUrl);
  const titleLayer = findSurfaceTextLayer(surface.layers, 'title');
  const subtitleLayer = findSurfaceTextLayer(surface.layers, 'subtitle');
  const authorLayer = findSurfaceTextLayer(surface.layers, 'author');
  const palette = project.cover.palette;
  const colors = COVER_TEXT_COLORS[palette];
  const fontFaceCss = await loadEmbeddedFontFaceCss();

  const title = surface.fields.title?.value || project.cover.title || project.document.title || 'Proyecto sin título';
  const subtitle = surface.fields.subtitle?.visible ? surface.fields.subtitle.value : '';
  const author = surface.fields.author?.visible ? surface.fields.author.value : '';
  const opacity = surface.opacity ?? 0.4;

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

  return buildSvgShell({
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    background: COVER_GRADIENTS[palette],
    backgroundImage,
    overlayOpacity: opacity,
    accentColor: palette === 'sand' ? '#0b313f' : '#d4af37',
    children,
    fontFaceCss,
  });
}

async function buildBackCoverFallbackSvg(project: ProjectRecord) {
  const surface = normalizeBackCoverSurface(project);
  const backgroundImage = await fetchImageAsDataUrl(project.backCover.backgroundImageUrl);
  const titleLayer = findSurfaceTextLayer(surface.layers, 'title');
  const bodyLayer = findSurfaceTextLayer(surface.layers, 'body');
  const authorBioLayer = findSurfaceTextLayer(surface.layers, 'authorBio');
  const fontFaceCss = await loadEmbeddedFontFaceCss();

  const title = surface.fields.title?.visible ? surface.fields.title.value : '';
  const body = surface.fields.body?.visible ? surface.fields.body.value : '';
  const authorBio = surface.fields.authorBio?.visible ? surface.fields.authorBio.value : '';
  const opacity = surface.opacity ?? 0.24;
  const defaultTextColor = project.backCover.accentColor || '#f2e3b3';
  const secondaryTextColor = 'rgba(242,227,179,0.78)';

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
          fallbackColor: defaultTextColor,
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
          fallbackColor: defaultTextColor,
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
          fallbackColor: secondaryTextColor,
        })
      : '',
  ].join('');

  return buildSvgShell({
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    background: BACK_COVER_BACKGROUND,
    backgroundImage,
    overlayOpacity: opacity,
    children,
    fontFaceCss,
  });
}

function toPercent(value: number | undefined, base: number, fallback: number) {
  return `${(((typeof value === 'number' ? value : fallback) / base) * 100).toFixed(4)}%`;
}

function renderCoverPreviewHtml(project: ProjectRecord) {
  const surface = normalizeCoverSurface(project);
  const palette = project.cover.palette;
  const colors = COVER_TEXT_COLORS[palette];
  const title = surface.fields.title?.value || project.cover.title || project.document.title || 'Proyecto sin título';
  const subtitle = surface.fields.subtitle?.visible ? surface.fields.subtitle.value : '';
  const author = surface.fields.author?.visible ? surface.fields.author.value : '';
  const opacity = surface.opacity ?? 0.4;
  const titleLayer = findSurfaceTextLayer(surface.layers, 'title');
  const subtitleLayer = findSurfaceTextLayer(surface.layers, 'subtitle');
  const authorLayer = findSurfaceTextLayer(surface.layers, 'author');

  const titleTop = toPercent(titleLayer?.top, CANVAS_HEIGHT, COVER_TEXT_LAYOUT.titleTop * CANVAS_HEIGHT);
  const subtitleTop = toPercent(subtitleLayer?.top, CANVAS_HEIGHT, COVER_TEXT_LAYOUT.subtitleTop * CANVAS_HEIGHT);
  const authorTop = toPercent(authorLayer?.top, CANVAS_HEIGHT, COVER_TEXT_LAYOUT.authorTop * CANVAS_HEIGHT);
  const titleLeft = toPercent(titleLayer?.left, CANVAS_WIDTH, CANVAS_WIDTH / 2);
  const subtitleLeft = toPercent(subtitleLayer?.left, CANVAS_WIDTH, CANVAS_WIDTH / 2);
  const authorLeft = toPercent(authorLayer?.left, CANVAS_WIDTH, CANVAS_WIDTH / 2);
  
  // Front cover defaults to centering (-50%) if originX is not 'left'
  const buildCoverTranslateX = (originX: string | undefined) => (originX === 'left' ? '0' : '-50%');
  const titleTranslateX = buildCoverTranslateX(titleLayer?.originX);
  const subtitleTranslateX = buildCoverTranslateX(subtitleLayer?.originX);
  const authorTranslateX = buildCoverTranslateX(authorLayer?.originX);
  const titleTextAlign = titleLayer?.textAlign ?? 'center';
  const subtitleTextAlign = subtitleLayer?.textAlign ?? 'center';
  const authorTextAlign = authorLayer?.textAlign ?? 'center';

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=${EXPORT_PAGE_WIDTH}, initial-scale=1" />
      ${collectGoogleFontLinks([titleLayer?.fontFamily, subtitleLayer?.fontFamily, authorLayer?.fontFamily])}
      <style>
        html, body { margin: 0; padding: 0; width: ${EXPORT_PAGE_WIDTH}px; height: ${EXPORT_PAGE_HEIGHT}px; overflow: hidden; background: transparent; }
        * { box-sizing: border-box; }
        #export-page {
          position: relative;
          width: ${EXPORT_PAGE_WIDTH}px;
          height: ${EXPORT_PAGE_HEIGHT}px;
          overflow: hidden;
          background: ${COVER_GRADIENTS[palette]};
          font-family: "DM Sans", system-ui, sans-serif;
        }
        #export-page img.cover-bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: ${opacity};
        }
        #export-page .cover-text {
          position: absolute;
          transform: translateY(-50%);
          margin: 0;
          text-wrap: balance;
        }
      </style>
    </head>
    <body>
      <div id="export-page">
        ${project.cover.backgroundImageUrl ? `<img class="cover-bg" src="${escapeHtml(project.cover.backgroundImageUrl)}" alt="" />` : ''}
        <div style="position:absolute;top:0;left:0;right:0;height:4px;background:${palette === 'sand' ? '#0b313f' : '#d4af37'}"></div>
        <h1
          class="cover-text"
          style="top:${titleTop};left:${titleLeft};transform:translate(${titleTranslateX}, -50%);width:${((titleLayer?.width ?? (COVER_TEXT_LAYOUT.titleWidth * 400)) / 400) * 100}%;color:${titleLayer?.fill ?? colors.primary};line-height:${titleLayer?.lineHeight ?? COVER_TEXT_LAYOUT.titleLineHeight};font-size:${titleLayer?.fontSize ?? COVER_TEXT_LAYOUT.titleFontSize}px;font-family:${titleLayer?.fontFamily ? `'${escapeHtml(titleLayer.fontFamily)}', "DM Sans", sans-serif` : `"DM Sans", sans-serif`};font-weight:${titleLayer?.fontWeight ?? 900};font-style:${titleLayer?.fontStyle ?? 'normal'};letter-spacing:${fabricCharSpacingToCss(titleLayer?.charSpacing, titleLayer?.fontSize ?? COVER_TEXT_LAYOUT.titleFontSize)};opacity:${titleLayer?.opacity ?? 1};text-align:${titleTextAlign};"
        >${escapeHtml(title)}</h1>
        ${subtitle ? `<p class="cover-text" style="top:${subtitleTop};left:${subtitleLeft};transform:translate(${subtitleTranslateX}, -50%);width:${((subtitleLayer?.width ?? (COVER_TEXT_LAYOUT.subtitleWidth * 400)) / 400) * 100}%;color:${subtitleLayer?.fill ?? colors.secondary};font-size:${subtitleLayer?.fontSize ?? COVER_TEXT_LAYOUT.subtitleFontSize}px;line-height:${subtitleLayer?.lineHeight ?? 1.45};font-family:${subtitleLayer?.fontFamily ? `'${escapeHtml(subtitleLayer.fontFamily)}', "DM Sans", sans-serif` : `"DM Sans", sans-serif`};font-weight:${subtitleLayer?.fontWeight ?? 500};font-style:${subtitleLayer?.fontStyle ?? 'normal'};letter-spacing:${fabricCharSpacingToCss(subtitleLayer?.charSpacing, subtitleLayer?.fontSize ?? COVER_TEXT_LAYOUT.subtitleFontSize)};opacity:${subtitleLayer?.opacity ?? 1};text-align:${subtitleTextAlign};">${escapeHtml(subtitle)}</p>` : ''}
        ${author ? `<p class="cover-text" style="top:${authorTop};left:${authorLeft};transform:translate(${authorTranslateX}, -50%);width:${((authorLayer?.width ?? (COVER_TEXT_LAYOUT.authorWidth * 400)) / 400) * 100}%;color:${authorLayer?.fill ?? colors.primary};font-size:${authorLayer?.fontSize ?? COVER_TEXT_LAYOUT.authorFontSize}px;line-height:${authorLayer?.lineHeight ?? COVER_TEXT_LAYOUT.titleLineHeight};font-family:${authorLayer?.fontFamily ? `'${escapeHtml(authorLayer.fontFamily)}', "DM Sans", sans-serif` : `"DM Sans", sans-serif`};font-weight:${authorLayer?.fontWeight ?? 500};font-style:${authorLayer?.fontStyle ?? 'normal'};letter-spacing:${fabricCharSpacingToCss(authorLayer?.charSpacing, authorLayer?.fontSize ?? COVER_TEXT_LAYOUT.authorFontSize)};opacity:${authorLayer?.opacity ?? 1};text-align:${authorTextAlign};text-transform:uppercase;">${escapeHtml(author)}</p>` : ''}
      </div>
    </body>
  </html>`;
}

function renderBackCoverPreviewHtml(project: ProjectRecord) {
  const surface = normalizeBackCoverSurface(project);
  const title = surface.fields.title?.visible ? surface.fields.title.value : '';
  const body = surface.fields.body?.visible ? surface.fields.body.value : '';
  const authorBio = surface.fields.authorBio?.visible ? surface.fields.authorBio.value : '';
  const opacity = surface.opacity ?? 0.24;
  const defaultTextColor = project.backCover.accentColor || '#f2e3b3';
  const secondaryTextColor = 'rgba(242,227,179,0.78)';
  const titleLayer = findSurfaceTextLayer(surface.layers, 'title');
  const bodyLayer = findSurfaceTextLayer(surface.layers, 'body');
  const authorBioLayer = findSurfaceTextLayer(surface.layers, 'authorBio');
  const titleTop = toPercent(titleLayer?.top, CANVAS_HEIGHT, BACK_COVER_TEXT_LAYOUT.titleTop * CANVAS_HEIGHT);
  const bodyTop = toPercent(bodyLayer?.top, CANVAS_HEIGHT, BACK_COVER_TEXT_LAYOUT.bodyTop * CANVAS_HEIGHT);
  const authorBioTop = toPercent(authorBioLayer?.top, CANVAS_HEIGHT, BACK_COVER_TEXT_LAYOUT.authorBioTop * CANVAS_HEIGHT);
  const titleLeft = toPercent(titleLayer?.left, CANVAS_WIDTH, BACK_COVER_TEXT_LAYOUT.titleLeft * CANVAS_WIDTH);
  const bodyLeft = toPercent(bodyLayer?.left, CANVAS_WIDTH, BACK_COVER_TEXT_LAYOUT.bodyLeft * CANVAS_WIDTH);
  const authorBioLeft = toPercent(authorBioLayer?.left, CANVAS_WIDTH, BACK_COVER_TEXT_LAYOUT.authorBioLeft * CANVAS_WIDTH);
  const buildTranslateX = (originX: string | undefined) => (originX === 'center' ? '-50%' : '0');

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=${EXPORT_PAGE_WIDTH}, initial-scale=1" />
      ${collectGoogleFontLinks([titleLayer?.fontFamily, bodyLayer?.fontFamily, authorBioLayer?.fontFamily])}
      <style>
        html, body { margin: 0; padding: 0; width: ${EXPORT_PAGE_WIDTH}px; height: ${EXPORT_PAGE_HEIGHT}px; overflow: hidden; background: transparent; }
        * { box-sizing: border-box; }
        #export-page {
          position: relative;
          width: ${EXPORT_PAGE_WIDTH}px;
          height: ${EXPORT_PAGE_HEIGHT}px;
          overflow: hidden;
          background: ${BACK_COVER_BACKGROUND};
          font-family: "DM Sans", system-ui, sans-serif;
        }
        #export-page img.back-bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: ${opacity};
        }
        #export-page .back-text {
          position: absolute;
          transform: translateY(-50%);
          margin: 0;
        }
      </style>
    </head>
    <body>
      <div id="export-page">
        ${project.backCover.backgroundImageUrl ? `<img class="back-bg" src="${escapeHtml(project.backCover.backgroundImageUrl)}" alt="" />` : ''}
        ${title ? `<p class="back-text" style="top:${titleTop};left:${titleLeft};transform:translate(${buildTranslateX(titleLayer?.originX)}, -50%);width:${((titleLayer?.width ?? (BACK_COVER_TEXT_LAYOUT.titleWidth * CANVAS_WIDTH)) / CANVAS_WIDTH) * 100}%;color:${titleLayer?.fill ?? defaultTextColor};line-height:${titleLayer?.lineHeight ?? BACK_COVER_TEXT_LAYOUT.titleLineHeight};font-size:${titleLayer?.fontSize ?? BACK_COVER_TEXT_LAYOUT.titleFontSize}px;font-family:${titleLayer?.fontFamily ? `'${escapeHtml(titleLayer.fontFamily)}', "DM Sans", sans-serif` : `"DM Sans", sans-serif`};font-weight:${titleLayer?.fontWeight ?? 900};font-style:${titleLayer?.fontStyle ?? 'normal'};letter-spacing:${fabricCharSpacingToCss(titleLayer?.charSpacing, titleLayer?.fontSize ?? BACK_COVER_TEXT_LAYOUT.titleFontSize)};opacity:${titleLayer?.opacity ?? 1};text-align:${titleLayer?.textAlign ?? 'left'};">${escapeHtml(title)}</p>` : ''}
        ${body ? `<p class="back-text" style="top:${bodyTop};left:${bodyLeft};transform:translate(${buildTranslateX(bodyLayer?.originX)}, -50%);width:${((bodyLayer?.width ?? (BACK_COVER_TEXT_LAYOUT.bodyWidth * CANVAS_WIDTH)) / CANVAS_WIDTH) * 100}%;color:${bodyLayer?.fill ?? defaultTextColor};line-height:${bodyLayer?.lineHeight ?? BACK_COVER_TEXT_LAYOUT.bodyLineHeight};font-size:${bodyLayer?.fontSize ?? BACK_COVER_TEXT_LAYOUT.bodyFontSize}px;font-family:${bodyLayer?.fontFamily ? `'${escapeHtml(bodyLayer.fontFamily)}', "DM Sans", sans-serif` : `"DM Sans", sans-serif`};font-weight:${bodyLayer?.fontWeight ?? 500};font-style:${bodyLayer?.fontStyle ?? 'normal'};letter-spacing:${fabricCharSpacingToCss(bodyLayer?.charSpacing, bodyLayer?.fontSize ?? BACK_COVER_TEXT_LAYOUT.bodyFontSize)};opacity:${bodyLayer?.opacity ?? 1};text-align:${bodyLayer?.textAlign ?? 'left'};white-space:pre-wrap;">${escapeHtml(body)}</p>` : ''}
        ${authorBio ? `<p class="back-text" style="top:${authorBioTop};left:${authorBioLeft};transform:translate(${buildTranslateX(authorBioLayer?.originX)}, -50%);width:${((authorBioLayer?.width ?? (BACK_COVER_TEXT_LAYOUT.authorBioWidth * CANVAS_WIDTH)) / CANVAS_WIDTH) * 100}%;color:${authorBioLayer?.fill ?? secondaryTextColor};line-height:${authorBioLayer?.lineHeight ?? BACK_COVER_TEXT_LAYOUT.authorBioLineHeight};font-size:${authorBioLayer?.fontSize ?? BACK_COVER_TEXT_LAYOUT.authorBioFontSize}px;font-family:${authorBioLayer?.fontFamily ? `'${escapeHtml(authorBioLayer.fontFamily)}', "DM Sans", sans-serif` : `"DM Sans", sans-serif`};font-weight:${authorBioLayer?.fontWeight ?? 400};font-style:${authorBioLayer?.fontStyle ?? 'normal'};letter-spacing:${fabricCharSpacingToCss(authorBioLayer?.charSpacing, authorBioLayer?.fontSize ?? BACK_COVER_TEXT_LAYOUT.authorBioFontSize)};opacity:${authorBioLayer?.opacity ?? 1};text-align:${authorBioLayer?.textAlign ?? 'left'};white-space:pre-wrap;">${escapeHtml(authorBio)}</p>` : ''}
      </div>
    </body>
  </html>`;
}

async function renderContentPreviewHtml(page: PreviewPage, config: PaginationConfig) {
  const googleFonts = [
    'JetBrains+Mono:wght@400;500;600;700;800',
    'DM+Sans:wght@400;500;700;800;900'
  ];

  // Inline the embedded font so the serverless Chromium (which ships without
  // system fonts) can always paint Latin glyphs even if Google Fonts is
  // unreachable. Without this, screenshots render as "tofu" rectangles.
  const embeddedFontFaceCss = await loadEmbeddedFontFaceCss();

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=${config.pageWidth}, initial-scale=1" />
      ${googleFonts.map(f => `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${f}&display=swap" />`).join('\n')}
      <style>
        ${embeddedFontFaceCss}
        :root {
          --text-primary: #0C1820;
          --text-secondary: #3A5068;
          --text-muted: #7898B0;
          --preview-paper: #FFFFFF;
          --preview-paper-border: rgba(12, 24, 32, 0.10);
          --preview-quote-bg: #E8F0F8;
          --preview-quote-border: #3A88BE;
        }
        html, body { margin: 0; padding: 0; width: ${config.pageWidth}px; height: ${config.pageHeight}px; overflow: hidden; background: white; }
        * { box-sizing: border-box; }
        #export-page {
          width: ${config.pageWidth}px;
          height: ${config.pageHeight}px;
          overflow: hidden;
          background: var(--preview-paper);
          border: 1px solid transparent;
          color: var(--text-primary);
          font-family: "JetBrains Mono", "DM Sans", "${EMBEDDED_BODY_FONT_FAMILY}", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: ${config.fontSize}px;
          line-height: ${config.lineHeight};
          padding: ${config.marginTop}px ${config.marginRight}px ${config.marginBottom}px ${config.marginLeft}px;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        /* Contenedor principal: replica exacta del editor */
        .ProseMirror {
          font-variant-numeric: tabular-nums !important;
          font-family: "JetBrains Mono", "${EMBEDDED_BODY_FONT_FAMILY}", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace !important;
        }

        .ProseMirror p,
        .ProseMirror li,
        .ProseMirror h1,
        .ProseMirror h2,
        .ProseMirror h3,
        .ProseMirror h4,
        .ProseMirror h5,
        .ProseMirror h6 {
          font-family: "JetBrains Mono", "${EMBEDDED_BODY_FONT_FAMILY}", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace !important;
          font-variant-numeric: tabular-nums;
        }

        .ProseMirror img {
          max-width: 100%;
          height: auto;
          object-fit: cover;
        }
        .ProseMirror p {
          margin: 0;
          overflow-wrap: break-word;
          word-break: break-word;
          line-height: ${config.lineHeight};
        }
        .ProseMirror p + p {
          margin-top: 0.8rem;
        }
        .ProseMirror h1 {
          font-size: 2rem;
          line-height: 1.1;
          font-weight: 800;
          margin: 0 0 1rem 0;
          color: var(--text-primary);
        }
        .ProseMirror h2 {
          font-size: 1.5rem;
          line-height: 1.2;
          font-weight: 750;
          margin: 0 0 0.85rem 0;
          color: var(--text-primary);
        }
        .ProseMirror h3 {
          font-size: 1.2rem;
          line-height: 1.3;
          font-weight: 700;
          margin: 0 0 0.75rem 0;
          color: var(--text-primary);
        }
        .ProseMirror h4 {
          font-size: 1.05rem;
          line-height: 1.35;
          font-weight: 700;
          margin: 0 0 0.65rem 0;
          color: var(--text-primary);
        }
        .ProseMirror h5,
        .ProseMirror h6 {
          font-size: 0.95rem;
          line-height: 1.4;
          font-weight: 700;
          margin: 0 0 0.6rem 0;
          color: var(--text-primary);
        }

        .ProseMirror ul,
        .ProseMirror ol {
          margin: 0 0 1rem 1.5rem;
          padding: 0;
        }
        .ProseMirror ul:not([data-bullet-style]) { list-style-type: disc; }
        .ProseMirror ol:not([data-list-style]) { list-style-type: decimal; }
        .ProseMirror li { margin: 0.35rem 0; }

        /* Estilos de viñetas especiales */
        .ProseMirror ul[data-bullet-style="diamond"] > li::before { content: "◆"; }
        .ProseMirror ul[data-bullet-style="arrow"] > li::before { content: "➤"; }
        .ProseMirror ul[data-bullet-style="check"] > li::before { content: "✓"; }
        
        .ProseMirror ul[data-bullet-style="diamond"] > li,
        .ProseMirror ul[data-bullet-style="arrow"] > li,
        .ProseMirror ul[data-bullet-style="check"] > li {
          position: relative;
          padding-left: 1.5rem;
          list-style: none;
        }
        .ProseMirror ul[data-bullet-style="diamond"] > li::before,
        .ProseMirror ul[data-bullet-style="arrow"] > li::before,
        .ProseMirror ul[data-bullet-style="check"] > li::before {
          position: absolute;
          left: 0;
          font-weight: 700;
        }

        .ProseMirror blockquote {
          margin: 1rem 0;
          padding: 0.25rem 0 0.25rem 1rem;
          border-left: 4px solid var(--preview-quote-border);
          background: transparent;
          color: var(--text-secondary);
        }
        
        /* ÍNDICE: Estilos críticos para paridad total */
        .ProseMirror ul.toc-list {
          margin: 0 !important;
          padding: 0 !important;
          list-style: none !important;
        }

        .ProseMirror ul.toc-list > li {
          margin: 0 !important;
          padding: 0 !important;
        }

        /* Entrada de índice: flexbox con leader */
        [data-toc-entry="true"] {
          display: flex !important;
          align-items: baseline !important;
          gap: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          white-space: nowrap !important;
          list-style: none !important;
          line-height: 1.5 !important;
          font-family: "JetBrains Mono", "${EMBEDDED_BODY_FONT_FAMILY}", ui-monospace, monospace !important;
        }

        [data-toc-entry="true"][data-toc-page]::before {
          content: "······································································································" !important;
          order: 1 !important;
          flex: 1 1 auto !important;
          overflow: hidden !important;
          margin: 0 0.35em !important;
          letter-spacing: 0.15em !important;
          color: inherit !important;
          white-space: nowrap !important;
          font-variant-numeric: tabular-nums !important;
        }

        [data-toc-entry="true"][data-toc-page]::after {
          content: attr(data-toc-page) !important;
          order: 2 !important;
          flex: 0 0 auto !important;
          font-variant-numeric: tabular-nums !important;
          min-width: 1.5em !important;
          text-align: right !important;
        }

        .ProseMirror hr[data-page-break] { display: none; }
      </style>
    </head>
    <body>
      <div id="export-page" class="ProseMirror">${page.content ?? ''}</div>
    </body>
  </html>`;
}

function renderContentBlocksSvg(blocks: ParsedContentBlock[], config: PaginationConfig) {
  const contentX = config.marginLeft;
  const contentWidth = config.pageWidth - config.marginLeft - config.marginRight;
  let cursorY = config.marginTop;
  const chunks: string[] = [];

  for (const block of blocks) {
    if (block.type === 'heading') {
      const index = Math.min(Math.max(block.level, 1), 6) - 1;
      const scales = [2, 1.5, 1.2, 1.05, 0.95, 0.95];
      const lineHeights = [1.1, 1.2, 1.3, 1.35, 1.4, 1.4];
      const margins = [16, 14, 12, 10, 9, 9];
      const result = renderBodyTextBlock({
        text: block.text,
        x: contentX,
        y: cursorY,
        width: contentWidth,
        fontSize: config.fontSize * scales[index],
        lineHeight: lineHeights[index],
        fill: PREVIEW_TEXT_PRIMARY,
        fontWeight: block.level <= 2 ? 800 : 700,
      });
      chunks.push(result.markup);
      cursorY += result.height + margins[index];
      continue;
    }

    if (block.type === 'quote') {
      const result = renderBodyTextBlock({
        text: block.text,
        x: contentX + 16,
        y: cursorY,
        width: contentWidth - 16,
        fontSize: config.fontSize,
        lineHeight: 1.6,
        fill: PREVIEW_TEXT_TERTIARY,
        fontStyle: 'italic',
      });
      chunks.push(
        `<rect x="${contentX}" y="${cursorY + 4}" width="4" height="${Math.max(result.height, config.fontSize * 1.6)}" fill="${PREVIEW_QUOTE_BORDER}" rx="2" ry="2" />`,
      );
      chunks.push(result.markup);
      cursorY += result.height + 20;
      continue;
    }

    const isListItem = block.type === 'list-item';
    const result = renderBodyTextBlock({
      text: isListItem ? `• ${block.text}` : block.text,
      x: contentX + (isListItem ? 14 : 0),
      y: cursorY,
      width: contentWidth - (isListItem ? 14 : 0),
      fontSize: config.fontSize,
      lineHeight: config.lineHeight,
      fill: PREVIEW_TEXT_PRIMARY,
    });
    chunks.push(result.markup);
    cursorY += result.height + (isListItem ? 6 : 10);
  }

  return chunks.join('');
}

function buildSvgShell({
  width,
  height,
  background,
  backgroundImage,
  overlayOpacity,
  children,
  accentColor,
  fontFaceCss,
}: {
  width: number;
  height: number;
  background: string;
  backgroundImage?: string | null;
  overlayOpacity: number;
  children: string;
  accentColor?: string | null;
  fontFaceCss?: string;
}) {
  const gradientId = `gradient-${Math.random().toString(36).slice(2, 8)}`;
  const usesGradient = background.includes('gradient');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        ${
          fontFaceCss
            ? `<style><![CDATA[
              ${fontFaceCss}
            ]]></style>`
            : ''
        }
        ${
          usesGradient
            ? `
        <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="55%" y2="100%">
          <stop offset="0%" stop-color="${background.includes('#0b133f') ? '#0b133f' : '#f2e3b3'}" />
          <stop offset="50%" stop-color="${background.includes('#124a50') ? '#0b313f' : background.includes('#f2e3b3') ? '#e7d4a0' : '#0b233f'}" />
          <stop offset="100%" stop-color="${background.includes('#124a50') ? '#07252f' : background.includes('#f2e3b3') ? '#d4af37' : '#07252f'}" />
        </linearGradient>`
            : ''
        }
      </defs>
      <rect width="100%" height="100%" fill="${usesGradient ? `url(#${gradientId})` : background}" />
      ${
        backgroundImage
          ? `<image href="${backgroundImage}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice" opacity="${overlayOpacity}" />`
          : ''
      }
      ${
        backgroundImage && overlayOpacity > 0
          ? `<rect x="0" y="0" width="${width}" height="${height}" fill="rgba(7,12,20,0.18)" />`
          : ''
      }
      ${
        accentColor
          ? `<rect x="0" y="0" width="${width}" height="4" fill="${accentColor}" />`
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

  const browserRendered = await renderHtmlToImageDataUrl({
    html: renderCoverPreviewHtml(project),
    width: EXPORT_PAGE_WIDTH,
    height: EXPORT_PAGE_HEIGHT,
  });
  if (browserRendered) {
    return browserRendered;
  }
  try {
    return await rasterizeSvg(await buildCoverFallbackSvg(project));
  } catch {
    return project.cover.renderedImageUrl?.trim() || null;
  }
}

export async function buildBackCoverExportImageDataUrl(project: ProjectRecord) {
  if (project.backCover.renderedImageUrl?.trim()) {
    return project.backCover.renderedImageUrl;
  }

  const browserRendered = await renderHtmlToImageDataUrl({
    html: renderBackCoverPreviewHtml(project),
    width: EXPORT_PAGE_WIDTH,
    height: EXPORT_PAGE_HEIGHT,
  });
  if (browserRendered) {
    return browserRendered;
  }
  try {
    return await rasterizeSvg(await buildBackCoverFallbackSvg(project));
  } catch {
    return project.backCover.renderedImageUrl?.trim() || null;
  }
}

export async function buildContentPageExportImageDataUrl(
  page: PreviewPage,
  config: PaginationConfig,
  options?: {
    allowSvgFallback?: boolean;
  },
) {
  if (page.type !== 'content' || !page.content?.trim()) {
    return null;
  }

  const browserRendered = await renderHtmlToImageDataUrl({
    html: await renderContentPreviewHtml(page, config),
    width: config.pageWidth,
    height: config.pageHeight,
  });
  if (browserRendered) {
    return browserRendered;
  }

  if (options?.allowSvgFallback === false) {
    return null;
  }

  const blocks = parsePageContent(page.content);
  if (blocks.length === 0) {
    return null;
  }

  const fontFaceCss = await loadEmbeddedFontFaceCss();
  const svg = buildSvgShell({
    width: config.pageWidth,
    height: config.pageHeight,
    background: PREVIEW_PAGE_BACKGROUND,
    overlayOpacity: 0,
    children: renderContentBlocksSvg(blocks, config),
    fontFaceCss,
  });

  return rasterizeSvg(svg);
}
