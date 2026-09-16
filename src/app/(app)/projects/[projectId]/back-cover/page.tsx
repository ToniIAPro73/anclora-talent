import { notFound } from 'next/navigation';
import { CoverStudioV2 } from '@/components/projects/design-surface/CoverStudioV2';
import { premiumPrimaryDarkButton, premiumSecondaryLightButton } from '@/components/ui/button-styles';
import { NavigatingLink } from '@/components/ui/NavigatingLink';
import { requireUserId } from '@/lib/auth/guards';
import { projectRepository } from '@/lib/db/repositories';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { readUiPreferences } from '@/lib/ui-preferences/preferences.server';
import { getBackCoverDesign } from '@/lib/projects/design-surface-repository';

export default async function ProjectBackCoverPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const userId = await requireUserId();
  const { projectId } = await params;
  const { locale } = await readUiPreferences();
  const copy = resolveLocaleMessages(locale).project;
  const project = await projectRepository.getProjectById(userId, projectId);

  if (!project) {
    notFound();
  }

  const coverDesignSurfaceCopy = resolveLocaleMessages(locale).coverDesignSurface;
  const initialSurface = getBackCoverDesign(project);
  const sourceDocumentAssetId = project.assets.find((asset) => asset.usage === 'source-document')?.id ?? null;
  const pageCount = project.document.source?.pageCount ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">
            {copy.backCoverEyebrow}
          </p>
          <h2 className="mt-2 text-4xl font-black tracking-tight text-[var(--text-primary)]">
            {copy.backCoverTitle}
          </h2>
        </div>
        <div className="flex gap-3">
          <NavigatingLink href={`/projects/${project.id}/cover`} pendingLabel={copy.backCoverBackToCover} className={`${premiumSecondaryLightButton} px-5`}>
            {copy.backCoverBackToCover}
          </NavigatingLink>
          <NavigatingLink href={`/projects/${project.id}/preview`} pendingLabel={copy.previewBackToEditor} className={`${premiumPrimaryDarkButton} px-5`}>
            {copy.previewBackToEditor}
          </NavigatingLink>
        </div>
      </div>
      <CoverStudioV2
        surfaceKind="back-cover"
        projectId={project.id}
        initialSurface={initialSurface}
        sourceDocumentAssetId={sourceDocumentAssetId}
        pageCount={pageCount}
        copy={coverDesignSurfaceCopy}
      />
    </div>
  );
}
