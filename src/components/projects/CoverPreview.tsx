'use client';

import type { CoverDesign } from '@/lib/projects/types';

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
  title,
  subtitle,
  palette,
  backgroundImageUrl,
  projectTitle,
  eyebrow,
}: {
  title: string;
  subtitle: string;
  palette: CoverDesign['palette'];
  backgroundImageUrl?: string | null;
  projectTitle: string;
  eyebrow: string;
}) {
  const colors = previewText[palette];

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
            className="absolute inset-0 h-full w-full object-cover opacity-40" 
          />
        )}
        
        <div className="absolute inset-0 flex flex-col justify-center p-8 text-center">
          <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: colors.primary, opacity: 0.6 }}>
            {projectTitle || 'Anclora Talent'}
          </div>
          <h2 
            className="text-4xl font-black tracking-tight" 
            style={{ color: colors.primary, lineHeight: 1.1 }}
          >
            {title || 'Título del proyecto'}
          </h2>
          {subtitle && (
            <p 
              className="mt-4 text-sm font-medium leading-relaxed" 
              style={{ color: colors.secondary }}
            >
              {subtitle}
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
