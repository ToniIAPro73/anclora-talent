/**
 * Operations Talent emits to FileStudio — verified against the real operation
 * catalog (anclora-filestudio `src/lib/domain/operations.ts`, code wins).
 *
 * Cover optimization uses `image:resize` (sharp-image engine): one job per
 * target width, `fit: "inside"` so the aspect ratio is preserved and only the
 * width is constrained. The Service API accepts the operation through
 * POST /api/v1/jobs (`apps/api/src/routes/jobs.ts` CreateJobSchema).
 *
 * Documented gap: the Local Agent registry
 * (`apps/local-agent/src/operations.ts`) only ships `data.json-to-yaml`,
 * `data.yaml-to-json` and `image.png-to-webp` today; `image:resize` must land
 * in the agent before Mode 1 can execute it for real. Talent already routes
 * and speaks the agreed payload so the wiring is a no-op once it does.
 */

export const COVER_OPTIMIZE_OPERATION = 'image:resize';

/** Target widths (px) for the cover derivative set, largest first. */
export const COVER_OPTIMIZE_WIDTHS = [1600, 800, 400] as const;

export type CoverOptimizeOptions = {
  width: number;
  fit: 'inside';
  quality: number;
};

/** Options payload matching the `image:resize` optionsSchema in FileStudio. */
export function coverOptimizeOptions(width: number): CoverOptimizeOptions {
  return { width, fit: 'inside', quality: 85 };
}

// ── Ebook legacy formats (Calibre) ──────────────────────────────────────────

/**
 * EPUB → MOBI/AZW3 delegation. Verified against the real engine
 * (anclora-filestudio `src/lib/engines/ebook/calibre-engine.ts`, code wins):
 * the engine operation id is `convert-ebook` and its execute() reads
 * `title` / `author` / `language` from the job options; the target format
 * travels with the conversion plan, so on the Service API it is declared as
 * the `outputFormat` option.
 *
 * Documented gap: Calibre is a desktop-only engine and the Local Agent
 * registry ships no ebook operation, so Talent always emits these jobs in
 * Mode 2 (service) — declared routing, no Mode 1 fallback.
 */
export const EBOOK_CONVERT_OPERATION = 'convert-ebook';

/** Legacy Kindle formats the launch pack derives from the compositor EPUB. */
export const EBOOK_LEGACY_FORMATS = ['mobi', 'azw3'] as const;
export type EbookLegacyFormat = (typeof EBOOK_LEGACY_FORMATS)[number];

export type EbookConvertOptions = {
  outputFormat: EbookLegacyFormat;
  title?: string;
  author?: string;
  language?: string;
};

/** Options payload matching the Calibre engine's documented option keys. */
export function ebookConvertOptions(
  format: EbookLegacyFormat,
  metadata: { title?: string; author?: string; language?: string },
): EbookConvertOptions {
  return {
    outputFormat: format,
    ...(metadata.title ? { title: metadata.title } : {}),
    ...(metadata.author ? { author: metadata.author } : {}),
    ...(metadata.language ? { language: metadata.language } : {}),
  };
}
