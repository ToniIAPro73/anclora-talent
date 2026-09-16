import { notFound } from 'next/navigation';
import { CoverOptimizePanel } from '@/components/filestudio/CoverOptimizePanel';
import { CoverStudioV2 } from '@/components/projects/design-surface/CoverStudioV2';
import { premiumPrimaryDarkButton, premiumSecondaryLightButton } from '@/components/ui/button-styles';
import { NavigatingLink } from '@/components/ui/NavigatingLink';
import { requireUserId } from '@/lib/auth/guards';
import { hasDatabase } from '@/lib/db';
import { projectRepository } from '@/lib/db/repositories';
import { isFileStudioEnabled } from '@/lib/filestudio/config';
import { listProjectFileStudioJobs } from '@/lib/filestudio/emission';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { readUiPreferences } from '@/lib/ui-preferences/preferences.server';
import { getCoverDesign } from '@/lib/projects/design-surface-repository';

export default async function ProjectCoverPage({
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

  // Feature flag (config.ts): without FILESTUDIO_API_URL the FileStudio
  // surface stays hidden and the cover studio behaves exactly as before.
  const filestudioCopy = resolveLocaleMessages(locale).filestudio;
  const filestudioJobs = isFileStudioEnabled() && hasDatabase()
    ? await listProjectFileStudioJobs(userId, projectId).catch(() => [])
    : null;
  const hasCover = Boolean(project.cover.renderedImageUrl ?? project.cover.backgroundImageUrl);
  const coverDesignSurfaceCopy = resolveLocaleMessages(locale).coverDesignSurface;
  const initialSurface = getCoverDesign(project);
  const sourceDocumentAssetId = project.assets.find((asset) => asset.usage === 'source-document')?.id ?? null;
  const pageCount = project.document.source?.pageCount ?? null;

  return (
    <div className="ac-workspace-stage talent-workspace-stage">
      <div className="ac-workspace-stage__header ac-workspace-stage__header--split">
        <div className="ac-section-heading">
          <p className="ac-section-heading__eyebrow">{copy.coverEyebrow}</p>
          <h2 className="ac-section-heading__title mt-2 text-4xl">{copy.coverTitle}</h2>
        </div>
        <div className="ac-workspace-stage__actions">
          <NavigatingLink href={`/projects/${project.id}/editor`} pendingLabel={copy.coverBackEditor} className={`${premiumSecondaryLightButton} px-5`}>
            {copy.coverBackEditor}
          </NavigatingLink>
          <NavigatingLink href={`/projects/${project.id}/back-cover`} pendingLabel={copy.coverOpenBackCover} className={`${premiumSecondaryLightButton} px-5`}>
            {copy.coverOpenBackCover}
          </NavigatingLink>
          <NavigatingLink href={`/projects/${project.id}/preview`} pendingLabel={copy.coverBackPreview} className={`${premiumPrimaryDarkButton} px-5`}>
            {copy.coverBackPreview}
          </NavigatingLink>
        </div>
      </div>
      <CoverStudioV2
        surfaceKind="cover"
        projectId={project.id}
        initialSurface={initialSurface}
        sourceDocumentAssetId={sourceDocumentAssetId}
        pageCount={pageCount}
        copy={coverDesignSurfaceCopy}
      />
      {filestudioJobs && (
        <section aria-label={filestudioCopy.derivativesTitle} className="mt-8">
          <CoverOptimizePanel
            copy={filestudioCopy}
            projectId={project.id}
            hasCover={hasCover}
            initialJobs={filestudioJobs}
          />
        </section>
      )}
    </div>
  );
}
