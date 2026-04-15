'use client';

import type { CoverDesign } from '@/lib/projects/types';
import type { SurfaceState } from '@/lib/projects/cover-surface';
import { COVER_TEXT_LAYOUT } from '@/lib/projects/cover-layout';
import { fabricCharSpacingToCss, findSurfaceTextLayer } from '@/lib/projects/cover-layer-style';

const previewGradients: Record<CoverDesign['palette'], string> = {
  obsidian: 'linear-gradient(160deg, #0b133f 0%, #0b233f 50%, #07252f 100%)',
  teal: 'linear-gradient(160deg, #124a50 0%, #0b313f 50%, #07252f 100%)',
  sand: 'linear-gradient(160deg, #f2e3b3 0%, #e7d4a0 50%, #d4af37 100%)',
};

const previewText: Record<CoverDesign['palette'], { primary: string; secondary: string }> = {
  obsidian: { primary: '#f2e3b3', secondary: 'rgba(242,227,179,0.75)' },
  teal: { primary: '#f2e3b3', secondary: 'rgba(242,227,179,0.75)' },
  sand: { primary: '#0b313f', secondary: 'rgba(11,49,63,0.72)' },
};

export function CoverPreview({
  surface,
  palette,
  backgroundImageUrl,
  eyebrow,
  visualOnly = false,
}: {
  surface: SurfaceState;
  palette: CoverDesign['palette'];
  backgroundImageUrl?: string | null;
  eyebrow: string;
  visualOnly?: boolean;
}) {
  const colors = previewText[palette];
  const title = surface.fields.title?.value || 'Título del proyecto';
  const subtitle = surface.fields.subtitle?.visible ? surface.fields.subtitle.value : '';
  const author = surface.fields.author?.visible ? surface.fields.author.value : '';
  const opacity = surface.opacity ?? 0.4;
  const titleLayer = findSurfaceTextLayer(surface.layers, 'title');
  const subtitleLayer = findSurfaceTextLayer(surface.layers, 'subtitle');
  const authorLayer = findSurfaceTextLayer(surface.layers, 'author');
  const canvasWidth = 400;
  const canvasHeight = 600;

  const toPercent = (value: number | undefined, base: number, fallback: number) =>
    `${(((typeof value === 'number' ? value : fallback) / base) * 100).toFixed(4)}%`;

  const titleTop = toPercent(titleLayer?.top, canvasHeight, COVER_TEXT_LAYOUT.titleTop * canvasHeight);
  const subtitleTop = toPercent(subtitleLayer?.top, canvasHeight, COVER_TEXT_LAYOUT.subtitleTop * canvasHeight);
  const authorTop = toPercent(authorLayer?.top, canvasHeight, COVER_TEXT_LAYOUT.authorTop * canvasHeight);
  const titleLeft = toPercent(titleLayer?.left, canvasWidth, canvasWidth / 2);
  const subtitleLeft = toPercent(subtitleLayer?.left, canvasWidth, canvasWidth / 2);
  const authorLeft = toPercent(authorLayer?.left, canvasWidth, canvasWidth / 2);
  const titleTranslateX = titleLayer?.originX === 'left' ? '0' : '-50%';
  const subtitleTranslateX = subtitleLayer?.originX === 'left' ? '0' : '-50%';
  const authorTranslateX = authorLayer?.originX === 'left' ? '0' : '-50%';
  const titleTextAlign = titleLayer?.textAlign ?? 'center';
  const subtitleTextAlign = subtitleLayer?.textAlign ?? 'center';
  const authorTextAlign = authorLayer?.textAlign ?? 'center';

  const visual = (
    <div
      className="relative aspect-[2/3] w-full overflow-hidden rounded-[32px] border border-[var(--border-subtle)] shadow-[var(--shadow-strong)]"
      style={{ background: previewGradients[palette] }}
    >
      {backgroundImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={backgroundImageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity }}
        />
      )}

      <div className="absolute inset-0 p-10 text-center">
        <h2
          className="absolute -translate-y-1/2 font-black tracking-tight"
          style={{
            top: titleTop,
            left: titleLeft,
            transform: `translate(${titleTranslateX}, -50%)`,
            width: `${((titleLayer?.width ?? (COVER_TEXT_LAYOUT.titleWidth * 400)) / 400) * 100}%`,
            color: titleLayer?.fill ?? colors.primary,
            lineHeight: titleLayer?.lineHeight ?? COVER_TEXT_LAYOUT.titleLineHeight,
            fontSize: `${titleLayer?.fontSize ?? COVER_TEXT_LAYOUT.titleFontSize}px`,
            fontFamily: titleLayer?.fontFamily ?? undefined,
            fontWeight: titleLayer?.fontWeight ?? 900,
            fontStyle: titleLayer?.fontStyle ?? 'normal',
            letterSpacing: fabricCharSpacingToCss(titleLayer?.charSpacing, titleLayer?.fontSize ?? COVER_TEXT_LAYOUT.titleFontSize),
            opacity: titleLayer?.opacity ?? 1,
            textAlign: titleTextAlign,
          }}
          data-testid="cover-preview-title"
        >
          {title}
        </h2>
        {subtitle && (
          <p
            className="absolute -translate-y-1/2 font-medium"
            style={{
              top: subtitleTop,
              left: subtitleLeft,
              transform: `translate(${subtitleTranslateX}, -50%)`,
              width: `${((subtitleLayer?.width ?? (COVER_TEXT_LAYOUT.subtitleWidth * 400)) / 400) * 100}%`,
              color: subtitleLayer?.fill ?? colors.secondary,
              fontSize: `${subtitleLayer?.fontSize ?? COVER_TEXT_LAYOUT.subtitleFontSize}px`,
              lineHeight: subtitleLayer?.lineHeight ?? 1.45,
              fontFamily: subtitleLayer?.fontFamily ?? undefined,
              fontWeight: subtitleLayer?.fontWeight ?? 500,
              fontStyle: subtitleLayer?.fontStyle ?? 'normal',
              letterSpacing: fabricCharSpacingToCss(subtitleLayer?.charSpacing, subtitleLayer?.fontSize ?? COVER_TEXT_LAYOUT.subtitleFontSize),
              opacity: subtitleLayer?.opacity ?? 1,
              textAlign: subtitleTextAlign,
            }}
            data-testid="cover-preview-subtitle"
          >
            {subtitle}
          </p>
        )}
        {author && (
          <p
            className="absolute -translate-y-1/2 font-medium uppercase"
            style={{
              top: authorTop,
              left: authorLeft,
              transform: `translate(${authorTranslateX}, -50%)`,
              width: `${((authorLayer?.width ?? (COVER_TEXT_LAYOUT.authorWidth * 400)) / 400) * 100}%`,
              color: authorLayer?.fill ?? colors.primary,
              fontSize: `${authorLayer?.fontSize ?? COVER_TEXT_LAYOUT.authorFontSize}px`,
              lineHeight: authorLayer?.lineHeight ?? COVER_TEXT_LAYOUT.titleLineHeight,
              fontFamily: authorLayer?.fontFamily ?? undefined,
              fontWeight: authorLayer?.fontWeight ?? 500,
              fontStyle: authorLayer?.fontStyle ?? 'normal',
              letterSpacing: fabricCharSpacingToCss(authorLayer?.charSpacing, authorLayer?.fontSize ?? COVER_TEXT_LAYOUT.authorFontSize),
              opacity: authorLayer?.opacity ?? 1,
              textAlign: authorTextAlign,
            }}
          >
            {author}
          </p>
        )}
      </div>

      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: palette === 'sand' ? '#0b313f' : '#d4af37' }}
      />
    </div>
  );

  if (visualOnly) {
    return visual;
  }

  return (
    <section className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">{eyebrow}</p>
      {visual}
    </section>
  );
}
