import {
  buildPaginationConfig,
  type PaginationConfig,
  type PreviewFormat,
} from '@/lib/preview/device-configs';
import {
  defaultEditorPreferences,
  type EditorPreferences,
} from '@/lib/ui-preferences/preferences';

const VALID_EXPORT_FORMATS: PreviewFormat[] = ['mobile', 'tablet', 'laptop', 'ereader'];

function parsePositiveInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
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
  const fontSize = searchParams.get('fontSize') ?? defaultEditorPreferences.fontSize;

  return buildPaginationConfig(device, {
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
}

export function buildExportQueryString(preferences: EditorPreferences): string {
  const params = new URLSearchParams();
  const device = preferences.device === 'desktop' ? 'laptop' : preferences.device ?? 'laptop';

  params.set('device', device);
  params.set('fontSize', preferences.fontSize ?? defaultEditorPreferences.fontSize!);
  params.set('marginTop', String(preferences.margins?.top ?? defaultEditorPreferences.margins!.top));
  params.set(
    'marginBottom',
    String(preferences.margins?.bottom ?? defaultEditorPreferences.margins!.bottom),
  );
  params.set('marginLeft', String(preferences.margins?.left ?? defaultEditorPreferences.margins!.left));
  params.set(
    'marginRight',
    String(preferences.margins?.right ?? defaultEditorPreferences.margins!.right),
  );

  return params.toString();
}
