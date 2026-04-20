import { ArrowRight } from 'lucide-react';
import type { ProjectSummary } from '@/lib/projects/types';
import { premiumPrimaryMintButton, premiumSecondaryLightButton } from '@/components/ui/button-styles';
import type { AppMessages } from '@/lib/i18n/messages';
import { ProjectDeleteButton } from './ProjectDeleteButton';
import { NavigatingLink } from '@/components/ui/NavigatingLink';

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
    <article className="ac-card talent-project-card overflow-hidden p-6 text-[var(--text-primary)]">
      <div className="ac-card__meta items-start">
        <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${paletteClassMap[project.coverPalette]}`}>
          {project.coverPalette}
        </div>
        <div className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
          {copy.cardPremium}
        </div>
      </div>
      <h2 className="ac-card__title mt-5">{project.title}</h2>
      <div className="ac-card__body mt-0 gap-0 p-0">
        <p className="text-sm leading-7 text-[var(--text-secondary)]">{project.documentTitle}</p>
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
        {copy.cardUpdated} {new Date(project.updatedAt).toLocaleString(locale === 'en' ? 'en-US' : 'es-ES')}
      </p>
      <div className="ac-card__footer mt-6 border-t-0 px-0 pb-0 pt-0">
        <div className="flex flex-wrap gap-3">
        <NavigatingLink
          href={`/projects/${project.id}/editor`}
          pendingLabel={copy.cardOpenEditor}
          className={`${premiumPrimaryMintButton} px-5`}
        >
          {copy.cardOpenEditor}
          <ArrowRight className="h-4 w-4" />
        </NavigatingLink>
        <NavigatingLink
          href={`/projects/${project.id}/preview`}
          pendingLabel={copy.cardPreview}
          className={`${premiumSecondaryLightButton} px-5`}
        >
          {copy.cardPreview}
        </NavigatingLink>
        <ProjectDeleteButton
          projectId={project.id}
          label={copy.cardDelete}
          confirmMessage={copy.cardDeleteConfirm.replace('{title}', project.title)}
        />
        </div>
      </div>
    </article>
  );
}
