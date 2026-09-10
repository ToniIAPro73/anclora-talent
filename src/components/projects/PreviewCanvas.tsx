'use client';

/**
 * Preview Canvas - Anclora Talent Premium Edition
 * Simple component that renders a button to open the full-screen preview modal
 *
 * This replaces the previous embedded preview with a proper modal dialog
 */

import { useMemo, useState } from 'react';
import { BookOpen } from 'lucide-react';
import type { ProjectRecord } from '@/lib/projects/types';
import type { AppMessages } from '@/lib/i18n/messages';
import { PreviewModal } from './PreviewModal';
import { PageRenderer } from './PreviewModal';
import { createCanvasMeasurer } from '@/lib/compose/measure';
import { composeProjectPreview } from '@/lib/compose/preview-adapter';
import { buildPaginationConfig } from '@/lib/preview/device-configs';

export function PreviewCanvas({
  copy,
  project,
}: {
  copy: AppMessages['project'];
  project: ProjectRecord;
}) {
  const [showModal, setShowModal] = useState(false);
  const paginationConfig = useMemo(() => buildPaginationConfig('laptop'), []);
  const measurer = useMemo(() => createCanvasMeasurer(), []);
  const composed = useMemo(
    () => composeProjectPreview(project, paginationConfig, measurer),
    [measurer, paginationConfig, project],
  );
  const cover = composed.pages.find((page) => page.type === 'cover');
  const firstContent = composed.pages.find((page) => page.type === 'content');

  // Show modal when requested
  if (showModal) {
    return (
      <PreviewModal
        project={project}
        copy={copy}
        onClose={() => setShowModal(false)}
      />
    );
  }

  return (
    <div className="ac-surface-panel ac-surface-panel--subtle p-6" data-testid="preview-inline-document">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="ac-surface-panel__eyebrow">{copy.previewCanvasEyebrow}</p>
          <h3 className="mt-1 text-xl font-black text-[var(--text-primary)]">{project.document.title || copy.previewModalUntitledProject}</h3>
        </div>
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
          {copy.previewModalPage} 1
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(180px,0.7fr)_minmax(0,1.3fr)]" data-testid="preview-inline-pages">
        <div className="flex justify-center" data-testid="preview-inline-cover">
          {cover ? (
            <div className="w-full max-w-[280px] overflow-hidden rounded-lg">
              <PageRenderer
                page={cover}
                format="laptop"
                copy={copy}
                config={paginationConfig}
                project={project}
                renderScale={0.38}
              />
            </div>
          ) : null}
        </div>
        <article
          className="preview-page-content min-h-[320px] overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--page-surface)] p-6 text-[var(--text-primary)]"
          data-testid="preview-inline-content"
        >
          {firstContent?.content ? (
            <div dangerouslySetInnerHTML={{ __html: firstContent.content }} />
          ) : (
            <p className="text-sm text-[var(--text-tertiary)]">{copy.previewModalEmptyState}</p>
          )}
        </article>
      </div>

      <button
        data-testid="open-full-preview-button"
        onClick={() => setShowModal(true)}
        className="ac-button ac-button--primary mt-6"
      >
        <BookOpen className="h-5 w-5" />
        {copy.previewModalAdvanced}
      </button>
    </div>
  );
}
