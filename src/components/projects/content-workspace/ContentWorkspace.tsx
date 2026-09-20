'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ContentSummary } from './ContentSummary';
import { ContentTabs, contentTabLabels, type ContentTabId } from './ContentTabs';
import { MetadataWorkspace } from './metadata/MetadataWorkspace';
import { CompositionWorkspace } from './composition/CompositionWorkspace';
import { BrandProfilePanel } from '../BrandProfilePanel';
import { DocumentHealthPanel } from '../DocumentHealthPanel';
import { HistoryPanel } from '../HistoryPanel';
import { CoAuthorPanel } from '../CoAuthorPanel';
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
          <MetadataWorkspace
            key={`meta-${project.updatedAt}`}
            project={project}
            activeChapter={activeChapter}
            copy={copy}
            onNavigateStep={onNavigateStep}
          />
        )}

        {activeTab === 'composicion' && (
          <CompositionWorkspace
            key={`composition-${project.updatedAt}`}
            project={project}
            copy={copy}
            documentViolations={documentViolations}
            preflightChecks={preflightChecks}
            telemetry={telemetry}
            onNavigateStep={onNavigateStep}
          />
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
