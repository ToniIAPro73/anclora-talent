'use client';

import { Monitor, Smartphone, Tablet } from 'lucide-react';
import { useEditorPreferences } from '@/hooks/use-editor-preferences';
import type { AppMessages } from '@/lib/i18n/messages';

const FORMATS = ['mobile', 'tablet', 'laptop'] as const;
type SelectorFormat = (typeof FORMATS)[number];

/**
 * U6: device selector for the preview page (inside the ExportLinks row).
 * Persists the choice through useEditorPreferences so the export query and
 * the preview modal pick it up. The stored 'desktop' value maps to the
 * 'laptop' button.
 */
export function PreviewDeviceSelector({ copy }: { copy: AppMessages['project'] }) {
  const { preferences, setPreferences } = useEditorPreferences();
  const active: SelectorFormat =
    preferences.device === 'tablet' || preferences.device === 'mobile'
      ? preferences.device
      : 'laptop';

  const labelFor = (format: SelectorFormat) =>
    format === 'mobile'
      ? copy.previewModalMobile
      : format === 'tablet'
        ? copy.previewModalTablet
        : copy.previewModalLaptop;

  const iconFor = (format: SelectorFormat) =>
    format === 'mobile' ? (
      <Smartphone className="h-4 w-4" />
    ) : format === 'tablet' ? (
      <Tablet className="h-4 w-4" />
    ) : (
      <Monitor className="h-4 w-4" />
    );

  return (
    <div className="flex items-center gap-1" role="group">
      {FORMATS.map((format) => (
        <button
          key={format}
          type="button"
          data-testid={`preview-device-${format}-button`}
          aria-label={labelFor(format)}
          aria-pressed={active === format}
          onClick={() =>
            setPreferences({ device: format === 'laptop' ? 'desktop' : format })
          }
          className={
            active === format
              ? 'ac-button ac-button--primary ac-button--sm'
              : 'ac-button ac-button--ghost ac-button--sm'
          }
        >
          {iconFor(format)}
        </button>
      ))}
    </div>
  );
}
