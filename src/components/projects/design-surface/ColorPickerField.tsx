'use client';

/**
 * Cover Studio v2 — premium color picker (mission §12).
 *
 * Palette presets + custom hex (react-color's ChromePicker, already a
 * project dependency) + recent colors (per-viewer localStorage convenience,
 * never synced/persisted server-side) + optional brand-profile colors when
 * one is available. Custom colors always remain available alongside
 * presets — presets never gate what the user can pick.
 */

import { useState } from 'react';
import { ChromePicker } from 'react-color';
import type { AppMessages } from '@/lib/i18n/messages';

type Copy = AppMessages['coverDesignSurface']['colorPicker'];

const RECENT_COLORS_STORAGE_KEY = 'anclora-cover-studio-recent-colors-v1';
const MAX_RECENT_COLORS = 8;

const DEFAULT_PALETTE = [
  '#0b133f',
  '#124a50',
  '#f2e3b3',
  '#d4af37',
  '#0b313f',
  '#f2f2f2',
  '#1a1a1a',
  '#c0392b',
];

function readRecentColors(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_COLORS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

function pushRecentColor(color: string) {
  if (typeof window === 'undefined') return;
  try {
    const next = [color, ...readRecentColors().filter((existing) => existing !== color)].slice(0, MAX_RECENT_COLORS);
    window.localStorage.setItem(RECENT_COLORS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Per-viewer convenience only — a blocked/full localStorage never breaks color picking.
  }
}

export interface ColorPickerFieldProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  copy: Copy;
  brandColors?: string[];
  /** Test id prefix so multiple pickers on one panel stay addressable. */
  testId: string;
}

export function ColorPickerField({ label, value, onChange, copy, brandColors, testId }: ColorPickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  // Lazy initializer, not an effect: this markup only ever renders inside
  // the `isOpen` popover, which starts closed — there is no server-rendered
  // HTML for a hydration mismatch to occur against.
  const [recentColors, setRecentColors] = useState<string[]>(() => readRecentColors());

  const commitColor = (hex: string) => {
    onChange(hex);
    pushRecentColor(hex);
    setRecentColors(readRecentColors());
  };

  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold text-[var(--text-primary)]">{label}</span>
      <div className="relative">
        <button
          type="button"
          data-testid={`${testId}-toggle`}
          onClick={() => setIsOpen((open) => !open)}
          aria-haspopup="true"
          aria-expanded={isOpen}
          className="flex h-10 w-full items-center gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-3"
        >
          <span className="h-5 w-5 rounded-md border border-black/10" style={{ backgroundColor: value }} />
          <span className="font-mono text-xs uppercase">{value}</span>
        </button>

        {isOpen && (
          <div className="absolute left-0 z-50 mt-2 w-72 space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-3 shadow-2xl">
            <div className="fixed inset-0 -z-10" onClick={() => setIsOpen(false)} aria-hidden="true" />

            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
                {copy.paletteLabel}
              </p>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_PALETTE.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    data-testid={`${testId}-swatch-${swatch.replace('#', '')}`}
                    onClick={() => commitColor(swatch)}
                    title={swatch}
                    className="h-6 w-6 rounded-full border border-black/10"
                    style={{ backgroundColor: swatch }}
                  />
                ))}
              </div>
            </div>

            {brandColors && brandColors.length > 0 && (
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
                  {copy.brandColorsLabel}
                </p>
                <div className="flex flex-wrap gap-2">
                  {brandColors.map((swatch) => (
                    <button
                      key={swatch}
                      type="button"
                      data-testid={`${testId}-brand-${swatch.replace('#', '')}`}
                      onClick={() => commitColor(swatch)}
                      title={swatch}
                      className="h-6 w-6 rounded-full border border-black/10"
                      style={{ backgroundColor: swatch }}
                    />
                  ))}
                </div>
              </div>
            )}

            {recentColors.length > 0 && (
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
                  {copy.recentLabel}
                </p>
                <div className="flex flex-wrap gap-2">
                  {recentColors.map((swatch) => (
                    <button
                      key={swatch}
                      type="button"
                      data-testid={`${testId}-recent-${swatch.replace('#', '')}`}
                      onClick={() => commitColor(swatch)}
                      title={swatch}
                      className="h-6 w-6 rounded-full border border-black/10"
                      style={{ backgroundColor: swatch }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
                {copy.customLabel}
              </p>
              <ChromePicker color={value} onChange={(color) => commitColor(color.hex)} disableAlpha />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
