import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ProjectSummary } from '@/lib/projects/types';
import { premiumPrimaryDarkButton, premiumSecondaryLightButton } from '@/components/ui/button-styles';
import type { AppMessages } from '@/lib/i18n/messages';
import { ProjectDeleteButton } from './ProjectDeleteButton';

const paletteClassMap: Record<ProjectSummary['coverPalette'], string> = {
  obsidian: 'border border-[rgba(212,175,55,0.18)] bg-[#0b133f] text-[#f2e3b3]',
  teal: 'border border-[rgba(212,175,55,0.18)] bg-[#124a50] text-[#f2e3b3]',
  sand: 'border border-[rgba(11,49,63,0.12)] bg-[#f2e3b3] text-[#0b313f]',
};

export function ProjectCard({
  copy,
  locale,
  project,
}: {
  copy: AppMessages['project'];
  locale: 'es' | 'en';
  project: ProjectSummary;
}) {
  return (
    <article className="overflow-hidden rounded-[30px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-6 text-[var(--text-primary)] shadow-[var(--shadow-strong)]">
      <div className="flex items-start justify-between gap-4">
        <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${paletteClassMap[project.coverPalette]}`}>
          {project.coverPalette}
        </div>
        <div className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
          {copy.cardPremium}
        </div>
      </div>
      <h2 className="mt-5 text-2xl font-black tracking-tight text-[var(--text-primary)]">{project.title}</h2>
      <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{project.documentTitle}</p>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
        {copy.cardUpdated} {new Date(project.updatedAt).toLocaleString(locale === 'en' ? 'en-US' : 'es-ES')}
      </p>
      <div className="mt-6 h-px bg-[var(--border-subtle)]" />
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={`/projects/${project.id}/editor`} className={`${premiumPrimaryDarkButton} min-h-11 px-4 py-2`}>
          {copy.cardOpenEditor}
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href={`/projects/${project.id}/preview`} className={`${premiumSecondaryLightButton} min-h-11 px-4 py-2`}>
          {copy.cardPreview}
        </Link>
        <ProjectDeleteButton
          projectId={project.id}
          label={copy.cardDelete}
          confirmMessage={copy.cardDeleteConfirm.replace('{title}', project.title)}
        />
      </div>
    </article>
  );
}
