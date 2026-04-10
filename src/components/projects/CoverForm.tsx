'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import { saveProjectCoverAction } from '@/lib/projects/actions';
import { resizeImage } from '@/lib/ui/images';
import type { ProjectRecord, CoverDesign } from '@/lib/projects/types';
import { premiumPrimaryDarkButton } from '@/components/ui/button-styles';
import type { AppMessages } from '@/lib/i18n/messages';
import { CoverPreview } from './CoverPreview';
import { Slider } from '@/components/ui/slider';
import {
  createDefaultSurfaceState,
  mergePartialSurfaceUpdate,
  normalizeSurfaceState,
} from '@/lib/projects/cover-surface';

export function CoverForm({ copy, project }: { copy: AppMessages['project']; project: ProjectRecord }) {
  const router = useRouter();
  const initialSurface = normalizeSurfaceState(
    project.cover.surfaceState ?? {
      ...createDefaultSurfaceState('cover'),
      fields: {
        title: { value: project.cover.title || project.document.title, visible: true },
        subtitle: {
          value: project.cover.subtitle || project.document.subtitle,
          visible: Boolean((project.cover.showSubtitle ?? true) && (project.cover.subtitle || project.document.subtitle).trim()),
        },
        author: { value: project.document.author, visible: Boolean(project.document.author.trim()) },
      },
    },
  );

  // Sync surfaceState with current document metadata
  // We check if the current surface field is empty OR if it matches the previous project-level flat field
  // This allows changes in Step 1 to flow into the cover until the user manually changes the cover text to something else.
  if (project.cover.surfaceState) {
    const fields = { ...initialSurface.fields };
    let changed = false;

    // Title sync
    if (project.document.title && (!fields.title?.value || fields.title.value !== project.document.title)) {
      // If the cover's specific title field (flat) was updated by updateProjectDocument, 
      // but the surfaceState (rich) still has the old one, we update it.
      fields.title = { value: project.document.title, visible: true };
      changed = true;
    }

    // Subtitle sync
    if (project.document.subtitle && (!fields.subtitle?.value || fields.subtitle.value !== project.document.subtitle)) {
      fields.subtitle = { value: project.document.subtitle, visible: true };
      changed = true;
    }

    // Author sync
    if (project.document.author && (!fields.author?.value || fields.author.value !== project.document.author)) {
      fields.author = { value: project.document.author, visible: true };
      changed = true;
    }

    if (changed) {
      initialSurface.fields = fields;
    }
  }
  const [surface, setSurface] = useState(initialSurface);
  const [palette, setPalette] = useState<CoverDesign['palette']>(project.cover.palette);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData();
    formData.set('projectId', project.id);
    formData.set('title', surface.fields.title?.value ?? '');
    formData.set('subtitle', surface.fields.subtitle?.value ?? '');
    formData.set('palette', palette);
    formData.set('currentBackgroundImageUrl', project.cover.backgroundImageUrl ?? '');
    formData.set('currentThumbnailUrl', project.cover.thumbnailUrl ?? '');
    formData.set('showSubtitle', String(surface.fields.subtitle?.visible ?? false));
    formData.set('surfaceState', JSON.stringify(surface));

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
      router.refresh();
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
            aria-label={copy.coverTitleLabel}
            value={surface.fields.title?.value ?? ''}
            onChange={(e) =>
              setSurface((current) =>
                mergePartialSurfaceUpdate(current, {
                  fields: {
                    title: { value: e.target.value, visible: Boolean(e.target.value.trim()) },
                  },
                }),
              )
            }
            className="w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-mint)]"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.coverSubtitleLabel}</span>
          <textarea
            aria-label={copy.coverSubtitleLabel}
            value={surface.fields.subtitle?.value ?? ''}
            onChange={(e) =>
              setSurface((current) =>
                mergePartialSurfaceUpdate(current, {
                  fields: {
                    subtitle: { value: e.target.value, visible: Boolean(e.target.value.trim()) },
                  },
                }),
              )
            }
            className="min-h-28 w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-mint)]"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.coverAuthorLabel}</span>
          <input
            aria-label={copy.coverAuthorLabel}
            value={surface.fields.author?.value ?? ''}
            onChange={(e) =>
              setSurface((current) =>
                mergePartialSurfaceUpdate(current, {
                  fields: {
                    author: { value: e.target.value, visible: Boolean(e.target.value.trim()) },
                  },
                }),
              )
            }
            className="w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-mint)]"
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

        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.coverOpacityLabel}</span>
            <span className="text-[10px] font-mono text-[var(--text-tertiary)]">{Math.round((surface.opacity ?? 1) * 100)}%</span>
          </div>
          <Slider
            value={[(surface.opacity ?? 1) * 100]}
            min={0}
            max={100}
            step={1}
            onValueChange={(val) => setSurface(s => ({ ...s, opacity: val[0] / 100 }))}
          />
        </div>

        <div className="flex items-center gap-3 pt-4">
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
        surface={surface}
        palette={palette}
        backgroundImageUrl={project.cover.backgroundImageUrl}
        eyebrow={copy.coverEyebrow}
      />
    </form>
  );
}
