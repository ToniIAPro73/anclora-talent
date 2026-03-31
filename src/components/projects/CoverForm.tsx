import { saveProjectCoverAction } from '@/lib/projects/actions';
import type { ProjectRecord } from '@/lib/projects/types';

const previewClasses = {
  obsidian: 'from-slate-950 via-slate-800 to-slate-700 text-white',
  teal: 'from-teal-800 via-teal-700 to-cyan-600 text-white',
  sand: 'from-amber-100 via-orange-100 to-stone-100 text-slate-950',
};

export function CoverForm({ project }: { project: ProjectRecord }) {
  return (
    <form action={saveProjectCoverAction} className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
      <input type="hidden" name="projectId" value={project.id} />
      <input type="hidden" name="currentBackgroundImageUrl" value={project.cover.backgroundImageUrl ?? ''} />
      <input type="hidden" name="currentThumbnailUrl" value={project.cover.thumbnailUrl ?? ''} />

      <section className="space-y-4 rounded-[28px] border border-black/8 bg-white p-6 shadow-[0_16px_60px_rgba(17,24,39,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Portada persistente</p>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-slate-700">Título</span>
          <input name="title" defaultValue={project.cover.title} className="w-full rounded-[18px] border border-black/10 bg-[#f9f6ef] px-4 py-3 outline-none transition focus:border-teal-700" />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-slate-700">Subtítulo</span>
          <textarea name="subtitle" defaultValue={project.cover.subtitle} className="min-h-28 w-full rounded-[18px] border border-black/10 bg-[#f9f6ef] px-4 py-3 outline-none transition focus:border-teal-700" />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-slate-700">Paleta</span>
          <select name="palette" defaultValue={project.cover.palette} className="w-full rounded-[18px] border border-black/10 bg-[#f9f6ef] px-4 py-3 outline-none transition focus:border-teal-700">
            <option value="obsidian">Obsidian</option>
            <option value="teal">Teal</option>
            <option value="sand">Sand</option>
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-slate-700">Imagen de fondo</span>
          <input type="file" name="backgroundImage" accept="image/*" className="block w-full text-sm text-slate-600" />
        </label>
        <button type="submit" className="inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700">
          Guardar portada
        </button>
      </section>

      <section className={`rounded-[32px] bg-gradient-to-br p-8 shadow-[0_16px_60px_rgba(17,24,39,0.08)] ${previewClasses[project.cover.palette]}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] opacity-70">Cover studio</p>
        <div className="mt-8 overflow-hidden rounded-[28px] border border-white/15 bg-black/10 backdrop-blur">
          {project.cover.backgroundImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={project.cover.backgroundImageUrl} alt={project.cover.title} className="h-72 w-full object-cover" />
          ) : (
            <div className="flex h-72 items-center justify-center bg-white/10 text-sm font-semibold uppercase tracking-[0.2em] opacity-70">
              Sin imagen subida
            </div>
          )}
          <div className="p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-60">{project.title}</p>
            <h2 className="mt-4 text-5xl font-black tracking-tight">{project.cover.title}</h2>
            <p className="mt-4 max-w-xl text-base leading-8 opacity-85">{project.cover.subtitle}</p>
          </div>
        </div>
      </section>
    </form>
  );
}
