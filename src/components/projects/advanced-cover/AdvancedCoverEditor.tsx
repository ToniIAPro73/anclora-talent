'use client';

import { useRef, useState, useTransition } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { CoverCanvas } from './Canvas';
import { CoverToolbar } from './Toolbar';
import { CoverPropertyPanel } from './PropertyPanel';
import { saveProjectCoverAction } from '@/lib/projects/actions';
import { premiumPrimaryDarkButton } from '@/components/ui/button-styles';
import type { CoverDesign, ProjectRecord } from '@/lib/projects/types';
import type { AppMessages } from '@/lib/i18n/messages';

type Layout = NonNullable<CoverDesign['layout']>;

export function AdvancedCoverEditor({
  project,
  copy,
}: {
  project: ProjectRecord;
  copy: AppMessages['project'];
}) {
  const [title, setTitle] = useState(project.cover.title);
  const [subtitle, setSubtitle] = useState(project.cover.subtitle);
  const [palette, setPalette] = useState<CoverDesign['palette']>(project.cover.palette);
  const [layout, setLayout] = useState<Layout>(project.cover.layout ?? 'centered');
  const [fontFamily, setFontFamily] = useState(project.cover.fontFamily ?? 'sans');
  const [accentColor, setAccentColor] = useState(project.cover.accentColor ?? '#d4af37');
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    const formData = new FormData();
    formData.set('projectId', project.id);
    formData.set('title', title);
    formData.set('subtitle', subtitle);
    formData.set('palette', palette);
    formData.set('layout', layout);
    formData.set('fontFamily', fontFamily);
    formData.set('accentColor', accentColor);
    formData.set('currentBackgroundImageUrl', project.cover.backgroundImageUrl ?? '');
    formData.set('currentThumbnailUrl', project.cover.thumbnailUrl ?? '');

    const file = fileInputRef.current?.files?.[0];
    if (file) formData.set('backgroundImage', file);

    startTransition(async () => {
      await saveProjectCoverAction(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  };

  return (
    <div className="space-y-6" data-testid="advanced-cover-editor">
      {/* Layout toolbar */}
      <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-5 shadow-[var(--shadow-strong)]">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">
          {copy.advancedCoverEyebrow}
        </p>
        <CoverToolbar layout={layout} onLayoutChange={setLayout} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        {/* Property panel */}
        <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-6 shadow-[var(--shadow-strong)]">
          <CoverPropertyPanel
            copy={copy}
            title={title}
            subtitle={subtitle}
            palette={palette}
            fontFamily={fontFamily}
            accentColor={accentColor}
            onTitleChange={setTitle}
            onSubtitleChange={setSubtitle}
            onPaletteChange={setPalette}
            onFontChange={setFontFamily}
            onAccentChange={setAccentColor}
          />

          <label className="mt-5 block space-y-2">
            <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.coverBackgroundLabel}</span>
            <input
              ref={fileInputRef}
              type="file"
              name="backgroundImage"
              accept="image/*"
              className="block w-full text-sm text-[var(--text-secondary)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--button-highlight-bg)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--button-highlight-fg)]"
            />
          </label>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
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

        {/* Live canvas */}
        <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-6 shadow-[var(--shadow-strong)]">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">
            {copy.coverEyebrow}
          </p>
          <CoverCanvas
            title={title}
            subtitle={subtitle}
            palette={palette}
            layout={layout}
            fontFamily={fontFamily}
            accentColor={accentColor}
            backgroundImageUrl={project.cover.backgroundImageUrl}
          />
        </section>
      </div>
    </div>
  );
}
