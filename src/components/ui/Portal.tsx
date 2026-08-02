'use client';

import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

const emptySubscribe = () => () => {};

export function Portal({ children }: { children: React.ReactNode }) {
  // Client-only render: true on the client, false during SSR/hydration
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!mounted) return null;

  return createPortal(children, document.body);
}
