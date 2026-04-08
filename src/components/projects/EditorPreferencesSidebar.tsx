'use client';

import React, { useState } from 'react';
import { Settings, ChevronDown } from 'lucide-react';
import { useEditorPreferences } from '@/hooks/use-editor-preferences';
import { MARGIN_PRESETS } from '@/lib/projects/page-calculator';
import { defaultEditorPreferences } from '@/lib/ui-preferences/preferences';

/**
 * Compact version of EditorPreferencesPanel for the sidebar
 * Shows current preferences and allows quick editing
 */
export function EditorPreferencesSidebar() {
  const { preferences, isLoaded, setPreferences, resetPreferences } = useEditorPreferences();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isLoaded) return null;

  const currentFontSize = preferences.fontSize || defaultEditorPreferences.fontSize;
  const currentDevice = preferences.device || defaultEditorPreferences.device;
  const currentMargins = preferences.margins || defaultEditorPreferences.margins;

  const deviceLabel = {
    mobile: '📱 Móvil',
    tablet: '📱 Tablet',
    desktop: '🖥️ Escritorio',
  }[currentDevice];

  const getMarginPresetName = () => {
    for (const [name, preset] of Object.entries(MARGIN_PRESETS)) {
      if (
        preset.top === currentMargins.top &&
        preset.bottom === currentMargins.bottom &&
        preset.left === currentMargins.left &&
        preset.right === currentMargins.right
      ) {
        return name.charAt(0).toUpperCase() + name.slice(1);
      }
    }
    return 'Custom';
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-[20px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-[var(--shadow-soft)]">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-[var(--page-surface-muted)] transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Settings className="h-4 w-4 flex-shrink-0 text-[var(--accent-mint)]" />
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-tertiary)] truncate">
            Editor
          </span>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 flex-shrink-0 text-[var(--text-secondary)] transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-4 space-y-3">
          {/* Font Size */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-tertiary)] mb-2">
              Tamaño
            </p>
            <div className="flex flex-wrap gap-1.5">
              {['12px', '16px', '20px', '24px'].map((size) => (
                <button
                  key={size}
                  onClick={() => setPreferences({ fontSize: size })}
                  className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                    currentFontSize === size
                      ? 'bg-[var(--accent-mint)] text-white'
                      : 'bg-[var(--background)] text-[var(--text-secondary)] hover:bg-[var(--hover)]'
                  }`}
                >
                  {size.replace('px', '')}
                </button>
              ))}
            </div>
          </div>

          {/* Device */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-tertiary)] mb-2">
              Vista
            </p>
            <select
              value={currentDevice}
              onChange={(e) =>
                setPreferences({ device: e.target.value as 'mobile' | 'tablet' | 'desktop' })
              }
              className="w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-primary)] bg-[var(--background)] border border-[var(--border-subtle)] hover:border-[var(--accent-mint)] focus:border-[var(--accent-mint)] focus:outline-none transition-colors"
            >
              <option value="mobile">📱 Móvil</option>
              <option value="tablet">📱 Tablet</option>
              <option value="desktop">🖥️ Escritorio</option>
            </select>
          </div>

          {/* Margins Preview */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-tertiary)] mb-2">
              Márgenes
            </p>
            <div className="px-2 py-2 rounded-lg bg-[var(--background)] border border-[var(--border-subtle)]">
              <p className="text-[10px] font-semibold text-[var(--text-primary)]">
                {getMarginPresetName()}
              </p>
              <p className="text-[9px] text-[var(--text-tertiary)] mt-1">
                {currentMargins.top}px / {currentMargins.right}px
              </p>
            </div>
          </div>

          {/* Reset Button */}
          <button
            onClick={resetPreferences}
            className="w-full px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover)] transition-colors"
          >
            ↻ Restaurar
          </button>

          {/* Hint */}
          <p className="text-[9px] text-[var(--text-tertiary)] leading-4">
            💡 Se aplican al abrir un capítulo
          </p>
        </div>
      )}
    </div>
  );
}
