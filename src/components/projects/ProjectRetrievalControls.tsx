'use client';

import type { AppMessages } from '@/lib/i18n/messages';
import type { ProjectSort, ProjectStatusFilter } from '@/lib/projects/retrieval';

export function ProjectRetrievalControls({
  copy,
  query,
  sort,
  status,
  total,
  onQueryChange,
  onSortChange,
  onStatusChange,
}: {
  copy: AppMessages['dashboard'];
  query: string;
  sort: ProjectSort;
  status: ProjectStatusFilter;
  total: number;
  onQueryChange: (value: string) => void;
  onSortChange: (value: ProjectSort) => void;
  onStatusChange: (value: ProjectStatusFilter) => void;
}) {
  return (
    <div className="talent-project-retrieval-controls" data-testid="project-retrieval-controls">
      <label className="talent-project-retrieval-controls__search">
        <span className="sr-only">{copy.projectsSearchLabel}</span>
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={copy.projectsSearchPlaceholder}
          aria-label={copy.projectsSearchLabel}
          data-testid="projects-search-input"
        />
        {query ? (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            aria-label={copy.projectsSearchClear}
            title={copy.projectsSearchClear}
            data-testid="projects-search-clear"
          >
            ×
          </button>
        ) : null}
      </label>

      <label className="talent-project-retrieval-controls__select">
        <span>{copy.projectsSortLabel}</span>
        <select value={sort} onChange={(event) => onSortChange(event.target.value as ProjectSort)} aria-label={copy.projectsSortLabel} data-testid="projects-sort-select">
          <option value="recent">{copy.projectsSortRecent}</option>
          <option value="oldest">{copy.projectsSortOldest}</option>
          <option value="title">{copy.projectsSortTitle}</option>
        </select>
      </label>

      <label className="talent-project-retrieval-controls__select">
        <span>{copy.projectsStatusFilterLabel}</span>
        <select value={status} onChange={(event) => onStatusChange(event.target.value as ProjectStatusFilter)} aria-label={copy.projectsStatusFilterLabel} data-testid="projects-status-select">
          <option value="all">{copy.projectsStatusFilterAll}</option>
          <option value="draft">{copy.projectsStatusDraft}</option>
          <option value="active">{copy.projectsStatusActive}</option>
        </select>
      </label>

      <span className="talent-project-retrieval-controls__count" role="status" data-testid="projects-result-count">
        {copy.projectsResultCount.replace('{count}', String(total))}
      </span>
    </div>
  );
}
