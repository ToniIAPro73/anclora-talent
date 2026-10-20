'use client';

import { useEffect, useState } from 'react';
import type { AppMessages } from '@/lib/i18n/messages';
import type { DesignSurface } from '@/lib/projects/design-surface';
import { analyzeCoverPreflight, type CoverPreflightIssue, type PreflightLocale } from '@/lib/projects/cover-preflight';
import { loadImageSize } from './image-size';

export function CoverPreflightPanel({
  surface,
  locale,
  copy,
}: {
  surface: DesignSurface;
  locale: PreflightLocale;
  copy: AppMessages['coverDesignSurface']['workspace'];
}) {
  const [issues, setIssues] = useState<CoverPreflightIssue[]>([]);
  useEffect(() => {
    let active = true;
    void analyzeCoverPreflight(surface, loadImageSize, locale).then((next) => {
      if (active) setIssues(next);
    });
    return () => { active = false; };
  }, [locale, surface]);

  return (
    <details className="cover-preflight-panel" data-testid="cover-preflight-panel">
      <summary>{copy.preflightLabel}<span aria-hidden="true"> · {issues.length}</span></summary>
      <p>{copy.preflightDisclaimer}</p>
      {issues.length ? (
        <ul>{issues.map((issue) => <li key={issue.id} data-severity={issue.severity}>{issue.message}</li>)}</ul>
      ) : <p role="status">{copy.preflightClear}</p>}
    </details>
  );
}
