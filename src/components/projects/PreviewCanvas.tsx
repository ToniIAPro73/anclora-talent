import type { ProjectRecord } from '@/lib/projects/types';

const paletteMap = {
  obsidian: 'from-slate-950 via-slate-800 to-slate-700 text-white',
  teal: 'from-teal-800 via-teal-700 to-cyan-600 text-white',
  sand: 'from-amber-100 via-orange-100 to-stone-100 text-slate-950',
};

export function PreviewCanvas({ project }: { project: ProjectRecord }) {
  const chapter = project.document.chapters[0];

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <article className="rounded-[32px] border border-black/8 bg-white p-8 shadow-[0_16px_60px_rgba(17,24,39,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Preview editorial</p>
        <h2 className="mt-4 text-4xl font-black tracking-tight">{project.document.title}</h2>
        <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-600">{project.document.subtitle}</p>
        <div className="mt-10 space-y-6">
          {chapter.blocks.map((block) => {
            if (block.type === 'heading') {
              return (
                <h3 key={block.id} className="text-3xl font-black tracking-tight">
                  {block.content}
                </h3>
              );
            }

            if (block.type === 'quote') {
              return (
                <blockquote key={block.id} className="rounded-[28px] border-l-4 border-teal-700 bg-[#faf6ef] px-6 py-6 text-lg leading-8 text-slate-800">
                  {block.content}
                </blockquote>
              );
            }

            return (
              <p key={block.id} className="text-base leading-8 text-slate-700">
                {block.content}
              </p>
            );
          })}
        </div>
      </article>

      <aside className={`rounded-[32px] bg-gradient-to-br p-8 shadow-[0_16px_60px_rgba(17,24,39,0.08)] ${paletteMap[project.cover.palette]}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] opacity-70">Portada actual</p>
        <div className="mt-6 rounded-[28px] border border-white/15 bg-black/10 p-6 backdrop-blur">
          {project.cover.backgroundImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.cover.backgroundImageUrl}
              alt={project.cover.title}
              className="mb-6 h-56 w-full rounded-[22px] object-cover"
            />
          ) : null}
          <h3 className="text-4xl font-black tracking-tight">{project.cover.title}</h3>
          <p className="mt-4 text-sm leading-7 opacity-80">{project.cover.subtitle}</p>
        </div>
      </aside>
    </div>
  );
}
