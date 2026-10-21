'use client';

import { cloneElement, useId, useState, type MouseEvent, type FocusEvent, type ReactElement } from 'react';
import { createPortal } from 'react-dom';

/** Adds a localized hover/focus hint without changing the action's layout. */
export function ContextualActionHint({ hint, children }: { hint: string; children: ReactElement<{ 'aria-describedby'?: string }> }) {
  const id = useId();
  const descriptionId = `${id}-description`;
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ side: 'top' | 'bottom'; left: number; top: number } | null>(null);
  const existingDescription = children.props['aria-describedby'];
  const updatePlacement = (event: MouseEvent<HTMLSpanElement> | FocusEvent<HTMLSpanElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const side = bounds.top > 84 ? 'top' : 'bottom';
    const tooltipWidth = Math.min(288, window.innerWidth - 24);
    const preferredLeft = bounds.left + bounds.width / 2 > window.innerWidth / 2
      ? bounds.right - tooltipWidth
      : bounds.left;
    const left = Math.max(12, Math.min(preferredLeft, window.innerWidth - tooltipWidth - 12));
    setPosition({ side, left, top: side === 'top' ? bounds.top - 8 : bounds.bottom + 8 });
    setIsOpen(true);
  };
  const action = cloneElement(children, {
    'aria-describedby': [existingDescription, descriptionId].filter(Boolean).join(' '),
  });

  return (
    <span
      className="cover-action-hint"
      onMouseEnter={updatePlacement}
      onMouseLeave={() => setIsOpen(false)}
      onFocusCapture={updatePlacement}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsOpen(false);
      }}
    >
      <span id={descriptionId} className="sr-only">{hint}</span>
      {action}
      {isOpen && position && typeof document !== 'undefined' && createPortal(
        <span
          id={`${id}-tooltip`}
          role="tooltip"
          data-placement={position.side}
          className="cover-action-tooltip"
          style={{ left: position.left, top: position.top, transform: position.side === 'top' ? 'translateY(-100%)' : undefined }}
        >
          {hint}
        </span>,
        document.body,
      )}
    </span>
  );
}
