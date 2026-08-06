'use client';

import { useState } from 'react';
import type { ProjectSummary } from '@/lib/projects/types';
import type { AppMessages } from '@/lib/i18n/messages';
import { ProjectCard } from './ProjectCard';

const PAGE_SIZE = 12;

/**
 * P-U3-01 — "Mis proyectos" renders in batches of 12 with a "load more"
 * button; the caller keeps the total count chip (it shows all projects,
 * not just the visible batch).
 */
export function PaginatedProjectGrid({
  copy,
  dashboardCopy,
  locale,
  projects,
}: {
  copy: AppMessages['project'];
  dashboardCopy: AppMessages['dashboard'];
  locale: 'es' | 'en';
  projects: ProjectSummary[];
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visible = projects.slice(0, visibleCount);
  const hasMore = visibleCount < projects.length;

  return (
    <>
      <div className="grid gap-4 2xl:grid-cols-2 3xl:grid-cols-3" data-testid="dashboard-projects-grid">
        {visible.map((project) => (
          <ProjectCard key={project.id} copy={copy} locale={locale} project={project} />
        ))}
      </div>
      {hasMore ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            data-testid="dashboard-load-more"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            className="ac-button ac-button--ghost min-h-11 px-5"
          >
            {dashboardCopy.loadMore}
          </button>
        </div>
      ) : null}
    </>
  );
}
