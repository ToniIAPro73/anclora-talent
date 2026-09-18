'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, Clock3, LayoutGrid, List, Pencil, Plus, Search } from 'lucide-react';
import type { ProjectSummary } from '@/lib/projects/types';
import type { AppMessages } from '@/lib/i18n/messages';
import type { ProjectSort, ProjectStatusFilter } from '@/lib/projects/retrieval';
import { NavigatingLink } from '@/components/ui/NavigatingLink';
import { ProjectCardMenu } from './ProjectCardMenu';
import { useProjectRetrieval } from './use-project-retrieval';

export function DashboardWorkspace({ projects, dataAvailable, locale, copy, projectCopy }: {
  projects: ProjectSummary[];
  dataAvailable: boolean;
  locale: 'es' | 'en';
  copy: AppMessages['dashboard'];
  projectCopy: AppMessages['project'];
}) {
  const router = useRouter();
  const retrieval = useProjectRetrieval(projects);
  const [layout, setLayout] = useState<'list' | 'grid'>('list');
  const recent = [...projects].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const date = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(value));

  return (
    <div className="dashboard-layout">
      <section className="dashboard-projects" aria-labelledby="dashboard-title">
        <header className="dashboard-toolbar">
          <div className="dashboard-heading">
            <h1 id="dashboard-title">{copy.projectsModalTitle}</h1>
            {dataAvailable && <p role="status">{copy.workspaceCount.replace('{count}', String(retrieval.total))}</p>}
          </div>
          {dataAvailable && projects.length > 0 && <div className="dashboard-controls">
            <label className="dashboard-search"><Search size={16} aria-hidden="true" /><input data-testid="dashboard-search" type="search" aria-label={copy.projectsSearchLabel} placeholder={copy.projectsSearchLabel + '…'} value={retrieval.query} onChange={(event) => retrieval.setQuery(event.target.value)} /></label>
            <label className="dashboard-sort"><span>{copy.projectsSortLabel}</span><select data-testid="dashboard-sort" aria-label={copy.projectsSortLabel} value={retrieval.sort} onChange={(event) => retrieval.setSort(event.target.value as ProjectSort)}><option value="recent">{copy.projectsSortRecent}</option><option value="oldest">{copy.projectsSortOldest}</option><option value="title">{copy.projectsSortTitle}</option></select></label>
            <div className="dashboard-view-controls">
              <button data-testid="dashboard-grid-view" type="button" aria-label={copy.workspaceGrid} aria-pressed={layout === 'grid'} onClick={() => setLayout('grid')}><LayoutGrid size={17} /></button>
              <button data-testid="dashboard-list-view" type="button" aria-label={copy.workspaceList} aria-pressed={layout === 'list'} onClick={() => setLayout('list')}><List size={18} /></button>
            </div>
          </div>}
        </header>
        {dataAvailable && projects.length > 0 && <div className="dashboard-filter"><select data-testid="dashboard-status-filter" aria-label={copy.projectsStatusFilterLabel} value={retrieval.status} onChange={(event) => retrieval.setStatus(event.target.value as ProjectStatusFilter)}><option value="all">{copy.projectsStatusFilterAll}</option><option value="active">{copy.projectsStatusActive}</option><option value="draft">{copy.projectsStatusDraft}</option></select></div>}
        {!dataAvailable ? <div className="dashboard-state" role="alert"><h2>{copy.workspaceError}</h2><p>{copy.workspaceErrorDescription}</p><button data-testid="dashboard-retry" type="button" className="dashboard-button" onClick={() => router.refresh()}>{copy.workspaceRetry}</button></div>
          : projects.length === 0 ? <div className="dashboard-state"><BookOpen size={28} aria-hidden="true" /><h2>{copy.workspaceEmptyTitle}</h2><p>{copy.workspaceEmptyDescription}</p><NavigatingLink href="/projects/new" pendingLabel={copy.sectionNewProject} className="dashboard-button dashboard-button--primary"><Plus size={16} aria-hidden="true" />{copy.sectionNewProject}</NavigatingLink></div>
          : retrieval.visibleProjects.length === 0 ? <div className="dashboard-state"><h2>{copy.workspaceNoResults}</h2><p>{copy.workspaceNoResultsDescription}</p></div>
          : <div className={`dashboard-project-list dashboard-project-list--${layout}`}>
            {retrieval.visibleProjects.map((project) => <article key={project.id} className="dashboard-project-row" data-recent={project.id === recent[0]?.id}>
              <div className="dashboard-project-identity">
                <div className="dashboard-cover" data-palette={project.coverPalette}>
                  {project.coverImageUrl ? <Image src={project.coverImageUrl} alt="" fill sizes="80px" unoptimized className="object-cover" /> : <><BookOpen size={18} aria-hidden="true" /><span>{project.documentTitle || project.title}</span><small>{project.documentAuthor}</small></>}
                </div>
                <div className="dashboard-project-copy"><h2>{project.title}</h2><p className="dashboard-project-kind"><BookOpen size={15} aria-hidden="true" />{copy.workspaceManuscript}</p><p className="dashboard-project-description">{project.documentSubtitle || project.documentTitle}</p>{project.documentAuthor && <small>{project.documentAuthor}</small>}</div>
                <ProjectCardMenu projectId={project.id} menuLabel={projectCopy.cardActionsMenu} deleteLabel={projectCopy.cardDelete} confirmMessage={projectCopy.cardDeleteConfirm.replace('{title}', project.title)} documentDataLabel={projectCopy.documentDataOpen} />
              </div>
              <div className="dashboard-project-meta"><span className="dashboard-status" data-status={project.status}><span aria-hidden="true" />{project.status === 'active' ? copy.projectsStatusActive : copy.projectsStatusDraft}</span><p>{copy.workspaceLastEdited}</p><time dateTime={project.updatedAt}>{date(project.updatedAt)}</time></div>
              <div className="dashboard-project-actions"><div className="dashboard-project-counts"><span>{project.chapterCount} {copy.projectsTableChapters.toLocaleLowerCase(locale)}</span>{project.pageCount !== null && <span>{project.pageCount} {copy.projectsTablePages.toLocaleLowerCase(locale)}</span>}</div><NavigatingLink href={`/projects/${project.id}/editor`} pendingLabel={projectCopy.cardOpenEditor} className={`dashboard-button${project.id === recent[0]?.id ? ' dashboard-button--primary' : ''}`}>{projectCopy.cardOpenEditor}<ArrowRight size={17} aria-hidden="true" /></NavigatingLink><NavigatingLink href={`/projects/${project.id}/preview`} pendingLabel={projectCopy.cardPreview} className="dashboard-preview-link">{projectCopy.cardPreview}</NavigatingLink></div>
            </article>)}
          </div>}
        {dataAvailable && retrieval.totalPages > 1 && <footer className="dashboard-pagination"><span>{copy.projectsTablePageStatus.replace('{page}', String(retrieval.page)).replace('{total}', String(retrieval.totalPages))}</span><button data-testid="dashboard-previous" className="dashboard-button" type="button" disabled={retrieval.page <= 1} onClick={() => retrieval.setPage(retrieval.page - 1)}>{copy.projectsTablePrevious}</button><button data-testid="dashboard-next" className="dashboard-button" type="button" disabled={retrieval.page >= retrieval.totalPages} onClick={() => retrieval.setPage(retrieval.page + 1)}>{copy.projectsTableNext}</button></footer>}
      </section>
      <aside className="dashboard-activity" aria-labelledby="dashboard-activity-title"><header><h2 id="dashboard-activity-title">{copy.workspaceActivity}</h2><NavigatingLink href="/dashboard?projects=1" pendingLabel={copy.workspaceViewAll}>{copy.workspaceViewAll}</NavigatingLink></header>
        {dataAvailable && recent.length > 0 ? <ol>{recent.slice(0, 3).map((project) => <li key={project.id}><span className="dashboard-activity-icon"><Pencil size={18} aria-hidden="true" /></span><div><h3>{copy.workspaceUpdated}</h3><NavigatingLink href={`/projects/${project.id}/editor`} pendingLabel={projectCopy.cardOpenEditor}>{project.title}</NavigatingLink><time dateTime={project.updatedAt}><Clock3 size={12} aria-hidden="true" />{date(project.updatedAt)}</time></div></li>)}</ol> : <p className="dashboard-activity-empty">{dataAvailable ? copy.workspaceNoActivity : copy.workspaceErrorDescription}</p>}
        <blockquote>“{copy.workspaceQuote}”<span aria-hidden="true" /><cite>Anclora Talent</cite></blockquote>
      </aside>
    </div>
  );
}
