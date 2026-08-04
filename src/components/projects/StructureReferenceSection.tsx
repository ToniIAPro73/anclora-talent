'use client';

import { useState } from 'react';
import type { AppMessages } from '@/lib/i18n/messages';
import type { InferredStructureSchema, StructureProfile } from '@/lib/structure-profile/model';
import { StructureScaffoldingDialog } from './StructureScaffoldingDialog';

type Copy = AppMessages['project'];

interface StructureReferenceSectionProps {
  copy: Copy;
  /** Saved structure profiles of the user (may be empty). */
  profiles: StructureProfile[];
}

/**
 * "Aplicar estructura de referencia" toggle (FASE 3, G1: fully decoupled
 * from brand). When enabled, the user configures a reference structure via
 * the governed wizard; the confirmed schema travels in the hidden
 * `structureSchema` field of the creation form and becomes the empty
 * scaffold of the new project. Without an explicit confirmation in the
 * wizard, no `structureSchema` field is rendered at all (G2).
 */
export function StructureReferenceSection({ copy, profiles }: StructureReferenceSectionProps) {
  const [enabled, setEnabled] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmedSchema, setConfirmedSchema] = useState<InferredStructureSchema | null>(null);

  const summary = confirmedSchema
    ? copy.structureSummaryLine
        .replace('{parts}', String(confirmedSchema.metrics.desglose.h1Partes))
        .replace('{chapters}', String(confirmedSchema.metrics.desglose.h2Capitulos))
        .replace('{subsections}', String(confirmedSchema.metrics.desglose.h3Subsecciones))
    : null;

  return (
    <div className="mt-4" data-testid="structure-reference-section">
      <label className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
        <input
          type="checkbox"
          data-testid="structure-toggle"
          className="mt-1"
          checked={enabled}
          onChange={(event) => {
            setEnabled(event.target.checked);
            if (!event.target.checked) setConfirmedSchema(null);
          }}
        />
        <span>
          <span className="font-semibold text-[var(--text-primary)]">
            {copy.structureToggleLabel}
          </span>
          <span className="mt-1 block text-xs leading-5 text-[var(--text-tertiary)]">
            {copy.structureToggleHint}
          </span>
        </span>
      </label>

      {enabled && (
        <div className="mt-3 space-y-2">
          <button
            type="button"
            data-testid="structure-configure-button"
            className="ac-button ac-button--secondary ac-button--sm"
            onClick={() => setDialogOpen(true)}
          >
            {copy.structureConfigureAction}
          </button>

          {confirmedSchema && summary && (
            <>
              <p
                className="text-xs font-semibold text-[var(--accent)]"
                data-testid="structure-confirmed-badge"
              >
                {copy.structureConfiguredBadge.replace('{summary}', summary)}
              </p>
              <input
                type="hidden"
                name="structureSchema"
                data-testid="structure-schema-input"
                value={JSON.stringify(confirmedSchema)}
              />
            </>
          )}
        </div>
      )}

      <StructureScaffoldingDialog
        isOpen={dialogOpen}
        profiles={profiles}
        copy={copy}
        onConfirm={(schema) => setConfirmedSchema(schema)}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
