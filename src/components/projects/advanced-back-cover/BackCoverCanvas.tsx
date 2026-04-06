'use client';

import { forwardRef } from 'react';

export const BackCoverCanvas = forwardRef<HTMLDivElement, {
  title: string;
  body: string;
  authorBio: string;
  accentColor?: string | null;
  backgroundImageUrl?: string | null;
  backgroundImageOpacity?: number;
}>(function BackCoverCanvas({
  title,
  body,
  authorBio,
  accentColor,
  backgroundImageUrl,
  backgroundImageOpacity = 0.25,
}, ref) {
  const accent = accentColor ?? '#d4af37';
  const textColor = '#f2e3b3';
  const secondaryColor = 'rgba(242,227,179,0.75)';

  return (
    <div
      ref={ref}
      data-testid="back-cover-canvas"
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '2 / 3',
        borderRadius: '20px',
        overflow: 'hidden',
        background: 'linear-gradient(160deg, #0b133f 0%, #0b233f 50%, #07252f 100%)',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
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
            opacity: backgroundImageOpacity,
          }}
        />
      )}

      {/* Content */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: '2rem',
          overflow: 'hidden',
        }}
      >
        {/* Top section - metadata eyebrow */}
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color: accent,
            margin: 0,
          }}>
            Anclora Talent
          </p>
        </div>

        {/* Middle section - scrollable body content */}
        <div style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}>
          <div style={{
            fontSize: 'clamp(13px, 3cqw, 16px)',
            lineHeight: 1.6,
            color: textColor,
            marginBottom: '1.5rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 6,
            WebkitBoxOrient: 'vertical',
          }}>
            {body || 'Contenido de la contraportada'}
          </div>

          {/* Author bio section with accent border */}
          {authorBio && (
            <div style={{
              borderLeft: `4px solid ${accent}`,
              paddingLeft: '1rem',
              fontSize: 'clamp(11px, 2.5cqw, 13px)',
              lineHeight: 1.6,
              color: secondaryColor,
            }}>
              {authorBio}
            </div>
          )}
        </div>

        {/* Bottom section - title with divider */}
        <div style={{
          marginTop: 'auto',
          paddingTop: '1.5rem',
        }}>
          <div style={{
            height: '1px',
            width: '64px',
            backgroundColor: accent,
            opacity: 0.4,
            marginBottom: '1rem',
          }} />
          <p style={{
            fontSize: 'clamp(16px, 5cqw, 22px)',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            color: textColor,
            margin: 0,
            lineHeight: 1.2,
          }}>
            {title || 'Título'}
          </p>
        </div>
      </div>
    </div>
  );
});

BackCoverCanvas.displayName = 'BackCoverCanvas';
