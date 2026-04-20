'use client';

import { useState } from 'react';
import { Settings, ChevronDown } from 'lucide-react';
import { useEditorPreferences } from '@/hooks/use-editor-preferences';
import { MARGIN_PRESETS } from '@/lib/projects/page-calculator';
import { defaultEditorPreferences } from '@/lib/ui-preferences/preferences';

export function EditorPreferencesSidebar() {
  const { preferences, isLoaded, setPreferences, resetPreferences } = useEditorPreferences();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isLoaded) return null;

  const currentFontSize = preferences.fontSize || defaultEditorPreferences.fontSize;
  const currentDevice = preferences.device || defaultEditorPreferences.device;
  const currentMargins = preferences.margins || defaultEditorPreferences.margins;

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
    <div className="ac-editor-panel">
      <button onClick={() => setIsExpanded(!isExpanded)} className="ac-editor-panel__trigger">
        <div className="ac-editor-panel__titles">
          <span className="ac-editor-panel__icon">
            <Settings className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="ac-editor-panel__eyebrow">Editor</p>
            <p className="ac-editor-panel__summary">Preferencias de lectura y paginacion</p>
          </div>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 flex-shrink-0 text-[var(--text-secondary)] transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isExpanded && (
        <div className="ac-editor-panel__body">
          <div className="ac-editor-panel__group">
            <p className="ac-editor-panel__label">Tamano</p>
            <div className="ac-editor-panel__chips">
              {['12px', '16px', '20px', '24px'].map((size) => (
                <button
                  key={size}
                  onClick={() => setPreferences({ fontSize: size })}
                  className={
                    currentFontSize === size
                      ? 'ac-button ac-button--primary ac-button--sm'
                      : 'ac-button ac-button--ghost ac-button--sm'
                  }
                  title={`Usar tamano ${size}`}
                >
                  {size.replace('px', '')}
                </button>
              ))}
            </div>
          </div>

          <div className="ac-editor-panel__group">
            <p className="ac-editor-panel__label">Vista</p>
            <select
              value={currentDevice}
              onChange={(e) =>
                setPreferences({ device: e.target.value as 'mobile' | 'tablet' | 'desktop' })
              }
              className="field-select w-full"
            >
              <option value="mobile">Movil</option>
              <option value="tablet">Tablet</option>
              <option value="desktop">Escritorio</option>
            </select>
          </div>

          <div className="ac-editor-panel__group">
            <p className="ac-editor-panel__label">Margenes</p>
            <div className="ac-surface-panel ac-surface-panel--subtle gap-1 p-3">
              <p className="text-[10px] font-semibold text-[var(--text-primary)]">
                {getMarginPresetName()}
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)]">
                {currentMargins.top}px / {currentMargins.right}px
              </p>
            </div>
          </div>

          <button onClick={resetPreferences} className="ac-button ac-button--ghost ac-button--sm">
            Restaurar
          </button>

          <p className="ac-editor-panel__hint">Se aplican al abrir un capitulo.</p>
        </div>
      )}
    </div>
  );
}
