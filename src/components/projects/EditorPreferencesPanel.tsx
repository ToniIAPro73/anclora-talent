'use client';

import React, { useState } from 'react';
import { Settings, RotateCcw } from 'lucide-react';
import { MarginSelector, type MarginConfig } from './MarginSelector';
import { EditorPreferences, defaultEditorPreferences } from '@/lib/ui-preferences/preferences';

interface EditorPreferencesPanelProps {
  preferences: EditorPreferences;
  onPreferencesChange: (preferences: EditorPreferences) => void;
  onReset?: () => void;
}

export function EditorPreferencesPanel({
  preferences,
  onPreferencesChange,
  onReset,
}: EditorPreferencesPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentMargins = preferences.margins || defaultEditorPreferences.margins!;
  const currentFontSize = preferences.fontSize || defaultEditorPreferences.fontSize;
  const currentDevice = preferences.device || defaultEditorPreferences.device;

  const handleFontSizeChange = (size: string) => {
    onPreferencesChange({ ...preferences, fontSize: size });
  };

  const handleDeviceChange = (device: 'mobile' | 'tablet' | 'desktop') => {
    onPreferencesChange({ ...preferences, device });
  };

  const handleMarginsChange = (margins: MarginConfig) => {
    onPreferencesChange({ ...preferences, margins });
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
    } else {
      onPreferencesChange(defaultEditorPreferences);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Settings className="h-5 w-5 text-[var(--accent-mint)]" />
          <h3 className="text-lg font-bold text-[var(--text-primary)]">
            Preferencias del Editor
          </h3>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover)] rounded-lg transition-colors"
          title="Restaurar valores por defecto"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Restaurar
        </button>
      </div>

      <div className="space-y-4">
        {/* Font Size */}
        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
            Tamaño de Letra
          </label>
          <div className="flex gap-2 flex-wrap">
            {['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'].map((size) => (
              <button
                key={size}
                onClick={() => handleFontSizeChange(size)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
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
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
            Dispositivo Preferido
          </label>
          <div className="flex gap-2">
            {[
              { id: 'mobile', label: 'Móvil', icon: '📱' },
              { id: 'tablet', label: 'Tablet', icon: '📱' },
              { id: 'desktop', label: 'Escritorio', icon: '🖥️' },
            ].map((device) => (
              <button
                key={device.id}
                onClick={() => handleDeviceChange(device.id as 'mobile' | 'tablet' | 'desktop')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  currentDevice === device.id
                    ? 'bg-[var(--accent-mint)] text-white'
                    : 'bg-[var(--background)] text-[var(--text-secondary)] hover:bg-[var(--hover)]'
                }`}
              >
                <span className="mr-1">{device.icon}</span>
                {device.label}
              </button>
            ))}
          </div>
        </div>

        {/* Margins */}
        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
            Márgenes
          </label>
          <div className="bg-[var(--background)] rounded-lg p-3">
            <MarginSelector
              margins={currentMargins}
              onMarginsChange={handleMarginsChange}
            />
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 p-4 rounded-lg bg-[var(--accent-mint)]/5 border border-[var(--accent-mint)]/20">
          <p className="text-xs text-[var(--text-secondary)]">
            💡 <span className="font-semibold">Consejo:</span> Estas preferencias se aplican automáticamente
            cuando abres un capítulo para editar. Puedes cambiarlas en cualquier momento desde el editor.
          </p>
        </div>
      </div>
    </div>
  );
}
