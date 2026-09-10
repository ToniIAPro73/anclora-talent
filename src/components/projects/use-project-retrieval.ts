'use client';

import { useMemo, useState } from 'react';
import type { ProjectSummary } from '@/lib/projects/types';
import {
  DEFAULT_PROJECT_RETRIEVAL_QUERY,
  retrieveProjects,
  type ProjectRetrievalResult,
  type ProjectSort,
  type ProjectStatusFilter,
} from '@/lib/projects/retrieval';

export function useProjectRetrieval(
  projects: readonly ProjectSummary[],
  pageSize = DEFAULT_PROJECT_RETRIEVAL_QUERY.pageSize,
) {
  const [query, setQueryValue] = useState(DEFAULT_PROJECT_RETRIEVAL_QUERY.query);
  const [sort, setSortValue] = useState<ProjectSort>(DEFAULT_PROJECT_RETRIEVAL_QUERY.sort);
  const [status, setStatusValue] = useState<ProjectStatusFilter>(DEFAULT_PROJECT_RETRIEVAL_QUERY.status);
  const [page, setPage] = useState(DEFAULT_PROJECT_RETRIEVAL_QUERY.page);

  const result = useMemo<ProjectRetrievalResult>(
    () => retrieveProjects(projects, { query, sort, status, page, pageSize }),
    [page, pageSize, projects, query, sort, status],
  );

  const setQuery = (value: string) => {
    setQueryValue(value);
    setPage(1);
  };

  const setSort = (value: ProjectSort) => {
    setSortValue(value);
    setPage(1);
  };

  const setStatus = (value: ProjectStatusFilter) => {
    setStatusValue(value);
    setPage(1);
  };

  return {
    query,
    sort,
    status,
    page: result.page,
    totalPages: result.totalPages,
    total: result.total,
    visibleProjects: result.projects,
    setQuery,
    setSort,
    setStatus,
    setPage,
  };
}
