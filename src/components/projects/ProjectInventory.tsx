'use client';

import type { AppMessages } from '@/lib/i18n/messages';
import { countDuplicateProjectTitles, hasDuplicateProjectTitle } from '@/lib/projects/retrieval';
import type { ProjectSummary } from '@/lib/projects/types';
import { ProjectCard } from './ProjectCard';
import { ProjectRetrievalControls } from './ProjectRetrievalControls';
import { useProjectRetrieval } from './use-project-retrieval';

export function ProjectInventory({
  copy,
  projectCopy,
  locale,
  projects,
}: {
  copy: AppMessages['dashboard'];
  projectCopy: AppMessages['project'];
  locale: 'es' | 'en';
  projects: ProjectSummary[];
}) {
  const retrieval = useProjectRetrieval(projects);
  const duplicateCounts = countDuplicateProjectTitles(projects);

  return (
    <section aria-label={copy.sectionTitle} data-testid="project-inventory">
      <ProjectRetrievalControls
        copy={copy}
        query={retrieval.query}
        sort={retrieval.sort}
        status={retrieval.status}
        total={retrieval.total}
        onQueryChange={retrieval.setQuery}
        onSortChange={retrieval.setSort}
        onStatusChange={retrieval.setStatus}
      />

      {retrieval.visibleProjects.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2" data-testid="project-inventory-grid">
          {retrieval.visibleProjects.map((project) => (
            <ProjectCard
              key={project.id}
              copy={projectCopy}
              locale={locale}
              project={project}
              duplicateTitle={hasDuplicateProjectTitle(project, duplicateCounts)}
              duplicateTitleLabel={copy.projectsDuplicateTitle}
            />
          ))}
        </div>
      ) : (
        <div className="ac-empty-state" data-testid="project-inventory-empty">
          <h3 className="ac-empty-state__title mt-0">{copy.projectsTableEmptyTitle}</h3>
          <p className="ac-empty-state__summary mt-0">{copy.projectsTableEmptyDescription}</p>
        </div>
      )}
    </section>
  );
}
