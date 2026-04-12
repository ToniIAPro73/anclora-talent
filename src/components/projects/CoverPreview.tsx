'use client';

import type { CoverDesign } from '@/lib/projects/types';
import type { SurfaceState } from '@/lib/projects/cover-surface';

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
}: {
  surface: SurfaceState;
  palette: CoverDesign['palette'];
  backgroundImageUrl?: string | null;
  eyebrow: string;
}) {
  const colors = previewText[palette];
  const title = surface.fields.title?.value || 'Título del proyecto';
  const subtitle = surface.fields.subtitle?.visible ? surface.fields.subtitle.value : '';
  const author = surface.fields.author?.visible ? surface.fields.author.value : '';
  const opacity = surface.opacity ?? 0.4;

  return (
    <section className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">{eyebrow}</p>
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
            className="absolute left-1/2 w-[88%] -translate-x-1/2 -translate-y-1/2 text-4xl font-black tracking-tight"
            style={{ top: '28%', color: colors.primary, lineHeight: 1.1 }}
            data-testid="cover-preview-title"
          >
            {title}
          </h2>
          {subtitle && (
            <p
              className="absolute left-1/2 w-[82%] -translate-x-1/2 -translate-y-1/2 text-sm font-medium leading-relaxed"
              style={{ top: '50%', color: colors.secondary }}
              data-testid="cover-preview-subtitle"
            >
              {subtitle}
            </p>
          )}
          {author && (
            <p
              className="absolute left-1/2 w-[82%] -translate-x-1/2 -translate-y-1/2 text-xs font-bold uppercase tracking-[0.2em]"
              style={{ top: '72%', color: colors.primary }}
            >
              {author}
            </p>
          )}
        </div>

        {/* Accent bar simulation */}
        <div 
          className="absolute top-0 left-0 right-0 h-1" 
          style={{ background: palette === 'sand' ? '#0b313f' : '#d4af37' }} 
        />
      </div>
    </section>
  );
}
