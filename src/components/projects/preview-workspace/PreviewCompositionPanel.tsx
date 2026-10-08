'use client';

import { AlertTriangle, CheckCircle2, Info, MinusCircle, XCircle } from 'lucide-react';
import type { AppMessages } from '@/lib/i18n/messages';
import {
  PREVIEW_DESTINATIONS,
  formatPageSize,
  marginsToMillimetres,
  type PreflightRow,
  type PreviewMetrics,
  type ReadingDestination,
} from '@/lib/preview/preview-workspace';

type Copy = AppMessages['project'];

function destinationLabel(copy: Copy, destination: ReadingDestination) {
  return destination === 'print' ? copy.pwDestPrint : destination === 'desktop' ? copy.pwDestDesktop : destination === 'tablet' ? copy.pwDestTablet : copy.pwDestEreader;
}

const ROW_LABEL: Record<PreflightRow['id'], keyof Copy> = {
  fonts: 'pwPfFonts',
  images: 'pwPfImages',
  metadata: 'pwPfMetadata',
  composition: 'pwPfComposition',
  safeArea: 'pwPfSafeArea',
};

function StatusIcon({ status }: { status: PreflightRow['status'] }) {
  if (status === 'ok') return <CheckCircle2 className="pw-pf__icon pw-pf__icon--ok" aria-hidden="true" />;
  if (status === 'error') return <XCircle className="pw-pf__icon pw-pf__icon--error" aria-hidden="true" />;
  if (status === 'warning') return <AlertTriangle className="pw-pf__icon pw-pf__icon--warning" aria-hidden="true" />;
  if (status === 'info') return <Info className="pw-pf__icon pw-pf__icon--info" aria-hidden="true" />;
  return <MinusCircle className="pw-pf__icon pw-pf__icon--unchecked" aria-hidden="true" />;
}

export function PreviewCompositionPanel({
  copy,
  destination,
  onDestinationChange,
  config,
  metrics,
  notice,
  rows,
  renderFinding,
  onGoToPage,
  busy,
}: {
  copy: Copy;
  destination: ReadingDestination;
  onDestinationChange: (destination: ReadingDestination) => void;
  config: { pageWidth: number; pageHeight: number; marginTop: number; marginBottom: number; marginLeft: number; marginRight: number };
  metrics: { total: number; content: number; preliminary: number; hasCover: boolean; hasBackCover: boolean } & Partial<PreviewMetrics>;
  notice: { kind: 'fixed' | 'recomposed'; text: string } | null;
  rows: PreflightRow[];
  renderFinding: (finding: PreflightRow['findings'][number]) => string;
  onGoToPage: (logicalPage: number) => void;
  busy: boolean;
}) {
  const size = formatPageSize(config);
  const margins = marginsToMillimetres({ top: config.marginTop, bottom: config.marginBottom, left: config.marginLeft, right: config.marginRight });

  return (
    <div className="pw-panel__body">
      <h2 className="pw-panel__title">{copy.pwCompositionTitle}</h2>

      <label className="pw-field">
        <span className="pw-field__label">{copy.pwDestination}</span>
        <select
          className="pw-select"
          data-testid="preview-destination"
          value={destination}
          onChange={(event) => onDestinationChange(event.target.value as ReadingDestination)}
        >
          {PREVIEW_DESTINATIONS.map((item) => (
            <option key={item} value={item}>{destinationLabel(copy, item)}</option>
          ))}
        </select>
      </label>

      {busy ? <p className="pw-notice" role="status" data-testid="preview-busy">{copy.pwBusy}</p> : null}
      {notice ? <p className="pw-notice" data-testid="preview-notice" data-notice-kind={notice.kind}>{notice.text}</p> : null}

      <div className="pw-field">
        <span className="pw-field__label">{copy.pwFormat}</span>
        <div className="pw-readout" data-testid="preview-format">{size.inches} <span>({size.millimetres})</span></div>
      </div>

      <div className="pw-field">
        <span className="pw-field__label">{copy.pwMargins}</span>
        <dl className="pw-margins" data-testid="preview-margins">
          <div><dt>{copy.pwMarginTop}</dt><dd>{margins.top} mm</dd></div>
          <div><dt>{copy.pwMarginBottom}</dt><dd>{margins.bottom} mm</dd></div>
          <div><dt>{copy.pwMarginInner}</dt><dd>{margins.left} mm</dd></div>
          <div><dt>{copy.pwMarginOuter}</dt><dd>{margins.right} mm</dd></div>
        </dl>
        <p className="pw-hint">{copy.pwMarginsNote}</p>
      </div>

      <section className="pw-section" aria-labelledby="pw-pages-heading">
        <h3 id="pw-pages-heading" className="pw-section__title">{copy.pwPagesSection}</h3>
        <dl className="pw-metrics" data-testid="preview-metrics">
          <div><dt>{copy.pwPagesTotal}</dt><dd data-testid="preview-metric-total">{metrics.total}</dd></div>
          <div><dt>{copy.pwPagesContent}</dt><dd data-testid="preview-metric-content">{metrics.content}</dd></div>
          <div><dt>{copy.pwPagesPreliminary}</dt><dd data-testid="preview-metric-preliminary">{metrics.preliminary}</dd></div>
          <div><dt>{copy.pwPagesCover}</dt><dd data-testid="preview-metric-cover">{metrics.hasCover ? copy.pwPresent : copy.pwAbsent}</dd></div>
          <div><dt>{copy.pwPagesBackCover}</dt><dd data-testid="preview-metric-back-cover">{metrics.hasBackCover ? copy.pwPresent : copy.pwAbsent}</dd></div>
        </dl>
      </section>

      <section className="pw-section" aria-labelledby="pw-preflight-heading" data-testid="preview-preflight">
        <h3 id="pw-preflight-heading" className="pw-section__title">{copy.pwPreflight}</h3>
        <ul className="pw-pf">
          {rows.map((row) => (
            <li key={row.id} className="pw-pf__row" data-testid={`preview-preflight-${row.id}`} data-status={row.status}>
              <StatusIcon status={row.status} />
              <div className="pw-pf__text">
                <strong>{String(copy[ROW_LABEL[row.id]])}</strong>
                <span className="pw-pf__detail">
                  {row.status === 'unchecked'
                    ? copy.pwPfUnchecked
                    : row.findings.length === 0
                      ? copy.pwPfOk
                      : copy.pwPfFindingsCount.replace('{count}', String(row.findings.length))}
                </span>
                {row.partial && row.findings.length === 0 ? <span className="pw-pf__detail pw-pf__detail--muted">{copy.pwPfPartial}</span> : null}
                {row.findings.length > 0 ? (
                  <ul className="pw-pf__findings">
                    {row.findings.slice(0, 6).map((finding) => (
                      <li key={finding.id}>
                        <span>{renderFinding(finding)}</span>
                        {finding.logicalPage !== undefined ? (
                          <button type="button" className="pw-link" data-testid="preview-preflight-goto" onClick={() => onGoToPage(finding.logicalPage!)}>
                            {copy.pwPfGoToPage.replace('{page}', String(finding.logicalPage + 1))}
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
