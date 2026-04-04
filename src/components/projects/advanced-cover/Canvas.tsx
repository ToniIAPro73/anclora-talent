'use client';

import type { CoverDesign } from '@/lib/projects/types';

const paletteGradient: Record<CoverDesign['palette'], string> = {
  obsidian: 'linear-gradient(160deg, #0b133f 0%, #0b233f 50%, #07252f 100%)',
  teal: 'linear-gradient(160deg, #124a50 0%, #0b313f 50%, #07252f 100%)',
  sand: 'linear-gradient(160deg, #f2e3b3 0%, #e7d4a0 50%, #d4af37 100%)',
};

const paletteText: Record<CoverDesign['palette'], { primary: string; secondary: string }> = {
  obsidian: { primary: '#f2e3b3', secondary: 'rgba(242,227,179,0.75)' },
  teal: { primary: '#f2e3b3', secondary: 'rgba(242,227,179,0.75)' },
  sand: { primary: '#0b313f', secondary: 'rgba(11,49,63,0.72)' },
};

const fontFamilyMap: Record<string, string> = {
  sans: 'ui-sans-serif, system-ui, sans-serif',
  serif: 'ui-serif, Georgia, serif',
  mono: 'ui-monospace, monospace',
};

type Layout = NonNullable<CoverDesign['layout']>;

export function CoverCanvas({
  title,
  subtitle,
  palette,
  layout = 'centered',
  fontFamily,
  accentColor,
  backgroundImageUrl,
}: {
  title: string;
  subtitle: string;
  palette: CoverDesign['palette'];
  layout?: Layout;
  fontFamily?: string | null;
  accentColor?: string | null;
  backgroundImageUrl?: string | null;
}) {
  const colors = paletteText[palette];
  const font = fontFamily ? (fontFamilyMap[fontFamily] ?? fontFamilyMap.sans) : fontFamilyMap.sans;
  const accent = accentColor ?? (palette === 'sand' ? '#0b313f' : '#d4af37');

  const layoutStyles: Record<Layout, React.CSSProperties> = {
    centered: { justifyContent: 'center', textAlign: 'center', padding: '2rem' },
    top: { justifyContent: 'flex-start', textAlign: 'left', padding: '2.5rem 2rem 2rem' },
    bottom: { justifyContent: 'flex-end', textAlign: 'left', padding: '2rem 2rem 2.5rem' },
    split: { justifyContent: 'center', textAlign: 'left', padding: '2rem', flexDirection: 'row', alignItems: 'stretch' },
  };

  return (
    <div
      data-testid="cover-canvas"
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '2 / 3',
        borderRadius: '20px',
        overflow: 'hidden',
        background: paletteGradient[palette],
        fontFamily: font,
      }}
    >
      {/* Background image */}
      {backgroundImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={backgroundImageUrl}
          alt=""
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: layout === 'split' ? 1 : 0.3,
            ...(layout === 'split' ? { width: '50%' } : {}),
          }}
        />
      )}

      {/* Accent bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: accent,
        }}
      />

      {/* Text */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: layout === 'split' ? 'row' : 'column',
          ...layoutStyles[layout],
        }}
      >
        {layout === 'split' && <div style={{ flex: '0 0 50%' }} />}
        <div style={layout === 'split' ? { flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' } : {}}>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: accent,
              marginBottom: '12px',
            }}
          >
            Anclora Talent
          </div>
          <div
            style={{
              fontSize: 'clamp(18px, 6cqw, 28px)',
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              color: colors.primary,
              marginBottom: '12px',
            }}
          >
            {title || 'Título del proyecto'}
          </div>
          <div
            style={{
              fontSize: 'clamp(10px, 3cqw, 13px)',
              fontWeight: 500,
              lineHeight: 1.6,
              color: colors.secondary,
            }}
          >
            {subtitle || 'Subtítulo'}
          </div>
        </div>
      </div>
    </div>
  );
}
