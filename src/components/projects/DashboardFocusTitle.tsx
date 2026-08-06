'use client';

import { useEffect } from 'react';

export function DashboardFocusTitle({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    document.getElementById('project-title')?.focus();
  }, [enabled]);

  return null;
}
