import { describe, expect, test } from 'vitest';
import { countDuplicateProjectTitles, hasDuplicateProjectTitle, retrieveProjects } from './retrieval';
import type { ProjectSummary } from './types';

function project(id: string, title: string, updatedAt: string, status: ProjectSummary['status'] = 'draft'): ProjectSummary {
  return {
    id,
    slug: id,
    title,
    status,
    createdAt: updatedAt,
    updatedAt,
    documentSubtitle: 'Subtitle',
    documentAuthor: 'Author',
    documentTitle: `${title} document`,
    pageCount: 1,
    chapterCount: 1,
    coverPalette: 'obsidian',
  };
}

describe('project retrieval contract', () => {
  const projects = [
    project('a', 'Manual editorial', '2026-01-01T00:00:00Z'),
    project('b', 'Manual editorial', '2026-03-01T00:00:00Z', 'active'),
    project('c', 'Another book', '2026-02-01T00:00:00Z'),
  ];

  test('uses deterministic recency and duplicate-safe identity ordering', () => {
    expect(retrieveProjects(projects).projects.map((item) => item.id)).toEqual(['b', 'c', 'a']);
    expect(retrieveProjects(projects, { sort: 'oldest' }).projects.map((item) => item.id)).toEqual(['a', 'c', 'b']);
    const counts = countDuplicateProjectTitles(projects);
    expect(hasDuplicateProjectTitle(projects[0], counts)).toBe(true);
    expect(hasDuplicateProjectTitle(projects[2], counts)).toBe(false);
  });

  test('filters across editorial identity fields and status without changing ownership input', () => {
    expect(retrieveProjects(projects, { query: 'DOCUMENT', status: 'active' }).projects.map((item) => item.id)).toEqual(['b']);
    expect(retrieveProjects(projects, { query: 'another', status: 'draft' }).projects.map((item) => item.id)).toEqual(['c']);
  });

  test('clamps pages and returns an explicit empty result', () => {
    expect(retrieveProjects(projects, { page: 99, pageSize: 2 }).page).toBe(2);
    expect(retrieveProjects(projects, { query: 'missing' })).toMatchObject({ projects: [], total: 0, page: 1, totalPages: 1 });
  });
});
