/**
 * Pure model of the Step 8 export workspace: which formats exist, whether each is available (from the project
 * capabilities — never re-derived), which blockers apply to which format, and the small derived values the UI shows.
 * It orchestrates the existing routes; it does not build any artifact.
 */

import type { ComposeViolation } from '@/lib/compose/compose';
import type { DocumentRules } from '@/lib/compose/rules';
import type { PreflightCheck } from '@/lib/preflight/preflight';
import type { PreviewFormat } from '@/lib/preview/device-configs';
import { FORMAT_PRESETS } from '@/lib/preview/device-configs';
import { resolveExportPaginationConfig } from '@/lib/projects/export-config';
import type { ProjectCapabilities } from '@/lib/projects/capabilities';

export type ExportFormat = 'pdf' | 'epub' | 'docx' | 'html' | 'markdown';
export type ExportKind = 'fixed-layout' | 'reflowable' | 'editable' | 'web' | 'text';

export interface ExportFormatDefinition {
  id: ExportFormat;
  /** API route (GET, `projectId` + export query). */
  route: string;
  extension: string;
  kind: ExportKind;
  /** Page geometry (size, margins) is an input of this format's builder. */
  usesPageGeometry: boolean;
  mime: RegExp;
}

export const EXPORT_FORMATS: readonly ExportFormatDefinition[] = [
  { id: 'pdf', route: '/api/projects/export/pdf', extension: 'pdf', kind: 'fixed-layout', usesPageGeometry: true, mime: /^application\/pdf/ },
  { id: 'epub', route: '/api/projects/export/epub', extension: 'epub', kind: 'reflowable', usesPageGeometry: false, mime: /^application\/epub\+zip/ },
  { id: 'docx', route: '/api/projects/export/docx', extension: 'docx', kind: 'editable', usesPageGeometry: true, mime: /^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document/ },
  { id: 'html', route: '/api/projects/export', extension: 'html', kind: 'web', usesPageGeometry: false, mime: /^text\/html/ },
  { id: 'markdown', route: '/api/projects/export/markdown', extension: 'md', kind: 'text', usesPageGeometry: false, mime: /^text\/markdown/ },
];

export function formatDefinition(id: ExportFormat): ExportFormatDefinition {
  return EXPORT_FORMATS.find((format) => format.id === id) as ExportFormatDefinition;
}

export type FormatAvailability = { available: true } | { available: false; reason: 'fixedPdf' };

/** Availability comes straight from `getProjectCapabilities` (the single source of truth). */
export function formatAvailability(format: ExportFormat, capabilities: ProjectCapabilities): FormatAvailability {
  const ok = {
    pdf: capabilities.canExportOriginalPdf,
    epub: capabilities.canExportEpub,
    docx: capabilities.canExportDocx,
    html: capabilities.canExportHtml,
    markdown: capabilities.canExportMarkdown,
  }[format];
  return ok ? { available: true } : { available: false, reason: 'fixedPdf' };
}

/** Fixed-layout PDF projects: PDF export returns the original bytes, the composer never runs. */
export function isOriginalPdfExport(format: ExportFormat, capabilities: ProjectCapabilities): boolean {
  return format === 'pdf' && !capabilities.canCompose;
}

// ---------------------------------------------------------------------------------------------------------------
// Gating

export interface FormatGate {
  blocked: boolean;
  /** Composition violations that apply to this format. */
  violations: number;
  /** Preflight errors that apply to this format. */
  errors: PreflightCheck[];
  /** Errors as the user reads them: preflight errors, plus violations when the document policy treats them as blocking. */
  errorCount: number;
  /** Everything that only warns. */
  warningCount: number;
}

const CHANNELS_BY_FORMAT: Record<ExportFormat, Array<'kdp' | 'ingram' | 'kobo'>> = {
  pdf: ['kdp', 'ingram'],
  epub: ['kdp', 'ingram', 'kobo'],
  docx: ['kdp'],
  html: [],
  markdown: [],
};

/** Page-layout violations only matter where a layout is produced (EPUB included: the server refuses them). */
const VIOLATION_FORMATS: ExportFormat[] = ['pdf', 'epub'];

function channelOf(check: PreflightCheck): 'kdp' | 'ingram' | 'kobo' {
  return check.channel === 'ingramspark' ? 'ingram' : check.channel;
}

