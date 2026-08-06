import {
  buildPaginationConfig,
  type PaginationConfig,
  type PreviewFormat,
} from '@/lib/preview/device-configs';
import {
  defaultEditorPreferences,
  type EditorPreferences,
} from '@/lib/ui-preferences/preferences';
import {
  mergeCompositionSettings,
  parseCompositionSettings,
} from '@/lib/projects/composition';
import type { ProjectRecord } from '@/lib/projects/types';

const VALID_EXPORT_FORMATS: PreviewFormat[] = ['mobile', 'tablet', 'laptop', 'ereader'];

/** CSS px per typographic pt at 96dpi. */
const PX_PER_PT = 96 / 72;

function parsePositiveInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function parsePositiveFloat(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function normalizeExportFormat(value: string | null | undefined): PreviewFormat {
  if (value && VALID_EXPORT_FORMATS.includes(value as PreviewFormat)) {
    return value as PreviewFormat;
  }

  return defaultEditorPreferences.device === 'desktop' ? 'laptop' : 'mobile';
}

export function resolveExportPaginationConfig(
  searchParams: URLSearchParams,
): PaginationConfig {
  const device = normalizeExportFormat(searchParams.get('device'));
  // U6: an explicit pt size wins over the legacy px fontSize param.
  const fontSizePt = parsePositiveFloat(searchParams.get('fontSizePt'));
  const fontSize = fontSizePt
    ? String(Math.round(fontSizePt * PX_PER_PT))
    : (searchParams.get('fontSize') ?? defaultEditorPreferences.fontSize);
  const lineHeight = parsePositiveFloat(searchParams.get('lineHeight'));

  const config = buildPaginationConfig(device, {
    fontSize,
    margins: {
      top: parsePositiveInt(searchParams.get('marginTop')) ?? defaultEditorPreferences.margins!.top,
      bottom:
        parsePositiveInt(searchParams.get('marginBottom')) ??
        defaultEditorPreferences.margins!.bottom,
      left: parsePositiveInt(searchParams.get('marginLeft')) ?? defaultEditorPreferences.margins!.left,
      right:
        parsePositiveInt(searchParams.get('marginRight')) ?? defaultEditorPreferences.margins!.right,
    },
  });

  return lineHeight ? { ...config, lineHeight } : config;
}

/**
 * Builds the export query string from the editor preferences. When a project
 * is provided and an effective composition exists (project composition >
 * `preferences.compositionDefaults`), its pt size / line-height / margins
 * override the editor-preference px values.
 */
export function buildExportQueryString(
  preferences: EditorPreferences,
  project?: ProjectRecord,
): string {
  const params = new URLSearchParams();
  const device = preferences.device === 'desktop' ? 'laptop' : preferences.device ?? 'laptop';

  params.set('device', device);
  params.set('fontSize', preferences.fontSize ?? defaultEditorPreferences.fontSize!);

  const projectComposition = project
    ? parseCompositionSettings(project.document.metadata?.composition)
    : null;
  const userDefaults = parseCompositionSettings(preferences.compositionDefaults);
  const composition =
    projectComposition || userDefaults
      ? mergeCompositionSettings(projectComposition, userDefaults)
      : null;

  const margins = composition?.margins ?? preferences.margins ?? defaultEditorPreferences.margins!;
  params.set('marginTop', String(margins.top));
  params.set('marginBottom', String(margins.bottom));
  params.set('marginLeft', String(margins.left));
  params.set('marginRight', String(margins.right));

  if (composition?.fontSizePt !== undefined) {
    params.set('fontSizePt', String(composition.fontSizePt));
  }
  if (composition?.lineHeight !== undefined) {
    params.set('lineHeight', String(composition.lineHeight));
  }

  return params.toString();
}
