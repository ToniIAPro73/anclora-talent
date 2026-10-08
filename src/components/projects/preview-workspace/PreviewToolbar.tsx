'use client';

import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Minus, Plus, ScanLine, Share2 } from 'lucide-react';
import type { AppMessages } from '@/lib/i18n/messages';
import type { CoverSurfaceKind, PreviewMode } from '@/lib/preview/preview-workspace';

type Copy = AppMessages['project'];

export interface PreviewToolbarProps {
  copy: Copy;
  mode: PreviewMode;
  spreadAvailable: boolean;
  onModeChange: (mode: PreviewMode) => void;
  coverSurface: CoverSurfaceKind;
  onCoverSurfaceChange: (surface: CoverSurfaceKind) => void;
  hasBackCover: boolean;
  pageNumber: number;
  totalPages: number;
  surfaceLabel: string | null;
  onPageInput: (page: number) => void;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  zoom: number;
  fitActive: boolean;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onFit: () => void;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  onExport?: () => void;
  exportHref?: string;
}

export function PreviewToolbar(props: PreviewToolbarProps) {
  const { copy } = props;
  const modes: Array<{ id: PreviewMode; label: string }> = [
    { id: 'document', label: copy.pwModeDocument },
    { id: 'spread', label: copy.pwModeSpread },
    { id: 'cover', label: copy.pwModeCover },
  ];

  return (
    <div className="pw-toolbar" role="toolbar" aria-label={copy.pwTitle} data-testid="preview-toolbar">
      <div className="pw-segmented" role="group" aria-label={copy.pwModeGroup} data-testid="preview-mode-switch">
        {modes.map((item) => {
          const disabled = item.id === 'spread' && !props.spreadAvailable;
          return (
            <button
              key={item.id}
              type="button"
              className="pw-segmented__item"
              data-testid={`preview-mode-${item.id}`}
              aria-pressed={props.mode === item.id}
              disabled={disabled}
              title={disabled ? copy.pwSpreadUnavailable : undefined}
              onClick={() => props.onModeChange(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {props.mode === 'cover' && props.hasBackCover ? (
        <div className="pw-segmented pw-segmented--small" role="group" aria-label={copy.pwCoverSelector} data-testid="preview-cover-switch">
          <button type="button" className="pw-segmented__item" data-testid="preview-cover-front" aria-pressed={props.coverSurface === 'front'} onClick={() => props.onCoverSurfaceChange('front')}>
            {copy.pwCoverFront}
          </button>
          <button type="button" className="pw-segmented__item" data-testid="preview-cover-back" aria-pressed={props.coverSurface === 'back'} onClick={() => props.onCoverSurfaceChange('back')}>
            {copy.pwCoverBack}
          </button>
        </div>
      ) : null}

      <div className="pw-pager" role="group" aria-label={copy.pwPageLabel}>
        <button type="button" className="pw-icon-button" data-testid="preview-prev-page" aria-label={copy.pwPrevPage} title={copy.pwPrevPage} disabled={!props.canPrev} onClick={props.onPrev}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <label className="pw-pager__label">
          <span>{copy.pwPageLabel}</span>
          <input
            key={props.pageNumber}
            data-testid="preview-page-input"
            className="pw-pager__input"
            type="number"
            inputMode="numeric"
            min={1}
            max={props.totalPages}
            defaultValue={props.pageNumber}
            aria-label={`${copy.pwPageLabel} ${props.pageNumber} ${copy.pwPageOfTotal.replace('{total}', String(props.totalPages))}`}
            onFocus={(event) => event.currentTarget.select()}
            onBlur={(event) => {
              const parsed = Number.parseInt(event.currentTarget.value, 10);
              if (Number.isFinite(parsed)) props.onPageInput(parsed);
              else event.currentTarget.value = String(props.pageNumber);
            }}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === 'Enter') event.currentTarget.blur();
              if (event.key === 'Escape') {
                event.currentTarget.value = String(props.pageNumber);
                event.currentTarget.blur();
              }
            }}
          />
          <span data-testid="preview-page-total">{copy.pwPageOfTotal.replace('{total}', String(props.totalPages))}</span>
          {props.surfaceLabel ? <span className="pw-pager__surface" data-testid="preview-surface-label">· {props.surfaceLabel}</span> : null}
        </label>
        <button type="button" className="pw-icon-button" data-testid="preview-next-page" aria-label={copy.pwNextPage} title={copy.pwNextPage} disabled={!props.canNext} onClick={props.onNext}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="pw-zoom" role="group" aria-label="Zoom">
        <button type="button" className="pw-icon-button" data-testid="preview-zoom-out" aria-label={copy.pwZoomOut} title={copy.pwZoomOut} onClick={props.onZoomOut}>
          <Minus className="h-4 w-4" />
        </button>
        <output className="pw-zoom__value" data-testid="preview-zoom-value" aria-live="polite">{props.zoom}%</output>
        <button type="button" className="pw-icon-button" data-testid="preview-zoom-in" aria-label={copy.pwZoomIn} title={copy.pwZoomIn} onClick={props.onZoomIn}>
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <button type="button" className="pw-button" data-testid="preview-fit" aria-pressed={props.fitActive} aria-label={copy.pwFitTitle} title={copy.pwFitTitle} onClick={props.onFit}>
        <ScanLine className="h-4 w-4" />
        <span className="pw-button__label">{copy.pwFit}</span>
      </button>
      <button type="button" className="pw-icon-button" data-testid="preview-fullscreen" aria-pressed={props.fullscreen} aria-label={props.fullscreen ? copy.pwExitFullscreen : copy.pwFullscreen} title={props.fullscreen ? copy.pwExitFullscreen : copy.pwFullscreen} onClick={props.onToggleFullscreen}>
        {props.fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </button>

      {props.onExport || props.exportHref ? (
        props.onExport ? (
          <button type="button" className="pw-button pw-button--primary pw-toolbar__export" data-testid="preview-export" onClick={props.onExport}>
            <Share2 className="h-4 w-4" />
            <span>{copy.pwExport}</span>
          </button>
        ) : (
          <a className="pw-button pw-button--primary pw-toolbar__export" data-testid="preview-export" href={props.exportHref}>
            <Share2 className="h-4 w-4" />
            {copy.pwExport}
          </a>
        )
      ) : null}
    </div>
  );
}
