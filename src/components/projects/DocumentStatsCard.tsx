'use client';

import { useMemo } from 'react';
import { BookOpen, FileText, BarChart3, Clock, FileJson } from 'lucide-react';
import { getDocumentStats, formatNumber, formatReadingTime } from '@/lib/projects/document-stats';
import { getSourceDocumentMetrics, formatSourceDocumentComparison } from '@/lib/projects/source-document-metrics';
import type { ProjectDocument } from '@/lib/projects/types';
import type { ProjectRecord } from '@/lib/projects/types';

interface DocumentStatsCardProps {
  document: ProjectDocument;
  project?: ProjectRecord; // Optional: used to get source document metrics
  isLoading?: boolean;
}

export function DocumentStatsCard({ document, project, isLoading = false }: DocumentStatsCardProps) {
  const stats = useMemo(() => {
    return getDocumentStats(document, 'laptop');
  }, [document]);

  const sourceMetrics = useMemo(() => {
    return project ? getSourceDocumentMetrics(project) : null;
  }, [project]);

  if (isLoading) {
    return (
      <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-6 shadow-[var(--shadow-strong)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">
          Estadísticas del documento
        </p>
        <div className="mt-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-[var(--surface-soft)]" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="h-full rounded-[28px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-6 shadow-[var(--shadow-strong)]">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">
        Estadísticas del documento
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* Chapters stat */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[var(--surface-soft)]">
            <BookOpen className="h-5 w-5 text-[var(--accent-mint)]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-black text-[var(--text-primary)]">{stats.chapterCount}</p>
            <p className="text-xs text-[var(--text-tertiary)]">
              {stats.chapterCount === 1 ? 'Capítulo' : 'Capítulos'}
            </p>
          </div>
        </div>

        {/* Words stat */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[var(--surface-soft)]">
            <FileText className="h-5 w-5 text-[var(--accent-mint)]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-black text-[var(--text-primary)]">{formatNumber(stats.wordCount)}</p>
            <p className="text-xs text-[var(--text-tertiary)]">Palabras</p>
          </div>
        </div>

        {/* Characters stat */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[var(--surface-soft)]">
            <BarChart3 className="h-5 w-5 text-[var(--accent-mint)]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-black text-[var(--text-primary)]">{formatNumber(stats.characterCount)}</p>
            <p className="text-xs text-[var(--text-tertiary)]">Caracteres</p>
          </div>
        </div>

        {/* Pages & Reading time stat */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[var(--surface-soft)]">
            <Clock className="h-5 w-5 text-[var(--accent-mint)]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-black text-[var(--text-primary)]">{stats.pageCount}</p>
            <p className="text-xs text-[var(--text-tertiary)]">
              ~Págs (laptop)
            </p>
          </div>
        </div>
      </div>

      {/* Additional info */}
      <div className="mt-6 border-t border-[var(--border-subtle)] pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">
          Tiempo de lectura estimado
        </p>
        <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
          {formatReadingTime(stats.estimatedReadTime)}
        </p>
      </div>

      {/* Format info */}
      <div className="mt-4 rounded-lg bg-[var(--surface-soft)] p-3">
        <p className="text-xs text-[var(--text-secondary)]">
          <span className="font-semibold">Nota:</span> Las estadísticas se calculan basándose en el formato laptop (6×9"). Los números pueden variar según el dispositivo y configuración de lectura.
        </p>
      </div>

      {/* Source document comparison (Commit 5) */}
      {sourceMetrics && (
        <div className="mt-6 border-t border-[var(--border-subtle)] pt-4">
          <div className="flex items-center gap-2 mb-3">
            <FileJson className="h-4 w-4 text-[var(--accent-mint)]" />
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">
              Comparación con documento original
            </p>
          </div>
          <div className="rounded-lg bg-[var(--surface-soft)] p-3">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {sourceMetrics.fileType}: ~{sourceMetrics.estimatedSourcePages} págs
            </p>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              <span className="font-semibold">Talent layout:</span> {sourceMetrics.talentPages.laptop} laptop · {sourceMetrics.talentPages.tablet} tablet · {sourceMetrics.talentPages.mobile} móvil
            </p>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              {sourceMetrics.pageReduction.laptop > 0 ? '+' : ''}{sourceMetrics.pageReduction.laptop}% páginas en formato laptop
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
