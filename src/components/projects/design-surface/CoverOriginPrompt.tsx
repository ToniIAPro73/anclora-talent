'use client';

/**
 * Cover Studio v2 — empty-state prompt (mission §33-39, §50). Shown when a
 * surface is untouched (`isEmptyDesignSurface`): never silently generates a
 * generic cover. When the project has a source-document asset, offers the
 * original-page inheritance choice too; otherwise only template/blank.
 */

import { useState } from 'react';
import { FileImage, LayoutTemplate, Sparkles } from 'lucide-react';
import type { AppMessages } from '@/lib/i18n/messages';

type Copy = AppMessages['coverDesignSurface']['origin'];

export interface CoverOriginPromptProps {
  copy: Copy;
  hasOriginalAsset: boolean;
  onUseOriginal: () => void | Promise<void>;
  onEditAsBase: () => void | Promise<void>;
  onChooseTemplate: () => void;
  onCreateFromScratch: () => void;
}

export function CoverOriginPrompt({
  copy,
  hasOriginalAsset,
  onUseOriginal,
  onEditAsBase,
  onChooseTemplate,
  onCreateFromScratch,
}: CoverOriginPromptProps) {
  const [busy, setBusy] = useState<'use-original' | 'edit-original' | null>(null);

  const run = async (mode: 'use-original' | 'edit-original', action: () => void | Promise<void>) => {
    setBusy(mode);
    try {
      await action();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-[var(--border-subtle)] p-6" data-testid="cover-origin-prompt">
      <h3 className="text-sm font-semibold">{copy.promptTitle}</h3>

      {busy && <p className="text-xs text-[var(--text-tertiary)]" data-testid="cover-origin-prompt-busy">{copy.rasterizingLabel}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        {hasOriginalAsset && (
          <button
            type="button"
            data-testid="cover-origin-use-original-button"
            onClick={() => run('use-original', onUseOriginal)}
            disabled={busy !== null}
            className="ac-button ac-button--secondary flex flex-col items-start gap-1 p-4 text-left"
          >
            <FileImage className="h-5 w-5" />
            <span className="text-sm font-semibold">{copy.useOriginalLabel}</span>
            <span className="text-xs text-[var(--text-tertiary)]">{copy.useOriginalDescription}</span>
          </button>
        )}

        {hasOriginalAsset && (
          <button
            type="button"
            data-testid="cover-origin-edit-as-base-button"
            onClick={() => run('edit-original', onEditAsBase)}
            disabled={busy !== null}
            className="ac-button ac-button--secondary flex flex-col items-start gap-1 p-4 text-left"
          >
            <LayoutTemplate className="h-5 w-5" />
            <span className="text-sm font-semibold">{copy.editAsBaseLabel}</span>
            <span className="text-xs text-[var(--text-tertiary)]">{copy.editAsBaseDescription}</span>
          </button>
        )}

        <button
          type="button"
          data-testid="cover-origin-choose-template-button"
          onClick={onChooseTemplate}
          disabled={busy !== null}
          className="ac-button ac-button--secondary flex flex-col items-start gap-1 p-4 text-left"
        >
          <Sparkles className="h-5 w-5" />
          <span className="text-sm font-semibold">{copy.chooseTemplateLabel}</span>
        </button>

        <button
          type="button"
          data-testid="cover-origin-create-from-scratch-button"
          onClick={onCreateFromScratch}
          disabled={busy !== null}
          className="ac-button ac-button--ghost flex flex-col items-start gap-1 p-4 text-left"
        >
          <span className="text-sm font-semibold">{copy.createFromScratchLabel}</span>
        </button>
      </div>
    </div>
  );
}
