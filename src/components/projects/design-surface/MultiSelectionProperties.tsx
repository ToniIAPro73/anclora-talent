'use client';

/**
 * Cover Studio v2 — inspector for a multi-selection (08B): alignment, distribution (3+) and group/ungroup.
 * Compact icon actions; nothing here is permanently on screen, it appears only when several objects are selected.
 */

import {
  AlignHorizontalDistributeCenter,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignVerticalDistributeCenter,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Group,
  Ungroup,
} from 'lucide-react';
import type { AppMessages } from '@/lib/i18n/messages';
import type { LayerAlignment } from '@/lib/projects/layer-geometry';
import { PropertySection, SegmentedGroup } from './PropertyControls';

export interface MultiSelectionPropertiesProps {
  count: number;
  copy: AppMessages['coverDesignSurface'];
  canUngroup: boolean;
  onAlign: (alignment: LayerAlignment) => void;
  onDistribute: (axis: 'horizontal' | 'vertical') => void;
  onGroup: () => void;
  onUngroup: () => void;
}

export function MultiSelectionProperties({ count, copy, canUngroup, onAlign, onDistribute, onGroup, onUngroup }: MultiSelectionPropertiesProps) {
  const ws = copy.workspace;
  const t = copy.toolbar;
  const align = (alignment: LayerAlignment, Icon: typeof AlignHorizontalJustifyStart, label: string) => (
    <button key={alignment} type="button" className="cover-prop-icon" data-testid={`multi-align-${alignment}`} onClick={() => onAlign(alignment)} title={label} aria-label={label}>
      <Icon className="h-4 w-4" />
    </button>
  );

  return (
    <div className="cover-prop-stack" data-testid="properties-panel-multi">
      <p className="cover-prop-count" data-testid="multi-selection-count">
        {count} {ws.selectionCountLabel}
      </p>
      <PropertySection title={ws.sectionArrange}>
        <div className="cover-prop-row">
          <SegmentedGroup label={t.objectAlignmentLabel}>
            {align('left', AlignHorizontalJustifyStart, t.objectAlignLeftLabel)}
            {align('center-horizontal', AlignHorizontalJustifyCenter, t.objectAlignCenterHorizontalLabel)}
            {align('right', AlignHorizontalJustifyEnd, t.objectAlignRightLabel)}
          </SegmentedGroup>
          <SegmentedGroup label={t.objectAlignmentLabel}>
            {align('top', AlignVerticalJustifyStart, t.objectAlignTopLabel)}
            {align('center-vertical', AlignVerticalJustifyCenter, t.objectAlignCenterVerticalLabel)}
            {align('bottom', AlignVerticalJustifyEnd, t.objectAlignBottomLabel)}
          </SegmentedGroup>
        </div>
        <div className="cover-prop-row">
          <SegmentedGroup label={ws.distributeHorizontalLabel}>
            <button type="button" className="cover-prop-icon" data-testid="multi-distribute-horizontal" onClick={() => onDistribute('horizontal')} disabled={count < 3} title={ws.distributeHorizontalLabel} aria-label={ws.distributeHorizontalLabel}>
              <AlignHorizontalDistributeCenter className="h-4 w-4" />
            </button>
            <button type="button" className="cover-prop-icon" data-testid="multi-distribute-vertical" onClick={() => onDistribute('vertical')} disabled={count < 3} title={ws.distributeVerticalLabel} aria-label={ws.distributeVerticalLabel}>
              <AlignVerticalDistributeCenter className="h-4 w-4" />
            </button>
          </SegmentedGroup>
        </div>
      </PropertySection>
      <PropertySection title={ws.sectionGroup}>
        <div className="cover-prop-grid">
          <button type="button" className="ac-button ac-button--secondary cover-prop-button" data-testid="multi-group-button" onClick={onGroup}>
            <Group className="mr-1.5 h-3.5 w-3.5" />
            {ws.groupLabel}
          </button>
          <button type="button" className="ac-button ac-button--secondary cover-prop-button" data-testid="multi-ungroup-button" onClick={onUngroup} disabled={!canUngroup}>
            <Ungroup className="mr-1.5 h-3.5 w-3.5" />
            {ws.ungroupLabel}
          </button>
        </div>
      </PropertySection>
    </div>
  );
}
