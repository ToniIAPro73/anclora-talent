'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Settings, ChevronDown } from 'lucide-react';
import { MARGIN_PRESETS } from '@/lib/projects/page-calculator';

export interface MarginConfig {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface MarginSelectorProps {
  margins: MarginConfig;
  onMarginsChange: (margins: MarginConfig) => void;
  wordsPerPage?: number;
}

export function MarginSelector({ margins, onMarginsChange, wordsPerPage }: MarginSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customMargins, setCustomMargins] = useState(margins);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isCustom = !Object.entries(MARGIN_PRESETS).some(
    ([, preset]) =>
      preset.top === margins.top &&
      preset.bottom === margins.bottom &&
      preset.left === margins.left &&
      preset.right === margins.right,
  );

  useEffect(() => {
    setCustomMargins(margins);
  }, [margins]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const applyPreset = (preset: MarginConfig) => {
    onMarginsChange(preset);
    setCustomMargins(preset);
    setIsOpen(false);
  };

  const handleCustomChange = (key: keyof MarginConfig, value: number) => {
    const updated = { ...customMargins, [key]: Math.max(0, value) };
    setCustomMargins(updated);
    onMarginsChange(updated);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 min-w-[100px] items-center justify-between gap-2 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-mint)] transition-colors"
        aria-label="Configuración de márgenes"
        title="Configuración de márgenes"
      >
        <Settings className="h-3.5 w-3.5" />
        <span className="text-[10px]">{isCustom ? 'Custom' : 'Normal'}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="fixed left-1/2 top-[4.25rem] z-[150] w-[min(92vw,420px)] -translate-x-1/2 max-h-[calc(100vh-5rem)] overflow-y-auto overscroll-contain rounded-2xl border border-[var(--border-strong)] bg-[#0E1825] p-4 shadow-2xl shadow-black animate-in fade-in zoom-in duration-200">
          {/* Presets */}
          <div className="mb-4 flex flex-col gap-2">
            <div className="px-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
              Presets
            </div>
            {Object.entries(MARGIN_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                  !isCustom &&
                  margins.top === preset.top &&
                  margins.bottom === preset.bottom &&
                  margins.left === preset.left &&
                  margins.right === preset.right
                    ? 'bg-[var(--accent-mint)]/20 text-[var(--accent-mint)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--hover)]'
                }`}
              >
                <div className="font-semibold capitalize">{key}</div>
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
                  min="0"
                  max="100"
                  value={customMargins.top}
                  onChange={(e) => handleCustomChange('top', parseInt(e.target.value) || 0)}
                  className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--background)] px-2 py-1 text-xs text-[var(--text-primary)] focus:border-[var(--accent-mint)] focus:outline-none"
                />
                <span className="text-[9px] text-[var(--text-tertiary)]">px</span>
              </div>

              <div className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3">
                <label className="text-[10px] font-semibold text-[var(--text-secondary)]">
                  Abajo:
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={customMargins.bottom}
                  onChange={(e) => handleCustomChange('bottom', parseInt(e.target.value) || 0)}
                  className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--background)] px-2 py-1 text-xs text-[var(--text-primary)] focus:border-[var(--accent-mint)] focus:outline-none"
                />
                <span className="text-[9px] text-[var(--text-tertiary)]">px</span>
              </div>

              <div className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3">
                <label className="text-[10px] font-semibold text-[var(--text-secondary)]">
                  Izq:
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={customMargins.left}
                  onChange={(e) => handleCustomChange('left', parseInt(e.target.value) || 0)}
                  className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--background)] px-2 py-1 text-xs text-[var(--text-primary)] focus:border-[var(--accent-mint)] focus:outline-none"
                />
                <span className="text-[9px] text-[var(--text-tertiary)]">px</span>
              </div>

              <div className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3">
                <label className="text-[10px] font-semibold text-[var(--text-secondary)]">
                  Der:
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={customMargins.right}
                  onChange={(e) => handleCustomChange('right', parseInt(e.target.value) || 0)}
                  className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--background)] px-2 py-1 text-xs text-[var(--text-primary)] focus:border-[var(--accent-mint)] focus:outline-none"
                />
                <span className="text-[9px] text-[var(--text-tertiary)]">px</span>
              </div>
            </div>
          </div>

          {/* Words per page info */}
          {wordsPerPage !== undefined && (
            <>
              <div className="h-px bg-[var(--border-subtle)] my-2" />
              <div className="px-2 py-2 bg-[var(--background)] rounded-lg">
                <div className="text-[10px] font-semibold text-[var(--text-tertiary)] mb-1">
                  Estimación
                </div>
                <div className="text-sm font-bold text-[var(--accent-mint)]">
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
