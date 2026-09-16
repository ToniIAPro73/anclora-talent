'use client';

import { useSyncExternalStore } from 'react';

/**
 * Responsive-capability detection via `matchMedia` (continuation mission
 * Fase 10) — deliberately not user-agent sniffing, which is fragile and
 * decoupled from the actual available viewport. SSR-safe: the server
 * snapshot is always `false` (narrow), so the first client render never
 * mismatches; a real client immediately re-evaluates via `useSyncExternalStore`.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === 'undefined') return () => {};
      const mediaQueryList = window.matchMedia(query);
      mediaQueryList.addEventListener('change', onStoreChange);
      return () => mediaQueryList.removeEventListener('change', onStoreChange);
    },
    () => (typeof window === 'undefined' ? false : window.matchMedia(query).matches),
    () => false,
  );
}
