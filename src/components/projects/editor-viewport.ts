import type { PreviewFormat } from '@/lib/preview/device-configs';

export const PHYSICAL_MOBILE_BREAKPOINT = 640;
export const EDITOR_CANVAS_GUTTER = 32;

export type EditorViewportLayout = {
  physicalDevice: 'mobile' | 'wide';
  layoutDevice: 'mobile' | 'tablet' | 'desktop';
  viewMode: 'single' | 'double';
  scale: number;
};

export function resolveEditorViewportLayout({
  physicalWidth,
  publicationDevice,
  pageWidth,
  requestedViewMode,
}: {
  physicalWidth: number;
  publicationDevice: PreviewFormat;
  pageWidth: number;
  requestedViewMode: 'single' | 'double';
}): EditorViewportLayout {
  const isPhysicalMobile = physicalWidth > 0 && physicalWidth <= PHYSICAL_MOBILE_BREAKPOINT;

  if (!isPhysicalMobile) {
    return {
      physicalDevice: 'wide',
      layoutDevice: publicationDevice === 'laptop' || publicationDevice === 'ereader' ? 'desktop' : publicationDevice,
      viewMode: requestedViewMode,
      scale: 1,
    };
  }

  const availableWidth = Math.max(1, physicalWidth - EDITOR_CANVAS_GUTTER);

  return {
    physicalDevice: 'mobile',
    layoutDevice: 'mobile',
    viewMode: 'single',
    scale: Math.min(1, availableWidth / pageWidth),
  };
}

export function calculateSpreadFitFactor({
  availableWidth,
  naturalWidth,
  minScale = 0.5,
}: {
  availableWidth: number;
  naturalWidth: number;
  minScale?: number;
}): number {
  if (availableWidth <= 0 || naturalWidth <= 0) {
    return 1;
  }
  if (naturalWidth <= availableWidth) {
    return 1;
  }
  return Math.max(minScale, availableWidth / naturalWidth);
}
