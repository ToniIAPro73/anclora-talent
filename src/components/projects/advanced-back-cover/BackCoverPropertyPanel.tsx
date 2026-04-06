'use client';

import type { AppMessages } from '@/lib/i18n/messages';

const ACCENT_PRESETS = ['#d4af37', '#4fd1c5', '#f6a35c', '#a78bfa', '#f87171', '#34d399'];

export function BackCoverPropertyPanel({
  copy,
  title,
  body,
  authorBio,
  accentColor,
  backgroundImageOpacity,
  onTitleChange,
  onBodyChange,
  onAuthorBioChange,
  onAccentChange,
  onOpacityChange,
}: {
  copy: AppMessages['project'];
  title: string;
  body: string;
  authorBio: string;
  accentColor: string;
  backgroundImageOpacity: number;
  onTitleChange: (v: string) => void;
  onBodyChange: (v: string) => void;
  onAuthorBioChange: (v: string) => void;
  onAccentChange: (v: string) => void;
  onOpacityChange: (v: number) => void;
}) {
  return (
    <div className="space-y-5">
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.backCoverTitleLabel}</span>
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Título de la contraportada"
          className="w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-mint)]"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.backCoverBodyLabel}</span>
        <textarea
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          placeholder="Contenido principal de la contraportada"
          rows={5}
          className="min-h-28 w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-mint)]"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.backCoverAuthorBioLabel}</span>
        <textarea
          value={authorBio}
          onChange={(e) => onAuthorBioChange(e.target.value)}
          placeholder="Biografía del autor"
          rows={3}
          className="w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-mint)]"
        />
      </label>

      <div className="space-y-2">
        <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.advancedCoverAccentLabel}</span>
        <div className="flex flex-wrap items-center gap-2">
          {ACCENT_PRESETS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onAccentChange(color)}
              title={color}
              className={`h-7 w-7 rounded-full border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-mint)] ${
                accentColor === color ? 'border-[var(--text-primary)] scale-110' : 'border-transparent'
              }`}
              style={{ background: color }}
            />
          ))}
          <input
            type="color"
            value={accentColor}
            onChange={(e) => onAccentChange(e.target.value)}
            className="h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent p-0"
            title="Color personalizado"
          />
        </div>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-[var(--text-primary)]">Opacidad de imagen de fondo</span>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={backgroundImageOpacity}
            onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
            className="flex-1 cursor-pointer"
          />
          <span className="w-12 rounded-[8px] bg-[var(--surface-soft)] px-2 py-1 text-center text-xs font-semibold text-[var(--text-primary)]">
            {Math.round(backgroundImageOpacity * 100)}%
          </span>
        </div>
      </label>
    </div>
  );
}
