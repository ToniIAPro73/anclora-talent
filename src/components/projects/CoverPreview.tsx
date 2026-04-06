'use client';

import type { CoverDesign } from '@/lib/projects/types';

const previewClasses: Record<CoverDesign['palette'], string> = {
  obsidian: 'from-[#0b133f] via-[#0b233f] to-[#07252f] text-[#f2e3b3]',
  teal: 'from-[#124a50] via-[#0b313f] to-[#07252f] text-[#f2e3b3]',
  sand: 'from-[#f2e3b3] via-[#e7d4a0] to-[#d4af37] text-[#0b313f]',
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
  return (
    <section className={`rounded-[32px] border border-[var(--border-subtle)] bg-gradient-to-br p-8 shadow-[var(--shadow-soft)] ${previewClasses[palette]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.28em] opacity-70">{eyebrow}</p>
      <div className="mt-8 overflow-hidden rounded-[28px] border border-white/15 bg-black/10 backdrop-blur">
        {backgroundImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={backgroundImageUrl} alt={title} className="h-72 w-full object-cover" />
        ) : (
          <div className="flex h-72 items-center justify-center bg-white/10 text-sm font-semibold uppercase tracking-[0.2em] opacity-70">
            No image
          </div>
        )}
        <div className="p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-60">{projectTitle}</p>
          <h2 className="mt-4 text-5xl font-black tracking-tight">{title || 'Título del proyecto'}</h2>
          <p className="mt-4 max-w-xl text-base leading-8 opacity-85">{subtitle}</p>
        </div>
      </div>
    </section>
  );
}
