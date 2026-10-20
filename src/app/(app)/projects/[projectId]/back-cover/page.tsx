import { notFound } from 'next/navigation';
import { CoverStudioV2 } from '@/components/projects/design-surface/CoverStudioV2';
import { requireUserId } from '@/lib/auth/guards';
import { projectRepository } from '@/lib/db/repositories';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { readUiPreferences } from '@/lib/ui-preferences/preferences.server';
import { buildSemanticBinding, getBackCoverDesign, getCoverDesign } from '@/lib/projects/design-surface-repository';

export default async function ProjectBackCoverPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const userId = await requireUserId();
  const { projectId } = await params;
  const { locale } = await readUiPreferences();
  const project = await projectRepository.getProjectById(userId, projectId);

  if (!project) {
    notFound();
  }

  const coverDesignSurfaceCopy = resolveLocaleMessages(locale).coverDesignSurface;
  const workflowLabels = resolveLocaleMessages(locale).project;
  const initialSurface = getBackCoverDesign(project);
  const sourceDocumentAssetId = project.assets.find((asset) => asset.usage === 'source-document')?.id ?? null;
  const pageCount = project.document.source?.pageCount ?? null;

  return (
    <div className="back-cover-route-shell">
      <CoverStudioV2
        surfaceKind="back-cover"
        projectId={project.id}
        initialSurface={initialSurface}
        companionSurface={getCoverDesign(project)}
        sourceDocumentAssetId={sourceDocumentAssetId}
        pageCount={pageCount}
        copy={coverDesignSurfaceCopy}
        showWorkflowNavigation
        workflowLabels={workflowLabels}
        locale={locale}
        semanticBinding={buildSemanticBinding(project, 'back-cover')}
      />
    </div>
  );
}
