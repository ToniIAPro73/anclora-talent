'use client';

import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

const emptySubscribe = () => () => {};

/**
 * Portals `children` into a DOM node elsewhere in the tree, identified by
 * `slotId`. Used to let a deeply-nested client component (e.g. the project
 * editor) render into a slot owned by an ancestor (the shared app shell's
 * topbar) without prop-drilling page-specific state through the layout.
 */
export function SlotPortal({ slotId, children }: { slotId: string; children: React.ReactNode }) {
  const node = useSyncExternalStore(
    emptySubscribe,
    () => document.getElementById(slotId),
    () => null,
  );

  if (!node) return null;

  return createPortal(children, node);
}
