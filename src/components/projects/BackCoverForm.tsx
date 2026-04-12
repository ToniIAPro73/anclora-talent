'use client';

import { saveBackCoverAction } from '@/lib/projects/actions';
import { premiumPrimaryDarkButton } from '@/components/ui/button-styles';
import { BackCoverPreview } from './BackCoverPreview';
import { Check, Loader2 } from 'lucide-react';
import { resizeImage } from '@/lib/ui/images';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import type { ProjectRecord } from '@/lib/projects/types';
import type { AppMessages } from '@/lib/i18n/messages';
import { Slider } from '@/components/ui/slider';
import {
  mergePartialSurfaceUpdate,
} from '@/lib/projects/cover-surface';
import { createSurfaceSnapshotFromProject } from '@/components/projects/advanced-cover/advanced-surface-utils';

const ACCENT_PRESETS = ['#d4af37', '#4fd1c5', '#f6a35c', '#a78bfa', '#f87171', '#34d399'];

export function BackCoverForm({ copy, project }: { copy: AppMessages['project']; project: ProjectRecord }) {
  const router = useRouter();
  const bc = project.backCover;
  const initialSurface = createSurfaceSnapshotFromProject('back-cover', project);
  const [surface, setSurface] = useState(initialSurface);
  const [accentColor, setAccentColor] = useState(bc.accentColor ?? ACCENT_PRESETS[0]);
  const hasAdvancedBackCover =
    Boolean(project.backCover.surfaceState?.layers?.some((layer) => layer.type === 'text' && layer.fieldKey));
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData();
    formData.set('projectId', project.id);
    formData.set('title', surface.fields.title?.value ?? '');
    formData.set('body', surface.fields.body?.value ?? '');
    formData.set('authorBio', surface.fields.authorBio?.value ?? '');
    formData.set('accentColor', accentColor);
    formData.set('currentBackgroundImageUrl', project.backCover.backgroundImageUrl ?? '');
    formData.set('surfaceState', JSON.stringify(surface));

    const file = fileInputRef.current?.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        const compressed = await resizeImage(file);
        formData.set('backgroundImage', compressed, 'back-cover.jpg');
      } else {
        formData.set('backgroundImage', file);
      }
    }

    startTransition(async () => {
      await saveBackCoverAction(formData);
      router.refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
      <section className="space-y-5 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-6 shadow-[var(--shadow-strong)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">
          {copy.backCoverFormEyebrow}
        </p>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.backCoverTitleLabel}</span>
          <input
            name="title"
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
          <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.backCoverBodyLabel}</span>
          <textarea
            name="body"
            value={surface.fields.body?.value ?? ''}
            onChange={(e) =>
              setSurface((current) =>
                mergePartialSurfaceUpdate(current, {
                  fields: {
                    body: { value: e.target.value, visible: Boolean(e.target.value.trim()) },
                  },
                }),
              )
            }
            rows={5}
            className="min-h-28 w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-mint)]"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.backCoverAuthorBioLabel}</span>
          <textarea
            name="authorBio"
            value={surface.fields.authorBio?.value ?? ''}
            onChange={(e) =>
              setSurface((current) =>
                mergePartialSurfaceUpdate(current, {
                  fields: {
                    authorBio: { value: e.target.value, visible: Boolean(e.target.value.trim()) },
                  },
                }),
              )
            }
            rows={3}
            className="w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-mint)]"
          />
        </label>

        <div className="space-y-2">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.advancedCoverAccentLabel}</span>
          <div className="flex flex-wrap items-center gap-2">
            {ACCENT_PRESETS.map((color) => (
              <label key={color} className="cursor-pointer">
                <input
                  type="radio"
                  name="accentColor"
                  value={color}
                  checked={accentColor === color}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="sr-only"
                />
                <span
                  className={`block h-7 w-7 rounded-full transition hover:scale-110 ${
                    accentColor === color ? 'border-2 border-[var(--text-primary)] scale-110' : 'border-2 border-transparent'
                  }`}
                  style={{ background: color }}
                  title={color}
                />
              </label>
            ))}
          </div>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.coverBackgroundLabel}</span>
          <input
            ref={fileInputRef}
            type="file"
            name="backgroundImage"
            accept="image/*"
            className="block w-full text-sm text-[var(--text-secondary)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--button-highlight-bg)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--button-highlight-fg)]"
          />
        </label>

        {hasAdvancedBackCover ? (
          <div className="rounded-[18px] border border-[rgba(92,194,255,0.24)] bg-[rgba(92,194,255,0.08)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]">
            {copy.backCoverAdvancedSyncNotice}
          </div>
        ) : null}

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
            {copy.backCoverSave}
          </button>
          {saved && !isPending ? (
            <span className="flex items-center gap-1.5 text-xs text-[var(--accent-mint)]">
              <Check className="h-3 w-3" />
              Guardado
            </span>
          ) : null}
        </div>
      </section>

      <BackCoverPreview
        surface={surface}
        backgroundImageUrl={project.backCover.backgroundImageUrl}
        accentColor={accentColor}
        eyebrow={copy.backCoverEyebrow}
      />
    </form>
  );
}
