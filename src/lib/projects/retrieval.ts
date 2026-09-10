import type { ProjectStatus, ProjectSummary } from './types';

export type ProjectSort = 'recent' | 'oldest' | 'title';
export type ProjectStatusFilter = 'all' | ProjectStatus;

export interface ProjectRetrievalQuery {
  query: string;
  sort: ProjectSort;
  status: ProjectStatusFilter;
  page: number;
  pageSize: number;
}

export interface ProjectRetrievalResult {
  projects: ProjectSummary[];
  total: number;
  page: number;
  totalPages: number;
}

export const DEFAULT_PROJECT_RETRIEVAL_QUERY: ProjectRetrievalQuery = {
  query: '',
  sort: 'recent',
  status: 'all',
  page: 1,
  pageSize: 25,
};

export function normalizeProjectQuery(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function compareByStableIdentity(a: ProjectSummary, b: ProjectSummary): number {
  return a.id.localeCompare(b.id);
}

function compareProjects(sort: ProjectSort, a: ProjectSummary, b: ProjectSummary): number {
  if (sort === 'title') {
    return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }) || compareByStableIdentity(a, b);
  }

  const updatedDifference = Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  if (updatedDifference !== 0) return sort === 'recent' ? updatedDifference : -updatedDifference;

  return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }) || compareByStableIdentity(a, b);
}

function matchesQuery(project: ProjectSummary, query: string): boolean {
  if (!query) return true;
  return [
    project.title,
    project.slug,
    project.documentTitle,
    project.documentSubtitle,
    project.documentAuthor,
  ].some((value) => normalizeProjectQuery(value).includes(query));
}

export function retrieveProjects(
  projects: readonly ProjectSummary[],
  input: Partial<ProjectRetrievalQuery> = {},
): ProjectRetrievalResult {
  const query: ProjectRetrievalQuery = {
    ...DEFAULT_PROJECT_RETRIEVAL_QUERY,
    ...input,
    query: normalizeProjectQuery(input.query ?? DEFAULT_PROJECT_RETRIEVAL_QUERY.query),
    page: Math.max(1, input.page ?? DEFAULT_PROJECT_RETRIEVAL_QUERY.page),
    pageSize: Math.max(1, input.pageSize ?? DEFAULT_PROJECT_RETRIEVAL_QUERY.pageSize),
  };

  const matching = projects
    .filter((project) => query.status === 'all' || project.status === query.status)
    .filter((project) => matchesQuery(project, query.query))
    .sort((a, b) => compareProjects(query.sort, a, b));
  const totalPages = Math.max(1, Math.ceil(matching.length / query.pageSize));
  const page = Math.min(query.page, totalPages);
  const start = (page - 1) * query.pageSize;

  return {
    projects: matching.slice(start, start + query.pageSize),
    total: matching.length,
    page,
    totalPages,
  };
}

export function countDuplicateProjectTitles(projects: readonly ProjectSummary[]): Map<string, number> {
  return projects.reduce((counts, project) => {
    const key = normalizeProjectQuery(project.title);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
}

export function hasDuplicateProjectTitle(project: ProjectSummary, counts: Map<string, number>): boolean {
  return (counts.get(normalizeProjectQuery(project.title)) ?? 0) > 1;
}
