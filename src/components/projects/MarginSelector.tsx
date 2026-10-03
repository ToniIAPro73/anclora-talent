'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Settings, ChevronDown } from 'lucide-react';
import { MARGIN_PRESETS } from '@/lib/projects/page-calculator';

const MARGIN_PRESET_LABELS: Record<string, string> = {
  compact: 'Compacto',
  normal: 'Normal',
  spacious: 'Espacioso',
  bookStyle: 'Estilo libro',
  minimal: 'Mínimo',
  custom: 'Personalizado',
};

export interface MarginConfig {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface MarginSelectorProps {
  margins: MarginConfig;
  onMarginsChange: (margins: MarginConfig, presetKey?: string) => void;
  activePreset?: string;
  customSnapshot?: MarginConfig | null;
  wordsPerPage?: number;
}

export function MarginSelector({
  margins,
  onMarginsChange,
  activePreset,
  customSnapshot,
  wordsPerPage,
}: MarginSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customMargins, setCustomMargins] = useState<MarginConfig>(() => customSnapshot ?? margins);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const matchedPresetKey = Object.entries(MARGIN_PRESETS).find(
    ([, preset]) =>
      preset.top === margins.top &&
      preset.bottom === margins.bottom &&
      preset.left === margins.left &&
      preset.right === margins.right,
  )?.[0];

  const effectiveActivePresetKey = activePreset || (matchedPresetKey ?? 'custom');
  const isCustom = effectiveActivePresetKey === 'custom';
  const activePresetLabel = MARGIN_PRESET_LABELS[effectiveActivePresetKey] ?? effectiveActivePresetKey;

  const [prevMargins, setPrevMargins] = useState(margins);
  if (margins !== prevMargins) {
    setPrevMargins(margins);
    if (isCustom) {
      setCustomMargins(margins);
    }
  }

  const [prevCustomSnapshot, setPrevCustomSnapshot] = useState(customSnapshot);
  if (customSnapshot && customSnapshot !== prevCustomSnapshot) {
    setPrevCustomSnapshot(customSnapshot);
    setCustomMargins(customSnapshot);
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const applyPreset = (presetKey: string, preset: MarginConfig) => {
    onMarginsChange(preset, presetKey);
    setIsOpen(false);
  };

  const handleCustomChange = (key: keyof MarginConfig, value: number) => {
    const updated = { ...customMargins, [key]: Math.max(0, value) };
    setCustomMargins(updated);
    onMarginsChange(updated, 'custom');
  };

  const effectiveCustom = customSnapshot ?? customMargins;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        data-testid="margin-selector-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 min-w-[124px] max-w-[160px] items-center justify-between gap-1.5 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface)] px-2.5 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors"
        aria-label="Configuración de márgenes"
        title={`Configuración de márgenes: ${activePresetLabel}`}
      >
        <Settings className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="min-w-0 flex-1 truncate text-left text-[11px] font-medium">{activePresetLabel}</span>
        <ChevronDown className={`h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="fixed left-1/2 top-[4.25rem] z-[150] w-[min(92vw,420px)] -translate-x-1/2 max-h-[calc(100vh-5rem)] overflow-y-auto overscroll-contain rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-panel)] text-[var(--text-primary)] p-4 shadow-[var(--shadow-lg)] custom-scrollbar animate-in fade-in zoom-in duration-200">
          {/* Presets */}
          <div className="mb-4 flex flex-col gap-2">
            <div className="px-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
              Presets
            </div>

            {/* Custom Preset Option */}
            <button
              type="button"
              data-testid="margin-preset-custom-button"
              onClick={() => applyPreset('custom', effectiveCustom)}
              className={`text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                effectiveActivePresetKey === 'custom'
                  ? 'bg-[var(--accent)]/20 text-[var(--accent-text)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text-primary)]'
              }`}
            >
              <div className="font-semibold">Personalizado</div>
              <div className="text-[9px] opacity-70">
                {effectiveCustom.top}px / {effectiveCustom.bottom}px / {effectiveCustom.left}px / {effectiveCustom.right}px
              </div>
            </button>

            {Object.entries(MARGIN_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                type="button"
                data-testid={`margin-preset-${key.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`)}-button`}
                onClick={() => applyPreset(key, preset)}
                className={`text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                  effectiveActivePresetKey === key
                    ? 'bg-[var(--accent)]/20 text-[var(--accent-text)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="font-semibold">{MARGIN_PRESET_LABELS[key] ?? key}</div>
                <div className="text-[9px] opacity-70">
                  {preset.top}px / {preset.bottom}px / {preset.left}px / {preset.right}px
                </div>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="my-3 h-px bg-[var(--border-subtle)]" />

          {/* Custom Margins */}
          <div className="mb-4">
            <div className="mb-3 px-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
              Márgenes Personalizados
            </div>

            <div className="space-y-2 px-2">
              <div className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3">
                <label className="text-[10px] font-semibold text-[var(--text-secondary)]">
                  Arriba:
                </label>
                <input
                  type="number"
                  data-testid="margin-custom-top-input"
                  min="0"
                  max="100"
                  value={customMargins.top}
                  onChange={(e) => handleCustomChange('top', parseInt(e.target.value) || 0)}
                  className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-2 py-1 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                />
                <span className="text-[9px] text-[var(--text-tertiary)]">px</span>
              </div>

              <div className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3">
                <label className="text-[10px] font-semibold text-[var(--text-secondary)]">
                  Abajo:
                </label>
                <input
                  type="number"
                  data-testid="margin-custom-bottom-input"
                  min="0"
                  max="100"
                  value={customMargins.bottom}
                  onChange={(e) => handleCustomChange('bottom', parseInt(e.target.value) || 0)}
                  className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-2 py-1 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                />
                <span className="text-[9px] text-[var(--text-tertiary)]">px</span>
              </div>

              <div className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3">
                <label className="text-[10px] font-semibold text-[var(--text-secondary)]">
                  Izq:
                </label>
                <input
                  type="number"
                  data-testid="margin-custom-left-input"
                  min="0"
                  max="100"
                  value={customMargins.left}
                  onChange={(e) => handleCustomChange('left', parseInt(e.target.value) || 0)}
                  className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-2 py-1 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                />
                <span className="text-[9px] text-[var(--text-tertiary)]">px</span>
              </div>

              <div className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3">
                <label className="text-[10px] font-semibold text-[var(--text-secondary)]">
                  Der:
                </label>
                <input
                  type="number"
                  data-testid="margin-custom-right-input"
                  min="0"
                  max="100"
                  value={customMargins.right}
                  onChange={(e) => handleCustomChange('right', parseInt(e.target.value) || 0)}
                  className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-2 py-1 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                />
                <span className="text-[9px] text-[var(--text-tertiary)]">px</span>
              </div>
            </div>
          </div>

          {/* Words per page info */}
          {wordsPerPage !== undefined && (
            <>
              <div className="h-px bg-[var(--border-subtle)] my-2" />
              <div className="px-2 py-2 bg-[var(--surface-elevated)] rounded-lg">
                <div className="text-[10px] font-semibold text-[var(--text-tertiary)] mb-1">
                  Estimación
                </div>
                <div className="text-sm font-bold text-[var(--accent-text)]">
                  ~{wordsPerPage.toLocaleString()} palabras/página
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
