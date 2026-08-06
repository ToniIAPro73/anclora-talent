'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProjectSummary } from '@/lib/projects/types';
import type { AppMessages } from '@/lib/i18n/messages';
import { premiumPrimaryMintButton, premiumSecondaryLightButton } from '@/components/ui/button-styles';
import { NavigatingLink } from '@/components/ui/NavigatingLink';
import { ProjectCardMenu } from './ProjectCardMenu';

const PAGE_SIZE = 25;

function formatDate(value: string, locale: 'es' | 'en') {
  return new Date(value).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-ES');
}

function projectStatusLabel(status: ProjectSummary['status'], copy: AppMessages['dashboard']) {
  return status === 'active' ? copy.projectsStatusActive : copy.projectsStatusDraft;
}

export function ProjectsTableModal({
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
  const router = useRouter();
  const [page, setPage] = useState(1);
  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    [projects],
  );
  const totalPages = Math.max(1, Math.ceil(sortedProjects.length / PAGE_SIZE));
  const visibleProjects = sortedProjects.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const countCopy = (projects.length === 1 ? copy.projectsModalCountOne : copy.projectsModalCountMany)
    .replace('{count}', String(projects.length));

  const close = () => router.replace('/dashboard', { scroll: false });

  return (
    <div className="ac-modal talent-projects-modal" role="dialog" aria-modal="true" aria-labelledby="projects-modal-title">
      <button
        type="button"
        aria-label={copy.projectsModalClose}
        data-testid="projects-modal-backdrop"
        className="ac-modal__backdrop"
        onClick={close}
      />
      <section className="ac-modal__panel talent-projects-modal__panel">
        <header className="talent-projects-modal__header">
          <div>
            <p className="ac-surface-panel__eyebrow">{countCopy}</p>
            <h2 id="projects-modal-title" className="talent-projects-modal__title">{copy.projectsModalTitle}</h2>
          </div>
          <button type="button" data-testid="projects-modal-close-button" onClick={close} className="ac-button ac-button--ghost min-h-11 px-4">
            {copy.projectsModalClose}
          </button>
        </header>

        {visibleProjects.length > 0 ? (
          <>
            <div className="talent-projects-table-wrap">
              <table className="talent-projects-table" data-testid="projects-table">
                <thead>
                  <tr>
                    <th>{copy.projectsTableTitle}</th>
                    <th>{copy.projectsTableSubtitle}</th>
                    <th>{copy.projectsTableAuthor}</th>
                    <th>{copy.projectsTableCreated}</th>
                    <th>{copy.projectsTableUpdated}</th>
                    <th>{copy.projectsTablePages}</th>
                    <th>{copy.projectsTableChapters}</th>
                    <th>{copy.projectsTableStatus}</th>
                    <th>{copy.projectsTableActions}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleProjects.map((project) => (
                    <tr key={project.id}>
                      <td className="talent-projects-table__sticky">{project.title}</td>
                      <td>{project.documentSubtitle || project.documentTitle || '-'}</td>
                      <td>{project.documentAuthor || '-'}</td>
                      <td>{formatDate(project.createdAt, locale)}</td>
                      <td>{formatDate(project.updatedAt, locale)}</td>
                      <td>{project.pageCount ?? '-'}</td>
                      <td>{project.chapterCount}</td>
                      <td>
                        <span className="talent-projects-table__status">
                          {projectStatusLabel(project.status, copy)}
                        </span>
                      </td>
                      <td>
                        <div className="talent-projects-table__actions">
                          <NavigatingLink href={`/projects/${project.id}/editor`} pendingLabel={projectCopy.cardOpenEditor} className={`${premiumPrimaryMintButton} min-h-10 px-4`}>
                            {projectCopy.cardOpenEditor}
                          </NavigatingLink>
                          <NavigatingLink href={`/projects/${project.id}/preview`} pendingLabel={projectCopy.cardPreview} className={`${premiumSecondaryLightButton} min-h-10 px-4`}>
                            {projectCopy.cardPreview}
                          </NavigatingLink>
                          <ProjectCardMenu
                            projectId={project.id}
                            menuLabel={projectCopy.cardActionsMenu}
                            deleteLabel={projectCopy.cardDelete}
                            confirmMessage={projectCopy.cardDeleteConfirm.replace('{title}', project.title)}
                            documentDataLabel={projectCopy.documentDataOpen}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <footer className="talent-projects-modal__footer">
              <span>
                {copy.projectsTablePageStatus
                  .replace('{page}', String(page))
                  .replace('{total}', String(totalPages))}
              </span>
              <div className="flex gap-2">
                <button type="button" data-testid="projects-table-previous" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="ac-button ac-button--ghost min-h-10 px-4">
                  {copy.projectsTablePrevious}
                </button>
                <button type="button" data-testid="projects-table-next" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="ac-button ac-button--ghost min-h-10 px-4">
                  {copy.projectsTableNext}
                </button>
              </div>
            </footer>
          </>
        ) : (
          <div className="ac-empty-state">
            <h3 className="ac-empty-state__title mt-0">{copy.projectsTableEmptyTitle}</h3>
            <p className="ac-empty-state__summary mt-0">{copy.projectsTableEmptyDescription}</p>
          </div>
        )}
      </section>
    </div>
  );
}
