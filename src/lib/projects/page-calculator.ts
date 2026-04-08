/**
 * Page calculation utility considering device, font size, and margins
 */

export interface PageCalculationConfig {
  device: 'mobile' | 'tablet' | 'desktop';
  fontSize: string; // e.g., "16px"
  marginTop: number; // pixels
  marginBottom: number; // pixels
  marginLeft: number; // pixels
  marginRight: number; // pixels
}

export interface DeviceSpecifications {
  viewportWidth: number; // content width in pixels
  viewportHeight: number; // typical page height in pixels
}

// Device viewport specifications (after any container constraints)
const DEVICE_SPECS: Record<string, DeviceSpecifications> = {
  mobile: {
    viewportWidth: 375,
    viewportHeight: 600, // mobile screens are taller but narrower
  },
  tablet: {
    viewportWidth: 768,
    viewportHeight: 900,
  },
  desktop: {
    viewportWidth: 1200, // typical content area
    viewportHeight: 1000, // standard page height
  },
};

// Font size to characters per line mapping (approximate)
// Based on typical monospace and proportional fonts
const CHAR_PER_LINE: Record<string, number> = {
  '12px': 80,
  '14px': 70,
  '16px': 60,
  '18px': 55,
  '20px': 50,
  '24px': 42,
  '28px': 37,
  '32px': 33,
};

/**
 * Extract numeric value from font size string (e.g., "16px" -> 16)
 */
function parseFontSize(fontSizeStr: string): number {
  return parseInt(fontSizeStr.replace('px', ''), 10) || 16;
}

/**
 * Get characters per line based on font size
 * Falls back to interpolation if exact match not found
 */
function getCharactersPerLine(fontSize: string): number {
  if (CHAR_PER_LINE[fontSize]) {
    return CHAR_PER_LINE[fontSize];
  }

  const numSize = parseFontSize(fontSize);

  // Interpolate based on size
  if (numSize <= 12) return 80;
  if (numSize >= 32) return 33;

  // Linear interpolation between 16px (60 chars) and 24px (42 chars)
  if (numSize >= 16 && numSize <= 24) {
    const ratio = (numSize - 16) / (24 - 16);
    return Math.round(60 - ratio * 18);
  }

  return 60; // default
}

/**
 * Calculate words per page based on device, font size, and margins
 */
export function calculateWordsPerPage(config: PageCalculationConfig): number {
  const specs = DEVICE_SPECS[config.device];

  // Calculate available space for content
  const availableWidth = Math.max(
    100,
    specs.viewportWidth - config.marginLeft - config.marginRight
  );
  const availableHeight = Math.max(
    200,
    specs.viewportHeight - config.marginTop - config.marginBottom
  );

  // Get font size in pixels
  const fontSizeNum = parseFontSize(config.fontSize);

  // Calculate line height (typically 1.5x font size)
  const lineHeight = fontSizeNum * 1.5;

  // Calculate how many lines fit in available height
  const linesPerPage = Math.floor(availableHeight / lineHeight);

  // Get characters per line based on font size and available width
  // Account for margin reduction in line width
  const baseCharsPerLine = getCharactersPerLine(config.fontSize);
  const charsPerLine = Math.floor((availableWidth / specs.viewportWidth) * baseCharsPerLine);

  // Average word length in Spanish/English is ~5 characters + 1 space = 6 chars per word
  const wordsPerLine = Math.max(1, Math.floor(charsPerLine / 6));

  // Total words per page
  const wordsPerPage = Math.max(100, linesPerPage * wordsPerLine);

  return wordsPerPage;
}

/**
 * Estimate total pages needed for given content
 */
export function estimateTotalPages(
  htmlContent: string,
  config: PageCalculationConfig
): number {
  // Count words in HTML content (strip tags)
  const plainText = htmlContent.replace(/<[^>]*>/g, '');
  const wordCount = plainText
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

  const wordsPerPage = calculateWordsPerPage(config);
  const pageCount = Math.max(1, Math.ceil(wordCount / wordsPerPage));

  return pageCount;
}

/**
 * Margin presets for quick selection
 */
export const MARGIN_PRESETS = {
  compact: { top: 12, bottom: 12, left: 16, right: 16 },
  normal: { top: 24, bottom: 24, left: 24, right: 24 },
  spacious: { top: 32, bottom: 32, left: 32, right: 32 },
  bookStyle: { top: 36, bottom: 36, left: 48, right: 36 },
  minimal: { top: 8, bottom: 8, left: 12, right: 12 },
} as const;

export type MarginPreset = keyof typeof MARGIN_PRESETS;
