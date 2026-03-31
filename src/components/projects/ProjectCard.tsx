import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ProjectSummary } from '@/lib/projects/types';

const paletteClassMap: Record<ProjectSummary['coverPalette'], string> = {
  obsidian: 'bg-slate-950 text-white',
  teal: 'bg-teal-700 text-white',
  sand: 'bg-amber-100 text-slate-950',
};

export function ProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <article className="overflow-hidden rounded-[30px] border border-black/8 bg-[linear-gradient(180deg,_#ffffff_0%,_#faf5eb_100%)] p-6 shadow-[0_18px_60px_rgba(17,24,39,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${paletteClassMap[project.coverPalette]}`}>
          {project.coverPalette}
        </div>
        <div className="rounded-full border border-black/8 bg-white/84 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Premium
        </div>
      </div>
      <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950">{project.title}</h2>
      <p className="mt-3 text-sm leading-7 text-slate-600">{project.documentTitle}</p>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        Actualizado {new Date(project.updatedAt).toLocaleString('es-ES')}
      </p>
      <div className="mt-6 h-px bg-black/8" />
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={`/projects/${project.id}/editor`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#07111f] px-4 py-2 text-sm font-semibold text-[#f8f4eb] transition hover:bg-[#123148]">
          Abrir editor
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href={`/projects/${project.id}/preview`} className="inline-flex min-h-11 items-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:border-black/20 hover:bg-[#f5ede0]">
          Preview
        </Link>
      </div>
    </article>
  );
}
