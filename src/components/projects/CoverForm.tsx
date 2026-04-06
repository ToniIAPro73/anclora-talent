'use client';

import { useRef, useState, useTransition } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { saveProjectCoverAction } from '@/lib/projects/actions';
import { resizeImage } from '@/lib/ui/images';
import type { ProjectRecord } from '@/lib/projects/types';
import { premiumPrimaryDarkButton } from '@/components/ui/button-styles';
import type { AppMessages } from '@/lib/i18n/messages';

const previewClasses = {
  obsidian: 'from-[#0b133f] via-[#0b233f] to-[#07252f] text-[#f2e3b3]',
  teal: 'from-[#124a50] via-[#0b313f] to-[#07252f] text-[#f2e3b3]',
  sand: 'from-[#f2e3b3] via-[#e7d4a0] to-[#d4af37] text-[#0b313f]',
};

export function CoverForm({ copy, project }: { copy: AppMessages['project']; project: ProjectRecord }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const file = formData.get('backgroundImage');

    if (file instanceof File && file.size > 4 * 1024 * 1024) {
      const compressed = await resizeImage(file);
      formData.set('backgroundImage', compressed, 'cover.jpg');
    }

    startTransition(async () => {
      await saveProjectCoverAction(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
      <input type="hidden" name="projectId" value={project.id} />
      <input type="hidden" name="currentBackgroundImageUrl" value={project.cover.backgroundImageUrl ?? ''} />
      <input type="hidden" name="currentThumbnailUrl" value={project.cover.thumbnailUrl ?? ''} />

      <section className="space-y-4 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-6 text-[var(--text-primary)] shadow-[var(--shadow-strong)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">{copy.coverFormEyebrow}</p>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.coverTitleLabel}</span>
          <input name="title" defaultValue={project.cover.title} className="w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-mint)]" />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.coverSubtitleLabel}</span>
          <textarea name="subtitle" defaultValue={project.cover.subtitle} className="min-h-28 w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-mint)]" />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.coverPaletteLabel}</span>
          <select name="palette" defaultValue={project.cover.palette} className="w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-mint)]">
            <option value="obsidian">{copy.paletteObsidian}</option>
            <option value="teal">{copy.paletteTeal}</option>
            <option value="sand">{copy.paletteSand}</option>
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.coverBackgroundLabel}</span>
          <input type="file" name="backgroundImage" accept="image/*" className="block w-full text-sm text-[var(--text-secondary)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--button-highlight-bg)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--button-highlight-fg)]" />
        </label>
        
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className={`${premiumPrimaryDarkButton} px-5 disabled:opacity-60`}
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {copy.coverSave}
          </button>
          {saved && !isPending && (
            <span className="flex items-center gap-1.5 text-xs text-[var(--accent-mint)]">
              <Check className="h-3 w-3" />
              Guardado
            </span>
          )}
        </div>
      </section>

      <section className={`rounded-[32px] border border-[var(--border-subtle)] bg-gradient-to-br p-8 shadow-[var(--shadow-soft)] ${previewClasses[project.cover.palette]}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] opacity-70">{copy.coverEyebrow}</p>
        <div className="mt-8 overflow-hidden rounded-[28px] border border-white/15 bg-black/10 backdrop-blur">
          {project.cover.backgroundImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={project.cover.backgroundImageUrl} alt={project.cover.title} className="h-72 w-full object-cover" />
          ) : (
            <div className="flex h-72 items-center justify-center bg-white/10 text-sm font-semibold uppercase tracking-[0.2em] opacity-70">
              {copy.coverNoImage}
            </div>
          )}
          <div className="p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-60">{project.title}</p>
            <h2 className="mt-4 text-5xl font-black tracking-tight">{project.cover.title}</h2>
            <p className="mt-4 max-w-xl text-base leading-8 opacity-85">{project.cover.subtitle}</p>
          </div>
        </div>
      </section>
    </form>
  );
}
