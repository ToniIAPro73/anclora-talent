/**
 * Device Configurations for Preview System - Anclora Talent Edition
 * Defines viewport dimensions, pagination configs, and presets for different devices
 *
 * Respects ANCLORA_PREMIUM_APP_CONTRACT.md and UI_MOTION_CONTRACT.md
 */

// ==================== TYPES ====================

export type PreviewFormat = 'laptop' | 'tablet' | 'mobile' | 'ereader';

export interface FormatPreset {
  label: string;
  viewportWidth: number; // px - viewport width
  pagePixelHeight: number; // px - page height
  dpi: number;
}

export interface PaginationConfig {
  pageWidth: number; // px
  pageHeight: number; // px
  marginTop: number; // px
  marginBottom: number; // px
  marginLeft: number; // px
  marginRight: number; // px
  fontSize: number; // px
  lineHeight: number; // unitless multiplier
}

export interface PaginationConfigOverrides {
  fontSize?: string | number;
  margins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

// ==================== FORMAT PRESETS ====================

export const FORMAT_PRESETS: Record<PreviewFormat, FormatPreset> = {
  laptop: {
    label: 'Laptop (6×9")',
    viewportWidth: 576, // 6in × 96dpi
    pagePixelHeight: 864, // 9in × 96dpi
    dpi: 96,
  },
  tablet: {
    label: 'Tablet (5.5×8.5")',
    viewportWidth: 528, // 5.5in × 96dpi
    pagePixelHeight: 816, // 8.5in × 96dpi
    dpi: 96,
  },
  mobile: {
    label: 'Móvil (3.7×6.2")',
    viewportWidth: 355, // 3.7in × 96dpi
    pagePixelHeight: 595, // 6.2in × 96dpi
    dpi: 96,
  },
  ereader: {
    label: 'eReader (5×7.5")',
    viewportWidth: 480, // 5in × 96dpi
    pagePixelHeight: 720, // 7.5in × 96dpi
    dpi: 96,
  },
};

// ==================== PAGINATION CONFIGS ====================

export const DEVICE_PAGINATION_CONFIGS: Record<PreviewFormat, PaginationConfig> = {
  laptop: {
    pageWidth: 576,
    pageHeight: 864,
    marginTop: 72, // 0.75in
    marginBottom: 72, // 0.75in
    marginLeft: 72, // 0.75in
    marginRight: 72, // 0.75in
    fontSize: 16,
    lineHeight: 1.4,
  },
  tablet: {
    pageWidth: 528,
    pageHeight: 816,
    marginTop: 64, // 0.67in
    marginBottom: 64,
    marginLeft: 48, // 0.5in
    marginRight: 48,
    fontSize: 15,
    lineHeight: 1.35,
  },
  mobile: {
    pageWidth: 355,
    pageHeight: 595,
    marginTop: 48, // 0.5in
    marginBottom: 48,
    marginLeft: 32, // 0.33in
    marginRight: 32,
    fontSize: 14,
    lineHeight: 1.35,
  },
  ereader: {
    pageWidth: 480,
    pageHeight: 720,
    marginTop: 56, // 0.58in
    marginBottom: 56,
    marginLeft: 40, // 0.42in
    marginRight: 40,
    fontSize: 16,
    lineHeight: 1.5,
  },
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Get readable dimensions for a format
 */
export function getFormatDimensions(format: PreviewFormat): string {
  const preset = FORMAT_PRESETS[format];
  const widthInches = (preset.viewportWidth / preset.dpi).toFixed(1);
  const heightInches = (preset.pagePixelHeight / preset.dpi).toFixed(1);
  return `${widthInches}×${heightInches}"`;
}

/**
 * Calculate content area dimensions (excluding margins)
 */
export function getContentAreaDimensions(
  format: PreviewFormat,
): { width: number; height: number } {
  const config = DEVICE_PAGINATION_CONFIGS[format];
  return {
    width: config.pageWidth - config.marginLeft - config.marginRight,
    height: config.pageHeight - config.marginTop - config.marginBottom,
  };
}

/**
 * Calculate approximate lines per page for a format
 */
export function getApproxLinesPerPage(format: PreviewFormat): number {
  const config = DEVICE_PAGINATION_CONFIGS[format];
  const contentHeight = config.pageHeight - config.marginTop - config.marginBottom;
  const lineHeight = config.fontSize * config.lineHeight;
  return Math.floor(contentHeight / lineHeight);
}

export function buildPaginationConfig(
  format: PreviewFormat,
  overrides?: PaginationConfigOverrides,
): PaginationConfig {
  const baseConfig = DEVICE_PAGINATION_CONFIGS[format];
  const parsedFontSize =
    typeof overrides?.fontSize === 'string'
      ? Number.parseInt(overrides.fontSize, 10)
      : overrides?.fontSize;

  return {
    ...baseConfig,
    fontSize:
      typeof parsedFontSize === 'number' && Number.isFinite(parsedFontSize)
        ? parsedFontSize
        : baseConfig.fontSize,
    marginTop: overrides?.margins?.top ?? baseConfig.marginTop,
    marginBottom: overrides?.margins?.bottom ?? baseConfig.marginBottom,
    marginLeft: overrides?.margins?.left ?? baseConfig.marginLeft,
    marginRight: overrides?.margins?.right ?? baseConfig.marginRight,
  };
}
