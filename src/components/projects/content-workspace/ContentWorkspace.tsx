'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ContentSummary } from './ContentSummary';
import { ContentTabs, contentTabLabels, type ContentTabId } from './ContentTabs';
import { ProductMetadataPanel } from '../ProductMetadataPanel';
import { DocumentRulesPanel } from '../DocumentRulesPanel';
import { BrandProfilePanel } from '../BrandProfilePanel';
import { DocumentHealthPanel } from '../DocumentHealthPanel';
import { HistoryPanel } from '../HistoryPanel';
import { CoAuthorPanel } from '../CoAuthorPanel';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { saveProjectDocumentAction } from '@/lib/projects/actions';
import { saveDocumentSnapshotAction } from '@/lib/snapshots/actions';
import { resolveDocumentRules } from '@/lib/compose/rules';
import type { AppMessages } from '@/lib/i18n/messages';
import type { ProjectRecord } from '@/lib/projects/types';
import type { BrandProfile } from '@/lib/brand/brand-profile';
import type { ComposeViolation, CompositionDiff } from '@/lib/compose/compose';
import type { PreflightCheck } from '@/lib/preflight/preflight';
import type { DocumentSnapshotMeta } from '@/lib/snapshots/model';
import type { RecompositionTelemetry } from '../useDocumentComposition';
import type { CoAuthorChapter } from '@/lib/ai/co-author';

type Copy = AppMessages['project'];

export function ContentWorkspace({
  project,
  copy,
  activeChapter,
  brandProfiles,
  documentViolations,
  preflightChecks,
  diff,
  recomposedFromPage,
  telemetry,
  revert,
  locale,
  history,
  coAuthor,
  onNavigateStep,
}: {
  project: ProjectRecord;
  copy: Copy;
  activeChapter: { id: string; title: string };
  brandProfiles: BrandProfile[];
  documentViolations: ComposeViolation[];
  preflightChecks: PreflightCheck[];
  diff?: CompositionDiff | null;
  recomposedFromPage?: number;
  telemetry?: RecompositionTelemetry;
  revert: { chapterTitle: string; pending: boolean; onRevert: () => void } | null;
  locale: 'es' | 'en';
  history?: { copy: AppMessages['history']; snapshots: DocumentSnapshotMeta[] };
  coAuthor?: { chapters: CoAuthorChapter[]; cloudAvailable: boolean };
  onNavigateStep: (step: number) => void;
}) {
  const [activeTab, setActiveTab] = useState<ContentTabId>('resumen');
  const router = useRouter();
  const [isSavingVersion, startSavingVersion] = useTransition();
  const rules = resolveDocumentRules(project.document.rules);
  const tabLabels = contentTabLabels(copy);

  const handleSaveVersion = () => {
    startSavingVersion(async () => {
      const result = await saveDocumentSnapshotAction({ projectId: project.id });
      if (result.ok) {
        router.refresh();
      }
    });
  };

  return (
    <div className="talent-content-shell" data-testid="content-workspace">
      <ContentTabs copy={copy} activeTab={activeTab} onChange={setActiveTab} />

      <div className="talent-content-shell__panel" role="tabpanel" aria-label={tabLabels[activeTab]}>
        {activeTab === 'resumen' && (
          <ContentSummary
            project={project}
            copy={copy}
            historyCopy={history?.copy}
            brandProfiles={brandProfiles}
            violations={documentViolations}
            preflightChecks={preflightChecks}
            rules={rules}
            snapshots={history?.snapshots}
            isSavingVersion={isSavingVersion}
            onEditMetadata={() => setActiveTab('metadatos')}
            onOpenComposition={() => setActiveTab('composicion')}
            onOpenBrand={() => setActiveTab('marca')}
            onOpenPreflight={() => setActiveTab('preflight')}
            onOpenVersions={() => setActiveTab('versiones')}
            onOpenAssistant={() => onNavigateStep(7)}
            onOpenPreview={() => onNavigateStep(5)}
            onSaveVersion={history ? handleSaveVersion : undefined}
          />
        )}

        {activeTab === 'metadatos' && (
          <div className="flex flex-col gap-6">
            <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-8 shadow-[var(--shadow-strong)]">
              <div className="mb-6 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">
                  {copy.editorMetaEyebrow}
                </p>
              </div>
              <form
                key={project.updatedAt}
                action={saveProjectDocumentAction}
                className="space-y-6"
                data-testid="project-metadata-form"
              >
                <input type="hidden" name="projectId" value={project.id} data-testid="project-document-project-id-input" />
                <input type="hidden" name="chapterId" value={activeChapter.id} data-testid="project-document-chapter-id-input" />
                <input
                  type="hidden"
                  name="chapterTitle"
                  value={activeChapter.title}
                  data-testid="project-document-chapter-title-input"
                />
                <div className="grid gap-6 md:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.editorTitleLabel}</span>
                    <input
                      data-testid="project-document-title-input"
                      name="title"
                      defaultValue={project.document.title}
                      className="w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.editorAuthorLabel}</span>
                    <input
                      data-testid="project-document-author-input"
                      name="author"
                      defaultValue={project.document.author}
                      className="w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                    />
                  </label>
                </div>
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.editorSubtitleLabel}</span>
                  <textarea
                    data-testid="project-document-subtitle-input"
                    name="subtitle"
                    defaultValue={project.document.subtitle}
                    className="min-h-32 w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                  />
                </label>
                <div className="flex justify-end">
                  <SubmitButton className="dashboard-button dashboard-button--primary" data-testid="project-document-save-button">
                    {copy.saveChanges}
                  </SubmitButton>
                </div>
              </form>
            </section>

            <ProductMetadataPanel key={`meta-${project.updatedAt}`} project={project} copy={copy} />
          </div>
        )}

        {activeTab === 'composicion' && (
          <DocumentRulesPanel key={`rules-${project.updatedAt}`} project={project} copy={copy} />
        )}

        {activeTab === 'marca' && (
          <BrandProfilePanel key={`brand-${project.updatedAt}`} project={project} profiles={brandProfiles} copy={copy} />
        )}

        {activeTab === 'preflight' && (
          <div className="flex flex-col gap-6">
            <DocumentHealthPanel
              project={project}
              violations={documentViolations}
              copy={copy}
              checks={preflightChecks}
              diff={diff}
              recomposedFromPage={recomposedFromPage}
              telemetry={telemetry}
              locale={locale}
              revert={revert}
            />
            {coAuthor && (
              <CoAuthorPanel
                projectId={project.id}
                chapters={coAuthor.chapters}
                cloudAvailable={coAuthor.cloudAvailable}
                copy={copy}
                locale={locale}
              />
            )}
          </div>
        )}

        {activeTab === 'versiones' && history && (
          <HistoryPanel copy={history.copy} projectId={project.id} snapshots={history.snapshots} />
        )}
      </div>
    </div>
  );
}
