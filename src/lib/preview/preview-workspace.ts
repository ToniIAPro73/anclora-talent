/**
 * Pure model of the Step 5 preview workspace. Everything here is a projection of the canonical composition:
 * nothing in this file paginates, measures text or touches project data.
 */
import type { ComposeViolation } from '@/lib/compose/compose';
import type { PreflightCheck } from '@/lib/preflight/preflight';
import {
  buildPaginationConfig,
  type PaginationConfig,
  type PaginationConfigOverrides,
  type PreviewFormat,
} from '@/lib/preview/device-configs';

export type PreviewMode = 'document' | 'spread' | 'cover';
export type ReadingDestination = 'print' | 'desktop' | 'tablet' | 'ereader';
export type CoverSurfaceKind = 'front' | 'back';

export const PREVIEW_DESTINATIONS: readonly ReadingDestination[] = ['print', 'desktop', 'tablet', 'ereader'];
export const PREVIEW_MODES: readonly PreviewMode[] = ['document', 'spread', 'cover'];

export const ZOOM_MIN = 50;
export const ZOOM_MAX = 150;
/** Fit may go below the manual minimum on small viewports: the goal is a fully visible page. */
export const FIT_MIN = 20;

export function isReadingDestination(value: unknown): value is ReadingDestination {
  return typeof value === 'string' && (PREVIEW_DESTINATIONS as readonly string[]).includes(value);
}

export function isPreviewMode(value: unknown): value is PreviewMode {
  return typeof value === 'string' && (PREVIEW_MODES as readonly string[]).includes(value);
}

/** Device presets (page size, margins) behind each destination; print keeps the project/source geometry. */
export function destinationFormat(destination: ReadingDestination): PreviewFormat {
  if (destination === 'tablet') return 'tablet';
  if (destination === 'ereader') return 'ereader';
  return 'laptop';
}

/** Facing pages only exist where the destination is a book (print) or a wide reading surface (desktop). */
export function destinationSupportsSpread(destination: ReadingDestination): boolean {
  return destination === 'print' || destination === 'desktop';
}

export interface PreviewGeometry {
  config: PaginationConfig;
  /** True when the source document's own pagination/geometry is authoritative (the destination only frames it). */
  sourceAuthoritative: boolean;
  /** True when the destination recomposed the document with its own page geometry. */
  recomposedForDevice: boolean;
}

/**
 * Print uses the project's geometry; digital destinations recompose reflowable documents with the device preset.
 * Source-fidelity documents never reflow: their pages are scaled into the destination's viewing area.
 */
export function resolvePreviewGeometry(input: {
  destination: ReadingDestination;
  sourceFidelity: boolean;
  /** Typography/geometry resolved from the document style map (the project's own settings). */
  projectOverrides: PaginationConfigOverrides;
}): PreviewGeometry {
  const projectConfig = buildPaginationConfig('laptop', input.projectOverrides);
  if (input.sourceFidelity || input.destination === 'print') {
    return { config: projectConfig, sourceAuthoritative: input.sourceFidelity, recomposedForDevice: false };
  }
  const { fontSize, lineHeight } = input.projectOverrides;
  const config = buildPaginationConfig(destinationFormat(input.destination), { fontSize, lineHeight });
  return { config, sourceAuthoritative: false, recomposedForDevice: true };
}

// ---------------------------------------------------------------------------------------------------------------
// Logical pages and spreads

export type LogicalPageKind = 'cover' | 'content' | 'back-cover';

export interface LogicalPage {
  /** 0-based position in the preview sequence (cover = 0). */
  index: number;
  kind: LogicalPageKind;
  /** 0-based index inside the content flow. */
  contentIndex?: number;
  /** Printed number (the cover counts as page 1); absent for the editorial surfaces. */
  printedNumber?: number;
}

export function buildLogicalPages(input: { contentPageCount: number; hasBackCover: boolean }): LogicalPage[] {
  const pages: LogicalPage[] = [{ index: 0, kind: 'cover' }];
  for (let contentIndex = 0; contentIndex < Math.max(0, input.contentPageCount); contentIndex += 1) {
    pages.push({ index: contentIndex + 1, kind: 'content', contentIndex, printedNumber: contentIndex + 2 });
  }
  if (input.hasBackCover) pages.push({ index: pages.length, kind: 'back-cover' });
  return pages;
}

export interface Spread {
  /** Left page (verso). Null when the right page opens the spread alone. */
  left: LogicalPage | null;
  right: LogicalPage | null;
}

/** Content spreads pair an even printed page (left) with the next odd one; cover and back cover stand alone. */
export function spreadAt(pages: LogicalPage[], index: number): Spread {
  const page = pages[Math.max(0, Math.min(index, pages.length - 1))];
  if (!page || page.kind !== 'content') return { left: null, right: page ?? null };
  const contentIndex = page.contentIndex ?? 0;
  const leftContentIndex = contentIndex - (contentIndex % 2);
  const left = pages.find((candidate) => candidate.kind === 'content' && candidate.contentIndex === leftContentIndex) ?? null;
  const right = pages.find((candidate) => candidate.kind === 'content' && candidate.contentIndex === leftContentIndex + 1) ?? null;
  return { left, right };
}

export function stepPage(pages: LogicalPage[], index: number, direction: 1 | -1, mode: PreviewMode): number {
  const last = pages.length - 1;
  if (mode !== 'spread') return Math.max(0, Math.min(last, index + direction));
  const current = spreadAt(pages, index);
  const anchor = direction === 1 ? (current.right ?? current.left) : (current.left ?? current.right);
  const next = (anchor?.index ?? index) + direction;
  const target = Math.max(0, Math.min(last, next));
  const targetSpread = spreadAt(pages, target);
  return (targetSpread.left ?? targetSpread.right)?.index ?? target;
}

