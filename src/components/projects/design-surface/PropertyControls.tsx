'use client';

/**
 * Compact building blocks of the Portada properties panel (08A "design tool"
 * density): collapsible sections, inline-labelled numeric fields, slider rows
 * and icon toggles. Sizes live in `globals.css` (`.cover-prop-*`) so every
 * layer type shares one spacing system.
 */

import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

export function PropertySection({
  title,
  children,
  defaultOpen = true,
  testId,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  testId?: string;
}) {
  return (
    <details className="cover-prop-section" open={defaultOpen} data-testid={testId}>
      <summary className="cover-prop-section__summary">
        <span>{title}</span>
        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
      </summary>
      <div className="cover-prop-section__body">{children}</div>
    </details>
  );
}

/** `X [ 120 ]` — label and input on one line, ~30px tall. */
export function CompactNumberField({
  label,
  value,
  onChange,
  testId,
  min,
  max,
  step,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  testId: string;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <label className="cover-prop-field">
      <span className="cover-prop-field__label" title={label}>
        {label}
      </span>
      <input
        type="number"
        className="cover-prop-input"
        data-testid={testId}
        value={Number.isInteger(value) ? value : Number(value.toFixed(2))}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          const parsed = Number(event.target.value);
          if (Number.isFinite(parsed)) onChange(parsed);
        }}
      />
      {suffix ? <span className="cover-prop-field__suffix">{suffix}</span> : null}
    </label>
  );
}

/** `Interlineado ━━●━━ 1.1` — label, slider and typed value in a single row. */
export function CompactSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  testId,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  testId?: string;
  display?: (value: number) => string;
}) {
  return (
    <div className="cover-prop-slider">
      <span className="cover-prop-slider__label" title={label}>
        {label}
      </span>
      <Slider
        aria-label={label}
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(next) => onChange(next[0])}
        data-testid={testId}
        className="cover-prop-slider__track"
      />
      <span className="cover-prop-slider__value">{display ? display(value) : String(value)}</span>
    </div>
  );
}

/** Icon/text segmented group: equal-width buttons, 28px high. */
export function SegmentedGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="ac-editor-inspector__segmented cover-prop-segmented" role="group" aria-label={label}>
      {children}
    </div>
  );
}
