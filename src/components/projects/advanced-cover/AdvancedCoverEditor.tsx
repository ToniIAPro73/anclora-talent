'use client';

import { useRef, useState, useTransition } from 'react';
import { Check, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { CoverCanvas } from './Canvas';
import { CoverToolbar } from './Toolbar';
import { CoverPropertyPanel } from './PropertyPanel';
import { renderCoverImageAction, saveProjectCoverAction } from '@/lib/projects/actions';
import { resizeImage } from '@/lib/ui/images';
import { premiumPrimaryDarkButton, premiumSecondaryLightButton } from '@/components/ui/button-styles';
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
  const [isRendering, startRenderTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [renderedImageUrl, setRenderedImageUrl] = useState<string | null>(project.cover.renderedImageUrl ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleRenderImage = () => {
    const node = canvasRef.current;
    if (!node) return;

    startRenderTransition(async () => {
      const dataUrl = await toPng(node, { pixelRatio: 2 });
      const formData = new FormData();
      formData.set('projectId', project.id);
      formData.set('dataUrl', dataUrl);
      await renderCoverImageAction(formData);
      setRenderedImageUrl(dataUrl);
      setRendered(true);
      setTimeout(() => setRendered(false), 2500);
    });
  };

  const handleSave = async () => {
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
            ref={canvasRef}
            title={title}
            subtitle={subtitle}
            palette={palette}
            layout={layout}
            fontFamily={fontFamily}
            accentColor={accentColor}
            backgroundImageUrl={project.cover.backgroundImageUrl}
          />
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleRenderImage}
              disabled={isRendering}
              className={`${premiumSecondaryLightButton} px-4 disabled:opacity-60`}
            >
              {isRendering ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="mr-1.5 h-3.5 w-3.5" />}
              {copy.coverRenderImage}
            </button>
            {rendered && !isRendering && (
              <span className="flex items-center gap-1.5 text-xs text-[var(--accent-mint)]">
                <Check className="h-3 w-3" />
                {copy.coverRenderImageDone}
              </span>
            )}
          </div>
          {renderedImageUrl && (
            <div className="mt-4 space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                {copy.coverRenderedImageLabel}
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={renderedImageUrl}
                alt={copy.coverRenderedImageLabel}
                className="w-full max-w-[160px] rounded-[12px] border border-[var(--border-subtle)] shadow-[var(--shadow-soft)]"
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