// ---------------------------------------------------------------------------------------------------------------
// Fit and zoom

export function clampZoom(percent: number): number {
  if (!Number.isFinite(percent)) return 100;
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(percent)));
}

/** Largest integer percentage at which the whole content (page or spread) fits the stage, capped at 100 %. */
export function fitZoom(input: { stageWidth: number; stageHeight: number; contentWidth: number; contentHeight: number; padding?: number }): number {
  const padding = input.padding ?? 32;
  if (input.contentWidth <= 0 || input.contentHeight <= 0) return 100;
  const ratio = Math.min(
    (input.stageWidth - padding) / input.contentWidth,
    (input.stageHeight - padding) / input.contentHeight,
    1,
  );
  return Math.max(FIT_MIN, Math.floor(ratio * 100));
}

// ---------------------------------------------------------------------------------------------------------------
// Metrics

export interface PreviewMetrics {
  total: number;
  content: number;
  preliminary: number;
  hasCover: boolean;
  hasBackCover: boolean;
}

const PRELIMINARY_TYPES = new Set(['front-matter', 'toc', 'prologue']);

export function isPreliminarySemanticType(type: string | undefined | null): boolean {
  return Boolean(type && PRELIMINARY_TYPES.has(type));
}

export function computeMetrics(input: {
  pages: LogicalPage[];
  /** Semantic type of the chapter each content page belongs to (same order as the content pages). */
  contentPageSemanticTypes: Array<string | undefined | null>;
}): PreviewMetrics {
  const content = input.pages.filter((page) => page.kind === 'content').length;
  const preliminary = input.contentPageSemanticTypes.slice(0, content).filter(isPreliminarySemanticType).length;
  return {
    total: input.pages.length,
    content,
    preliminary,
    hasCover: input.pages.some((page) => page.kind === 'cover'),
    hasBackCover: input.pages.some((page) => page.kind === 'back-cover'),
  };
}

export function marginsToMillimetres(margins: { top: number; bottom: number; left: number; right: number }) {
  const mm = (px: number) => Math.round((px / 96) * 25.4);
  return { top: mm(margins.top), bottom: mm(margins.bottom), left: mm(margins.left), right: mm(margins.right) };
}

export function formatPageSize(config: Pick<PaginationConfig, 'pageWidth' | 'pageHeight'>): { inches: string; millimetres: string } {
  const widthIn = config.pageWidth / 96;
  const heightIn = config.pageHeight / 96;
  const trim = (value: number) => String(Math.round(value * 100) / 100);
  return {
    inches: `${trim(widthIn)} × ${trim(heightIn)} in`,
    millimetres: `${Math.round(widthIn * 25.4)} × ${Math.round(heightIn * 25.4)} mm`,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Preflight rows (only checks that really run; the rest is reported as not checked)

export type PreflightRowId = 'fonts' | 'images' | 'metadata' | 'composition' | 'safeArea';
export type PreflightRowStatus = 'ok' | 'info' | 'warning' | 'error' | 'unchecked';

export interface PreflightFinding {
  id: string;
  rule: string;
  severity: 'error' | 'warning' | 'info';
  params: Record<string, string>;
  /** 0-based logical page to navigate to, when the finding anchors to a page. */
  logicalPage?: number;
  message?: string;
}

export interface PreflightRow {
  id: PreflightRowId;
  status: PreflightRowStatus;
  findings: PreflightFinding[];
  /** The analyzer is a heuristic and cannot certify the property (images resolution). */
  partial?: boolean;
}

function worst(findings: PreflightFinding[]): PreflightRowStatus {
  if (findings.some((finding) => finding.severity === 'error')) return 'error';
  if (findings.some((finding) => finding.severity === 'warning')) return 'warning';
  if (findings.length) return 'info';
  return 'ok';
}

export function buildPreflightRows(input: {
  checks: PreflightCheck[];
  violations: ComposeViolation[];
  /** Maps a 0-based composition page index to the logical preview page. */
  toLogicalPage: (compositionPage: number) => number;
}): PreflightRow[] {
  const fromCheck = (check: PreflightCheck, index: number): PreflightFinding => ({
    id: `${check.rule}:${check.blockId ?? index}`,
    rule: check.rule,
    severity: check.severity,
    params: check.params,
    ...(check.page !== undefined ? { logicalPage: input.toLogicalPage(check.page) } : {}),
  });
  // The same rule is evaluated once per channel (kdp.fonts.embed, kobo.fonts.embed…): one finding per rule and target.
  const byRule = (needle: string) => {
    const seen = new Set<string>();
    return input.checks
      .filter((check) => check.rule.includes(needle))
      .filter((check) => {
        const key = `${check.rule.split('.').slice(1).join('.')}|${JSON.stringify(check.params)}|${check.blockId ?? ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(fromCheck);
  };
  const fonts = byRule('.fonts.');
  const images = [...byRule('.image.'), ...byRule('.a11y.imageAlt')];
  const metadata = byRule('.metadata.');
  const composition: PreflightFinding[] = input.violations.map((violation, index) => ({
    id: `${violation.rule}:${violation.blockId}:${index}`,
    rule: violation.rule,
    severity: 'warning',
    params: {},
    message: violation.message,
    logicalPage: input.toLogicalPage(violation.page),
  }));
  return [
    { id: 'fonts', status: worst(fonts), findings: fonts },
    { id: 'images', status: worst(images), findings: images, partial: true },
    { id: 'metadata', status: worst(metadata), findings: metadata },
    { id: 'composition', status: worst(composition), findings: composition },
    { id: 'safeArea', status: 'unchecked', findings: [] },
  ];
}
