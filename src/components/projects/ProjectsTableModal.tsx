'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Pencil, Trash2, X } from 'lucide-react';
import type { ProjectSummary } from '@/lib/projects/types';
import type { AppMessages } from '@/lib/i18n/messages';
import { NavigatingLink } from '@/components/ui/NavigatingLink';
import { deleteProjectAction } from '@/lib/projects/actions';
import { ProjectRetrievalControls } from './ProjectRetrievalControls';
import { useProjectRetrieval } from './use-project-retrieval';
import { countDuplicateProjectTitles, hasDuplicateProjectTitle } from '@/lib/projects/retrieval';

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const retrieval = useProjectRetrieval(projects, PAGE_SIZE);
  const duplicateCounts = useMemo(() => countDuplicateProjectTitles(projects), [projects]);
  const countCopy = (retrieval.total === 1 ? copy.projectsModalCountOne : copy.projectsModalCountMany)
    .replace('{count}', String(retrieval.total));

  const restoreFocus = useCallback(() => {
    const opener = openerRef.current;
    if (opener && document.contains(opener)) opener.focus();
  }, []);

  const close = useCallback(() => {
    restoreFocus();
    router.replace('/dashboard', { scroll: false });
  }, [restoreFocus, router]);

  useEffect(() => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const getFocusable = () => Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    const initialTarget = dialog.querySelector<HTMLElement>('[data-testid="projects-modal-close-button"]') ?? getFocusable()[0];
    initialTarget?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = dialog.querySelector<HTMLElement>('[data-testid="projects-modal-close-button"]') ?? focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement ?? event.target;
      if (event.shiftKey && (current === first || event.target === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || event.target === last)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      restoreFocus();
    };
  }, [close, restoreFocus]);

  return (
    <div ref={dialogRef} className="ac-modal talent-projects-modal" role="dialog" aria-modal="true" aria-labelledby="projects-modal-title">
      <button
        type="button"
        tabIndex={-1}
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
          <button
            type="button"
            data-testid="projects-modal-close-button"
            onClick={close}
            aria-label={copy.projectsModalClose}
            title={copy.projectsModalClose}
            className="talent-projects-modal__close"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

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
                  {retrieval.visibleProjects.map((project) => (
                    <tr key={project.id}>
                      <td className="talent-projects-table__sticky">
                        <div>{project.title}</div>
                        {hasDuplicateProjectTitle(project, duplicateCounts) ? (
                          <small className="talent-projects-table__duplicate" data-testid="duplicate-project-title">
                            {copy.projectsDuplicateTitle} {project.documentTitle || project.documentAuthor || project.slug}
                          </small>
                        ) : null}
                      </td>
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
                          <NavigatingLink
                            href={`/projects/${project.id}/editor`}
                            pendingLabel={projectCopy.cardOpenEditor}
                            aria-label={projectCopy.cardOpenEditor}
                            title={projectCopy.cardOpenEditor}
                            data-testid="projects-table-edit-action"
                            className="talent-projects-table__action talent-projects-table__action--primary"
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </NavigatingLink>
                          <NavigatingLink
                            href={`/projects/${project.id}/preview`}
                            pendingLabel={projectCopy.cardPreview}
                            aria-label={projectCopy.cardPreview}
                            title={projectCopy.cardPreview}
                            data-testid="projects-table-preview-action"
                            className="talent-projects-table__action"
                          >
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          </NavigatingLink>
                          <form
                            action={deleteProjectAction}
                            onSubmit={(event) => {
                              if (!window.confirm(projectCopy.cardDeleteConfirm.replace('{title}', project.title))) {
                                event.preventDefault();
                              }
                            }}
                          >
                            <input
                              type="hidden"
                              name="projectId"
                              value={project.id}
                              data-testid="delete-project-id-input"
                            />
                            <button
                              type="submit"
                              aria-label={projectCopy.cardDelete}
                              title={projectCopy.cardDelete}
                              data-testid="projects-table-delete-action"
                              className="talent-projects-table__action talent-projects-table__action--danger"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </form>
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
                  .replace('{page}', String(retrieval.page))
                  .replace('{total}', String(retrieval.totalPages))}
              </span>
              <div className="flex gap-2">
                <button type="button" data-testid="projects-table-previous" disabled={retrieval.page <= 1} onClick={() => retrieval.setPage(Math.max(1, retrieval.page - 1))} className="ac-button ac-button--ghost min-h-10 px-4">
                  {copy.projectsTablePrevious}
                </button>
                <button type="button" data-testid="projects-table-next" disabled={retrieval.page >= retrieval.totalPages} onClick={() => retrieval.setPage(Math.min(retrieval.totalPages, retrieval.page + 1))} className="ac-button ac-button--ghost min-h-10 px-4">
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
