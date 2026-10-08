'use client';

import type { ProjectRecord } from '@/lib/projects/types';
import type { AppMessages } from '@/lib/i18n/messages';
import type { PreviewPage } from '@/lib/preview/preview-builder';
import { isDesignSurfaceV2 } from '@/lib/projects/design-surface';
import { getBackCoverDesign, getCoverDesign } from '@/lib/projects/design-surface-repository';
import { DesignSurfaceStaticPreview } from '../design-surface/DesignSurfaceStaticPreview';

/**
 * Editorial surfaces (cover / back cover) of the preview. Always rendered from the canonical `DesignSurface` the
 * Portada/Contraportada studios save — the same Fabric path the editors and the server renderer use. A legacy
 * rendered image is only used while the project has no v2 surface yet.
 */
export function PreviewSurfacePage({
  page,
  project,
  copy,
  width,
  height,
  thumbnail = false,
}: {
  page: PreviewPage;
  project: ProjectRecord;
  copy: AppMessages['project'];
  width: number;
  height: number;
  /** Rail miniature: same renderer, distinct test ids so stage assertions stay unambiguous. */
  thumbnail?: boolean;
}) {
  const style = { width: `${width}px`, height: `${height}px` };
  const isCover = page.type === 'cover';
  const testId = `${thumbnail ? 'preview-thumb-surface' : 'preview-surface'}-${isCover ? 'cover' : 'back-cover'}`;
  const legacyImage = isCover
    ? (!isDesignSurfaceV2(project.cover.surfaceState) ? page.coverData?.renderedImageUrl : null)
    : (!isDesignSurfaceV2(project.backCover.surfaceState) ? page.backCoverData?.renderedImageUrl : null);

  if (legacyImage) {
    return (
      <div style={style} className="pw-surface" data-testid={testId}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={legacyImage} alt={isCover ? copy.previewModalCoverAlt : copy.previewModalBackCoverAlt} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div style={style} className="pw-surface" data-testid={testId}>
      <DesignSurfaceStaticPreview surface={isCover ? getCoverDesign(project) : getBackCoverDesign(project)} margin={0} />
    </div>
  );
}
