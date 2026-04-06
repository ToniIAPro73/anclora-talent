'use client';

import { useRef, useState, useTransition } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { saveProjectCoverAction } from '@/lib/projects/actions';
import { resizeImage } from '@/lib/ui/images';
import type { ProjectRecord, CoverDesign } from '@/lib/projects/types';
import { premiumPrimaryDarkButton } from '@/components/ui/button-styles';
import type { AppMessages } from '@/lib/i18n/messages';
import { CoverPreview } from './CoverPreview';

export function CoverForm({ copy, project }: { copy: AppMessages['project']; project: ProjectRecord }) {
  const [title, setTitle] = useState(project.cover.title);
  const [subtitle, setSubtitle] = useState(project.cover.subtitle);
  const [palette, setPalette] = useState<CoverDesign['palette']>(project.cover.palette);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData();
    formData.set('projectId', project.id);
    formData.set('title', title);
    formData.set('subtitle', subtitle);
    formData.set('palette', palette);
    formData.set('currentBackgroundImageUrl', project.cover.backgroundImageUrl ?? '');
    formData.set('currentThumbnailUrl', project.cover.thumbnailUrl ?? '');

    const file = fileInputRef.current?.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        const compressed = await resizeImage(file);
        formData.set('backgroundImage', compressed, 'cover.jpg');
      } else {
        formData.set('backgroundImage', file);
      }
    }

    startTransition(async () => {
      await saveProjectCoverAction(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
      <section className="space-y-4 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-6 text-[var(--text-primary)] shadow-[var(--shadow-strong)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">{copy.coverFormEyebrow}</p>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.coverTitleLabel}</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-mint)]"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.coverSubtitleLabel}</span>
          <textarea
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            className="min-h-28 w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-mint)]"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.coverPaletteLabel}</span>
          <select
            value={palette}
            onChange={(e) => setPalette(e.target.value as CoverDesign['palette'])}
            className="w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-mint)]"
          >
            <option value="obsidian">{copy.paletteObsidian}</option>
            <option value="teal">{copy.paletteTeal}</option>
            <option value="sand">{copy.paletteSand}</option>
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.coverBackgroundLabel}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="block w-full text-sm text-[var(--text-secondary)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--button-highlight-bg)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--button-highlight-fg)]"
          />
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

      <CoverPreview
        title={title}
        subtitle={subtitle}
        palette={palette}
        backgroundImageUrl={project.cover.backgroundImageUrl}
        projectTitle={project.title}
        eyebrow={copy.coverEyebrow}
      />
    </form>
  );
}
