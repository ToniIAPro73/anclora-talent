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
