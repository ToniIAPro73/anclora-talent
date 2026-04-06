'use client';

import { saveBackCoverAction } from '@/lib/projects/actions';
import { premiumPrimaryDarkButton } from '@/components/ui/button-styles';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { useState } from 'react';
import type { ProjectRecord } from '@/lib/projects/types';
import type { AppMessages } from '@/lib/i18n/messages';

const ACCENT_PRESETS = ['#d4af37', '#4fd1c5', '#f6a35c', '#a78bfa', '#f87171', '#34d399'];

export function BackCoverForm({ copy, project }: { copy: AppMessages['project']; project: ProjectRecord }) {
  const bc = project.backCover;
  const [accentColor, setAccentColor] = useState(bc.accentColor ?? ACCENT_PRESETS[0]);

  return (
    <form action={saveBackCoverAction} className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <input type="hidden" name="projectId" value={project.id} />
      <input type="hidden" name="currentBackgroundImageUrl" value={bc.backgroundImageUrl ?? ''} />

      {/* Controls */}
      <section className="space-y-5 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-6 shadow-[var(--shadow-strong)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">
          {copy.backCoverFormEyebrow}
        </p>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.backCoverTitleLabel}</span>
          <input
            name="title"
            defaultValue={bc.title}
            className="w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-mint)]"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.backCoverBodyLabel}</span>
          <textarea
            name="body"
            defaultValue={bc.body}
            rows={5}
            className="min-h-28 w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-mint)]"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.backCoverAuthorBioLabel}</span>
          <textarea
            name="authorBio"
            defaultValue={bc.authorBio}
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
            type="file"
            name="backgroundImage"
            accept="image/*"
            className="block w-full text-sm text-[var(--text-secondary)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--button-highlight-bg)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--button-highlight-fg)]"
          />
        </label>

        <SubmitButton className={`${premiumPrimaryDarkButton} px-5`}>
          {copy.backCoverSave}
        </SubmitButton>
      </section>

      {/* Preview */}
      <section
        className="relative overflow-hidden rounded-[32px] border border-[var(--border-subtle)] bg-[#0b133f] p-8 text-[#f2e3b3] shadow-[var(--shadow-soft)]"
        style={{ minHeight: '400px' }}
      >
        {bc.backgroundImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bc.backgroundImageUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          />
        )}
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] opacity-60">{copy.backCoverEyebrow}</p>
          <div className="mt-8 max-w-xs space-y-6">
            <p className="text-base leading-8 opacity-85">{bc.body || copy.backCoverBodyPlaceholder}</p>
            {bc.authorBio && (
              <div
                className="border-l-4 pl-4 text-sm leading-7 opacity-70"
                style={{ borderColor: accentColor }}
              >
                {bc.authorBio}
              </div>
            )}
          </div>
          <div className="mt-10">
            <div className="h-px w-16 opacity-40" style={{ background: accentColor }} />
            <p className="mt-4 text-xl font-black tracking-tight">{bc.title}</p>
          </div>
        </div>
      </section>
    </form>
  );
}