export function formatGate(input: {
  format: ExportFormat;
  exportGate: DocumentRules['exportGate'];
  violations: ComposeViolation[];
  checks: PreflightCheck[];
  capabilities: ProjectCapabilities;
}): FormatGate {
  // Fixed-PDF documents are not governed by Talent's composition: nothing can block (or warn about) the original.
  if (!input.capabilities.canCompose) return { blocked: false, violations: 0, errors: [], errorCount: 0, warningCount: 0 };
  const violations = VIOLATION_FORMATS.includes(input.format) ? input.violations.length : 0;
  const channels = CHANNELS_BY_FORMAT[input.format];
  const relevant = input.checks.filter((check) => channels.includes(channelOf(check)));
  const errors = dedupeChecks(relevant.filter((check) => check.severity === 'error'));
  const nonErrors = dedupeChecks(relevant.filter((check) => check.severity !== 'error')).length;
  const policyBlocks = input.exportGate === 'block';
  const errorCount = errors.length + (policyBlocks ? violations : 0);
  return {
    blocked: policyBlocks && errorCount > 0,
    violations,
    errors,
    errorCount,
    warningCount: nonErrors + (policyBlocks ? 0 : violations),
  };
}

/** The same rule is evaluated once per channel (kdp.metadata.title / kobo.metadata.title): count it once. */
export function dedupeChecks(checks: PreflightCheck[]): PreflightCheck[] {
  const seen = new Set<string>();
  return checks.filter((check) => {
    const key = `${check.rule.split('.').slice(1).join('.')}|${check.blockId ?? ''}|${JSON.stringify(check.params)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Export request

export const PAGE_SIZE_OPTIONS: PreviewFormat[] = ['laptop', 'tablet', 'ereader', 'mobile'];

export function pageSizeLabel(format: PreviewFormat): string {
  const preset = FORMAT_PRESETS[format];
  const inches = (px: number) => String(Math.round((px / preset.dpi) * 100) / 100);
  return `${inches(preset.viewportWidth)} × ${inches(preset.pagePixelHeight)} in`;
}

/** The export-only page size travels as the route's own `device` parameter; nothing is persisted. */
export function buildExportUrl(
  format: ExportFormat,
  projectId: string,
  baseQuery: string,
  options: { pageSize?: PreviewFormat; original?: boolean } = {},
): string {
  const definition = formatDefinition(format);
  const params = new URLSearchParams(baseQuery);
  if (options.pageSize && definition.usesPageGeometry && !options.original) params.set('device', options.pageSize);
  const query = options.original ? '' : params.toString();
  return `${definition.route}?projectId=${encodeURIComponent(projectId)}${query ? `&${query}` : ''}`;
}

export function effectivePageSize(baseQuery: string): PreviewFormat {
  const device = new URLSearchParams(baseQuery).get('device');
  return PAGE_SIZE_OPTIONS.includes(device as PreviewFormat) ? (device as PreviewFormat) : 'laptop';
}

export interface ExportGeometrySummary {
  pageSize: PreviewFormat;
  widthIn: number;
  heightIn: number;
  marginsMm: { top: number; bottom: number; left: number; right: number };
  fontSizePx: number;
  lineHeight: number;
}

/** Exactly what the export route will use for this query (same resolver as the route). */
export function summarizeExportGeometry(baseQuery: string, pageSize: PreviewFormat): ExportGeometrySummary {
  const params = new URLSearchParams(baseQuery);
  params.set('device', pageSize);
  const config = resolveExportPaginationConfig(params);
  const mm = (px: number) => Math.round((px / 96) * 25.4);
  return {
    pageSize,
    widthIn: Math.round((config.pageWidth / 96) * 100) / 100,
    heightIn: Math.round((config.pageHeight / 96) * 100) / 100,
    marginsMm: { top: mm(config.marginTop), bottom: mm(config.marginBottom), left: mm(config.marginLeft), right: mm(config.marginRight) },
    fontSizePx: config.fontSize,
    lineHeight: config.lineHeight,
  };
}

export function exportFileName(slug: string | undefined, format: ExportFormat, fallback = 'proyecto'): string {
  return `${slug || fallback}.${formatDefinition(format).extension}`;
}

export function formatFileSize(bytes: number, locale: string): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: value < 10 ? 1 : 0 }).format(value)} ${units[unit]}`;
}
