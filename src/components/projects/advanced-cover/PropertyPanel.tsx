'use client';

import type { CoverDesign } from '@/lib/projects/types';
import type { AppMessages } from '@/lib/i18n/messages';

const FONT_OPTIONS = [
  { value: 'sans', label: 'Sans-serif' },
  { value: 'serif', label: 'Serif' },
  { value: 'mono', label: 'Monospace' },
];

const ACCENT_PRESETS = ['#d4af37', '#4fd1c5', '#f6a35c', '#a78bfa', '#f87171', '#34d399'];

export function CoverPropertyPanel({
  copy,
  title,
  subtitle,
  palette,
  fontFamily,
  accentColor,
  onTitleChange,
  onSubtitleChange,
  onPaletteChange,
  onFontChange,
  onAccentChange,
}: {
  copy: AppMessages['project'];
  title: string;
  subtitle: string;
  palette: CoverDesign['palette'];
  fontFamily: string;
  accentColor: string;
  onTitleChange: (v: string) => void;
  onSubtitleChange: (v: string) => void;
  onPaletteChange: (v: CoverDesign['palette']) => void;
  onFontChange: (v: string) => void;
  onAccentChange: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.coverTitleLabel}</span>
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-mint)]"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.coverSubtitleLabel}</span>
        <textarea
          value={subtitle}
          onChange={(e) => onSubtitleChange(e.target.value)}
          rows={3}
          className="w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-mint)]"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.coverPaletteLabel}</span>
        <select
          value={palette}
          onChange={(e) => onPaletteChange(e.target.value as CoverDesign['palette'])}
          className="w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-mint)]"
        >
          <option value="obsidian">{copy.paletteObsidian}</option>
          <option value="teal">{copy.paletteTeal}</option>
          <option value="sand">{copy.paletteSand}</option>
        </select>
      </label>

      <div className="space-y-2">
        <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.advancedCoverFontLabel}</span>
        <div className="flex flex-wrap gap-2">
          {FONT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onFontChange(opt.value)}
              className={`rounded-[12px] border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-mint)] ${
                fontFamily === opt.value
                  ? 'border-[var(--button-highlight-bg)] bg-[var(--button-highlight-bg)] text-[var(--button-highlight-fg)]'
                  : 'border-[var(--border-subtle)] bg-[var(--surface-soft)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

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
    </div>
  );
}
