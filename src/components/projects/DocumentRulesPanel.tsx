'use client';

import { useState, useTransition } from 'react';
import type { ProjectRecord } from '@/lib/projects/types';
import type { AppMessages } from '@/lib/i18n/messages';
import {
  DocumentRules,
  resolveDocumentRules,
} from '@/lib/compose/rules';
import { saveProjectRulesAction } from '@/lib/projects/actions';

type Copy = AppMessages['project'];

interface DocumentRulesPanelProps {
  project: ProjectRecord;
  copy: Copy;
}

const PRESETS: Record<'default' | 'print' | 'digital', Partial<DocumentRules>> = {
  default: {},
  print: { chapterStartsOnOddPage: true, pageBreakBeforeChapter: true },
  digital: { chapterStartsOnOddPage: false, pageBreakBeforeChapter: true },
};

const inputClass =
  'rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]';
const labelClass = 'text-sm font-medium text-[var(--text-primary)]';

/**
 * "Reglas del documento" panel (C3): edits the declarative composition rules
 * persisted as JSONB on the project. Presets are starting points; every
 * setting remains individually adjustable.
 */
export function DocumentRulesPanel({ project, copy }: DocumentRulesPanelProps) {
  const [rules, setRules] = useState<DocumentRules>(() => resolveDocumentRules(project.document.rules));
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const patch = (partial: Partial<DocumentRules>) => {
    setSaved(false);
    setRules((current) => resolveDocumentRules({ ...current, ...partial }));
  };
  const patchKeepTogether = (partial: Partial<DocumentRules['keepTogether']>) =>
    patch({ keepTogether: { ...rules.keepTogether, ...partial } });
  const patchNumbering = (partial: Partial<DocumentRules['numbering']>) =>
    patch({ numbering: { ...rules.numbering, ...partial } });

  const applyPreset = (preset: keyof typeof PRESETS) => {
    setSaved(false);
    setRules(resolveDocumentRules(PRESETS[preset]));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData();
    formData.set('projectId', project.id);
    formData.set('rules', JSON.stringify(rules));
    startTransition(async () => {
      await saveProjectRulesAction(formData);
      setSaved(true);
    });
  };

  const toggle = (key: keyof DocumentRules, label: string) => (
    <label className="flex items-center justify-between gap-4" key={key}>
      <span className={labelClass}>{label}</span>
      <input
        type="checkbox"
        checked={Boolean(rules[key])}
        onChange={(event) => patch({ [key]: event.target.checked } as Partial<DocumentRules>)}
        className="h-4 w-4 accent-[var(--accent)]"
      />
    </label>
  );

  return (
    <section
      data-testid="document-rules-panel"
      className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-8 shadow-[var(--shadow-strong)]"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">
        {copy.rulesPanelEyebrow}
      </p>
      <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{copy.rulesPanelTitle}</h3>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{copy.rulesPanelDescription}</p>

      <div className="mt-6 flex flex-wrap items-stretch gap-3">
        <span className={`${labelClass} self-center`}>{copy.rulesPresetLabel}</span>
        {(
          [
            ['default', copy.rulesPresetDefault, copy.rulesPresetDefaultDesc],
            ['print', copy.rulesPresetPrint, copy.rulesPresetPrintDesc],
            ['digital', copy.rulesPresetDigital, copy.rulesPresetDigitalDesc],
          ] as const
        ).map(([preset, name, description]) => (
          <div key={preset} className="max-w-56">
            <button
              type="button"
              data-testid={`rules-preset-${preset}`}
              onClick={() => applyPreset(preset)}
              className="ac-button ac-button--secondary ac-button--sm"
            >
              {name}
            </button>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">{description}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-4">
            <span className={labelClass}>{copy.rulesKeepTable}</span>
            <input
              type="checkbox"
              data-testid="rules-keep-table"
              checked={rules.keepTogether.table}
              onChange={(event) => patchKeepTogether({ table: event.target.checked })}
              className="h-4 w-4 accent-[var(--accent)]"
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span className={labelClass}>{copy.rulesTableFillGap}</span>
            <select
              value={rules.keepTogether.tableFillGap}
              onChange={(event) =>
                patchKeepTogether({ tableFillGap: event.target.value as 'next-float' | 'leave-space' })
              }
              className={inputClass}
            >
              <option value="leave-space">{copy.rulesFillGapLeaveSpace}</option>
              <option value="next-float">{copy.rulesFillGapNextFloat}</option>
            </select>
          </label>
          <label className="flex items-center justify-between gap-4">
            <span className={labelClass}>{copy.rulesKeepList}</span>
            <input
              type="number"
              min={1}
              max={20}
              value={rules.keepTogether.list.maxItems}
              onChange={(event) =>
                patchKeepTogether({
                  list: { maxItems: Math.max(1, Number(event.target.value) || 1) },
                })
              }
              className={`${inputClass} w-20`}
            />
          </label>
          {(
            [
              ['code', copy.rulesKeepCode],
              ['quote', copy.rulesKeepQuote],
              ['callout', copy.rulesKeepCallout],
              ['imageWithCaption', copy.rulesKeepImageCaption],
            ] as const
          ).map(([key, label]) => (
            <label className="flex items-center justify-between gap-4" key={key}>
              <span className={labelClass}>{label}</span>
              <input
                type="checkbox"
                checked={rules.keepTogether[key]}
                onChange={(event) => patchKeepTogether({ [key]: event.target.checked })}
                className="h-4 w-4 accent-[var(--accent)]"
              />
            </label>
          ))}
        </div>

        <div className="space-y-3">
          {toggle('pageBreakBeforeChapter', copy.rulesPageBreakBeforeChapter)}
          {toggle('chapterStartsOnOddPage', copy.rulesChapterOddPage)}
          <label className="flex items-center justify-between gap-4">
            <span className={labelClass}>{copy.rulesMinLinesAfter}</span>
            <input
              type="number"
              min={1}
              max={10}
              value={rules.keepWithNext.minLinesAfter}
              onChange={(event) =>
                patch({
                  keepWithNext: {
                    ...rules.keepWithNext,
                    minLinesAfter: Math.max(1, Number(event.target.value) || 1),
                  },
                })
              }
              className={`${inputClass} w-20`}
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span className={labelClass}>{copy.rulesWidowsOrphans}</span>
            <input
              type="number"
              min={2}
              max={10}
              value={rules.widowsOrphans.minLines}
              onChange={(event) =>
                patch({
                  widowsOrphans: { minLines: Math.max(2, Number(event.target.value) || 2) },
                })
              }
              className={`${inputClass} w-20`}
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span className={labelClass}>{copy.rulesRestartFigures}</span>
            <input
              type="checkbox"
              checked={rules.numbering.restartFiguresPerChapter}
              onChange={(event) => patchNumbering({ restartFiguresPerChapter: event.target.checked })}
              className="h-4 w-4 accent-[var(--accent)]"
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span className={labelClass}>{copy.rulesRestartTables}</span>
            <input
              type="checkbox"
              checked={rules.numbering.restartTablesPerChapter}
              onChange={(event) => patchNumbering({ restartTablesPerChapter: event.target.checked })}
              className="h-4 w-4 accent-[var(--accent)]"
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span className={labelClass}>{copy.rulesPageNumberFormat}</span>
            <select
              value={rules.numbering.pageNumberFormat}
              onChange={(event) =>
                patchNumbering({
                  pageNumberFormat: event.target.value as DocumentRules['numbering']['pageNumberFormat'],
                })
              }
              className={inputClass}
            >
              <option value="decimal">{copy.rulesFormatDecimal}</option>
              <option value="lower-roman">{copy.rulesFormatLowerRoman}</option>
              <option value="upper-roman">{copy.rulesFormatUpperRoman}</option>
            </select>
          </label>
          <label className="flex items-center justify-between gap-4">
            <span className={labelClass}>{copy.rulesExportGate}</span>
            <select
              data-testid="rules-export-gate"
              value={rules.exportGate}
              onChange={(event) =>
                patch({ exportGate: event.target.value as DocumentRules['exportGate'] })
              }
              className={inputClass}
            >
              <option value="off">{copy.rulesExportGateOff}</option>
              <option value="warn">{copy.rulesExportGateWarn}</option>
              <option value="block">{copy.rulesExportGateBlock}</option>
            </select>
          </label>
        </div>

        <div className="md:col-span-2 flex items-center justify-end gap-4">
          {saved && (
            <span className="text-sm font-medium text-[var(--accent)]" role="status">
              {copy.rulesSaved}
            </span>
          )}
          <button
            type="submit"
            data-testid="rules-save-button"
            disabled={isPending}
            className="ac-button ac-button--primary"
          >
            {copy.rulesSave}
          </button>
        </div>
      </form>
    </section>
  );
}
