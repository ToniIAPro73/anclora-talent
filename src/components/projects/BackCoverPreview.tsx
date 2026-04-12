'use client';

import type { SurfaceState } from '@/lib/projects/cover-surface';
import { BACK_COVER_TEXT_LAYOUT } from '@/lib/projects/cover-layout';
import { fabricCharSpacingToCss, findSurfaceTextLayer } from '@/lib/projects/cover-layer-style';

const FALLBACK_BACKGROUND =
  'linear-gradient(160deg, #0b133f 0%, #0b233f 50%, #07252f 100%)';

export function BackCoverPreview({
  surface,
  backgroundImageUrl,
  eyebrow,
  accentColor,
}: {
  surface: SurfaceState;
  backgroundImageUrl?: string | null;
  eyebrow: string;
  accentColor?: string | null;
}) {
  const title = surface.fields.title?.visible ? surface.fields.title.value : '';
  const body = surface.fields.body?.visible ? surface.fields.body.value : '';
  const authorBio = surface.fields.authorBio?.visible ? surface.fields.authorBio.value : '';
  const opacity = surface.opacity ?? 0.24;
  const defaultTextColor = accentColor || '#f2e3b3';
  const secondaryTextColor = 'rgba(242,227,179,0.78)';
  const canvasWidth = 400;
  const canvasHeight = 600;

  const titleLayer = findSurfaceTextLayer(surface.layers, 'title');
  const bodyLayer = findSurfaceTextLayer(surface.layers, 'body');
  const authorBioLayer = findSurfaceTextLayer(surface.layers, 'authorBio');

  const toPercent = (value: number | undefined, base: number, fallback: number) =>
    `${(((typeof value === 'number' ? value : fallback) / base) * 100).toFixed(4)}%`;

  const titleTop = toPercent(titleLayer?.top, canvasHeight, BACK_COVER_TEXT_LAYOUT.titleTop * canvasHeight);
  const bodyTop = toPercent(bodyLayer?.top, canvasHeight, BACK_COVER_TEXT_LAYOUT.bodyTop * canvasHeight);
  const authorBioTop = toPercent(
    authorBioLayer?.top,
    canvasHeight,
    BACK_COVER_TEXT_LAYOUT.authorBioTop * canvasHeight,
  );
  const titleLeft = toPercent(titleLayer?.left, canvasWidth, BACK_COVER_TEXT_LAYOUT.titleLeft * canvasWidth);
  const bodyLeft = toPercent(bodyLayer?.left, canvasWidth, BACK_COVER_TEXT_LAYOUT.bodyLeft * canvasWidth);
  const authorBioLeft = toPercent(
    authorBioLayer?.left,
    canvasWidth,
    BACK_COVER_TEXT_LAYOUT.authorBioLeft * canvasWidth,
  );

  const buildTranslateX = (originX: string | undefined) => (originX === 'center' ? '-50%' : '0');

  return (
    <section className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">{eyebrow}</p>
      <div
        className="relative aspect-[2/3] w-full overflow-hidden rounded-[32px] border border-[var(--border-subtle)] shadow-[var(--shadow-strong)]"
        style={{ background: FALLBACK_BACKGROUND }}
      >
        {backgroundImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={backgroundImageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ opacity }}
          />
        ) : null}

        {title ? (
          <p
            className="absolute -translate-y-1/2 font-black"
            style={{
              top: titleTop,
              left: titleLeft,
              transform: `translate(${buildTranslateX(titleLayer?.originX)}, -50%)`,
              width: `${((titleLayer?.width ?? (BACK_COVER_TEXT_LAYOUT.titleWidth * canvasWidth)) / canvasWidth) * 100}%`,
              color: titleLayer?.fill ?? defaultTextColor,
              lineHeight: titleLayer?.lineHeight ?? BACK_COVER_TEXT_LAYOUT.titleLineHeight,
              fontSize: `${titleLayer?.fontSize ?? BACK_COVER_TEXT_LAYOUT.titleFontSize}px`,
              fontFamily: titleLayer?.fontFamily ?? undefined,
              fontWeight: titleLayer?.fontWeight ?? 900,
              fontStyle: titleLayer?.fontStyle ?? 'normal',
              letterSpacing: fabricCharSpacingToCss(
                titleLayer?.charSpacing,
                titleLayer?.fontSize ?? BACK_COVER_TEXT_LAYOUT.titleFontSize,
              ),
              opacity: titleLayer?.opacity ?? 1,
              textAlign: titleLayer?.textAlign ?? 'left',
            }}
            data-testid="back-cover-preview-title"
          >
            {title}
          </p>
        ) : null}

        {body ? (
          <p
            className="absolute -translate-y-1/2 font-medium"
            style={{
              top: bodyTop,
              left: bodyLeft,
              transform: `translate(${buildTranslateX(bodyLayer?.originX)}, -50%)`,
              width: `${((bodyLayer?.width ?? (BACK_COVER_TEXT_LAYOUT.bodyWidth * canvasWidth)) / canvasWidth) * 100}%`,
              color: bodyLayer?.fill ?? defaultTextColor,
              lineHeight: bodyLayer?.lineHeight ?? BACK_COVER_TEXT_LAYOUT.bodyLineHeight,
              fontSize: `${bodyLayer?.fontSize ?? BACK_COVER_TEXT_LAYOUT.bodyFontSize}px`,
              fontFamily: bodyLayer?.fontFamily ?? undefined,
              fontWeight: bodyLayer?.fontWeight ?? 500,
              fontStyle: bodyLayer?.fontStyle ?? 'normal',
              letterSpacing: fabricCharSpacingToCss(
                bodyLayer?.charSpacing,
                bodyLayer?.fontSize ?? BACK_COVER_TEXT_LAYOUT.bodyFontSize,
              ),
              opacity: bodyLayer?.opacity ?? 1,
              textAlign: bodyLayer?.textAlign ?? 'left',
              whiteSpace: 'pre-wrap',
            }}
            data-testid="back-cover-preview-body"
          >
            {body}
          </p>
        ) : null}

        {authorBio ? (
          <p
            className="absolute -translate-y-1/2"
            style={{
              top: authorBioTop,
              left: authorBioLeft,
              transform: `translate(${buildTranslateX(authorBioLayer?.originX)}, -50%)`,
              width: `${((authorBioLayer?.width ?? (BACK_COVER_TEXT_LAYOUT.authorBioWidth * canvasWidth)) / canvasWidth) * 100}%`,
              color: authorBioLayer?.fill ?? secondaryTextColor,
              lineHeight: authorBioLayer?.lineHeight ?? BACK_COVER_TEXT_LAYOUT.authorBioLineHeight,
              fontSize: `${authorBioLayer?.fontSize ?? BACK_COVER_TEXT_LAYOUT.authorBioFontSize}px`,
              fontFamily: authorBioLayer?.fontFamily ?? undefined,
              fontWeight: authorBioLayer?.fontWeight ?? 400,
              fontStyle: authorBioLayer?.fontStyle ?? 'normal',
              letterSpacing: fabricCharSpacingToCss(
                authorBioLayer?.charSpacing,
                authorBioLayer?.fontSize ?? BACK_COVER_TEXT_LAYOUT.authorBioFontSize,
              ),
              opacity: authorBioLayer?.opacity ?? 1,
              textAlign: authorBioLayer?.textAlign ?? 'left',
              whiteSpace: 'pre-wrap',
            }}
            data-testid="back-cover-preview-author-bio"
          >
            {authorBio}
          </p>
        ) : null}
      </div>
    </section>
  );
}
