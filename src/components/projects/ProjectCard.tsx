import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ProjectSummary } from '@/lib/projects/types';
import { premiumPrimaryDarkButton, premiumSecondaryLightButton } from '@/components/ui/button-styles';

const paletteClassMap: Record<ProjectSummary['coverPalette'], string> = {
  obsidian: 'bg-slate-950 text-white',
  teal: 'bg-teal-700 text-white',
  sand: 'bg-amber-100 text-slate-950',
};

export function ProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <article className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,_rgba(19,29,48,0.96)_0%,_rgba(9,16,29,0.98)_100%)] p-6 text-white shadow-[0_18px_60px_rgba(3,7,18,0.3)]">
      <div className="flex items-start justify-between gap-4">
        <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${paletteClassMap[project.coverPalette]}`}>
          {project.coverPalette}
        </div>
        <div className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
          Premium
        </div>
      </div>
      <h2 className="mt-5 text-2xl font-black tracking-tight text-white">{project.title}</h2>
      <p className="mt-3 text-sm leading-7 text-white/64">{project.documentTitle}</p>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-white/36">
        Actualizado {new Date(project.updatedAt).toLocaleString('es-ES')}
      </p>
      <div className="mt-6 h-px bg-white/8" />
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={`/projects/${project.id}/editor`} className={`${premiumPrimaryDarkButton} min-h-11 px-4 py-2`}>
          Abrir editor
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href={`/projects/${project.id}/preview`} className={`${premiumSecondaryLightButton} min-h-11 px-4 py-2`}>
          Preview
        </Link>
      </div>
    </article>
  );
}
