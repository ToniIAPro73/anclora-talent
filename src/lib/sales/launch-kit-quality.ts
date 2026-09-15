/**
 * Launch kit quality gate (Fase 2.4).
 *
 * A commercial package that only contains a title is not a success: the
 * seller cannot publish from a title alone, and returning one anyway (as
 * this pipeline did for fixed-pdf projects before the semantic sidecar
 * existed) is a fail-open bug, not a "technically it generated a file"
 * feature. This gate is the single place every commercial-asset consumer
 * (Hotmart export today; Gumroad push / launch-pack marketing assets can
 * reuse it) checks before declaring success.
 */

import type { LaunchKit } from './launch-kit';

export type LaunchKitQualityReason = 'no-title' | 'insufficient-content';

export interface LaunchKitQuality {
  sufficient: boolean;
  reason?: LaunchKitQualityReason;
}

/**
 * Minimum combined length (description + bullets) below which the package
 * is considered "title-only" regardless of how it was derived. Chosen well
 * above a bare title or a single short heading, well below a real
 * description paragraph or a handful of chapter-title bullets.
 */
const MIN_MEANINGFUL_CHARS = 120;

export function assessLaunchKitQuality(kit: LaunchKit): LaunchKitQuality {
  const { sheet } = kit;

  if (!sheet.title?.trim()) {
    return { sufficient: false, reason: 'no-title' };
  }

  // A derived-from-nothing description falls back to the title itself
  // (`descriptionSource: 'title-only'`) — that text carries no information
  // beyond the title already checked above, so it never counts as content.
  const descriptionChars = sheet.descriptionSource === 'title-only' ? 0 : sheet.longDescription.trim().length;
  const bulletsChars = sheet.bullets.join(' ').trim().length;

  if (descriptionChars + bulletsChars < MIN_MEANINGFUL_CHARS) {
    return { sufficient: false, reason: 'insufficient-content' };
  }

  return { sufficient: true };
}
