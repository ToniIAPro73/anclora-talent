'use client';

import type { AppMessages } from '@/lib/i18n/messages';
import type { EditorialMapEntry, ProjectRecord } from '@/lib/projects/types';

type PageSummary = {
  label: string;
  pageNumber: number;
};

type ColumnEntry = {
  label: string;
  meta?: string;
  tone?: 'default' | 'generated' | 'inferred' | 'added' | 'removed' | 'merged';
};

function Column({
  entries,
  title,
}: {
  entries: ColumnEntry[];
  title: string;
}) {
  return (
    <section className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">{title}</p>
      <div className="mt-4 space-y-3">
        {entries.map((entry, index) => (
          <article
            key={`${entry.label}-${index}`}
            className={`rounded-[18px] border px-4 py-3 ${
              entry.tone === 'generated'
                ? 'border-amber-300/30 bg-amber-300/10'
                : entry.tone === 'inferred'
                  ? 'border-sky-300/30 bg-sky-300/10'
                  : entry.tone === 'added'
                    ? 'border-[var(--success)]/40 bg-[var(--success-soft)]'
                    : entry.tone === 'removed'
                      ? 'border-[var(--danger)]/40 bg-[var(--danger-soft)]'
                      : entry.tone === 'merged'
                        ? 'border-[var(--warning)]/40 bg-[var(--warning-soft)]'
                        : 'border-[var(--border-subtle)] bg-[var(--surface-soft)]'
            }`}
          >
            <p className="text-sm font-semibold text-[var(--text-primary)]">{entry.label}</p>
            {entry.meta ? <p className="mt-1 text-xs leading-6 text-[var(--text-secondary)]">{entry.meta}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function normalizeTitle(title: string) {
  return title.trim().toLocaleLowerCase();
}

/**
 * M6 — outline vs. final chapters diff. A detected outline entry that has no
 * matching final chapter title either got dropped (top-level, `level === 1`
 * → 'removed') or folded into a parent chapter's body (a nested sub-heading,
 * `level > 1` → 'merged'). A final chapter with no matching detected entry
 * is new structure ('added').
 */
function outlineToEntries(outline: EditorialMapEntry[] | undefined, finalTitles: Set<string>, copy: AppMessages['project']): ColumnEntry[] {
  if (!outline || outline.length === 0) return [];

  return outline.map((entry) => {
    if (entry.origin === 'generated') {
      return {
        label: `${'· '.repeat(Math.max(0, entry.level - 1))}${entry.title}`,
        meta: copy.editorialMapGeneratedMeta,
        tone: 'generated' as const,
      };
    }
    if (entry.origin === 'inferred') {
      return {
        label: `${'· '.repeat(Math.max(0, entry.level - 1))}${entry.title}`,
        meta: copy.editorialMapInferredMeta,
        tone: 'inferred' as const,
      };
    }
    const matched = finalTitles.has(normalizeTitle(entry.title));
    const tone: ColumnEntry['tone'] = matched ? 'default' : entry.level === 1 ? 'removed' : 'merged';
    return {
      label: `${'· '.repeat(Math.max(0, entry.level - 1))}${entry.title}`,
      meta: matched ? undefined : tone === 'removed' ? copy.editorialMapRemovedMeta : copy.editorialMapMergedMeta,
      tone,
    };
  });
}

export function EditorialMapPanel({
  copy,
  pageSummaries,
  project,
}: {
  copy: AppMessages['project'];
  pageSummaries: PageSummary[];
  project: ProjectRecord;
}) {
  const outline = project.document.source?.outline;
  const detectedTitles = new Set(
    (outline ?? []).filter((entry) => !entry.origin || entry.origin === 'detected').map((entry) => normalizeTitle(entry.title)),
  );
  const finalTitles = new Set(project.document.chapters.map((chapter) => normalizeTitle(chapter.title)));
  const originalEntries = outlineToEntries(outline, finalTitles, copy);
  const chapterEntries: ColumnEntry[] = project.document.chapters.map((chapter, index) => {
    const isGeneratedIndex =
      chapter.title.toLowerCase() === 'índice' && outline?.some((entry) => entry.title === 'Índice' && entry.origin === 'generated');
    const isNew = Boolean(outline?.length) && !isGeneratedIndex && !detectedTitles.has(normalizeTitle(chapter.title));
    return {
      label: `${index + 1}. ${chapter.title}`,
      meta: isNew ? copy.editorialMapAddedMeta : `${chapter.blocks.length} bloques`,
      tone: isGeneratedIndex ? ('generated' as const) : isNew ? ('added' as const) : 'default',
    };
  });
  const pageEntries: ColumnEntry[] = pageSummaries.map((page) => ({
    label: `Página ${page.pageNumber}`,
    meta: page.label,
    tone: 'default' as const,
  }));
  const fallbackOriginalEntries: ColumnEntry[] = [
    { label: 'Sin estructura original persistida', meta: 'El proyecto no proviene de una importación.' },
  ];

  return (
    <section className="space-y-4 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-6" data-testid="editorial-map-panel">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">{copy.editorialMapTitle}</p>
        <p className="max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">{copy.editorialMapDescription}</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Column
          title={copy.editorialMapOriginalColumn}
          entries={originalEntries.length > 0 ? originalEntries : fallbackOriginalEntries}
        />
        <Column title={copy.editorialMapChaptersColumn} entries={chapterEntries} />
        <Column title={copy.editorialMapPagesColumn} entries={pageEntries} />
      </div>
    </section>
  );
}