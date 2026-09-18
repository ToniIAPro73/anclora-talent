'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Portals `children` into a DOM node elsewhere in the tree, identified by
 * `slotId`. Used to let a deeply-nested client component (e.g. the project
 * editor) render into a slot owned by an ancestor (the shared app shell's
 * topbar) without prop-drilling page-specific state through the layout.
 */
export function SlotPortal({ slotId, children }: { slotId: string; children: React.ReactNode }) {
  const [node, setNode] = useState<Element | null>(null);

  useEffect(() => {
    setNode(document.getElementById(slotId));
  }, [slotId]);

  if (!node) return null;

  return createPortal(children, node);
}
