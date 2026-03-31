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
    <article className="rounded-[28px] border border-black/8 bg-white p-6 shadow-[0_16px_60px_rgba(17,24,39,0.06)]">
      <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${paletteClassMap[project.coverPalette]}`}>
        {project.coverPalette}
      </div>
      <h2 className="mt-4 text-2xl font-black tracking-tight">{project.title}</h2>
      <p className="mt-2 text-sm leading-7 text-slate-600">{project.documentTitle}</p>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        Actualizado {new Date(project.updatedAt).toLocaleString('es-ES')}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={`/projects/${project.id}/editor`} className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700">
          Abrir editor
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href={`/projects/${project.id}/preview`} className="inline-flex items-center rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white">
          Preview
        </Link>
      </div>
    </article>
  );
}
