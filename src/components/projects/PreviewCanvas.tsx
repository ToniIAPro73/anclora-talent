import type { ProjectRecord } from '@/lib/projects/types';
import type { AppMessages } from '@/lib/i18n/messages';

const paletteMap = {
  obsidian: 'from-[#0b133f] via-[#0b233f] to-[#07252f] text-[#f2e3b3]',
  teal: 'from-[#124a50] via-[#0b313f] to-[#07252f] text-[#f2e3b3]',
  sand: 'from-[#f2e3b3] via-[#e7d4a0] to-[#d4af37] text-[#0b313f]',
};

export function PreviewCanvas({ copy, project }: { copy: AppMessages['project']; project: ProjectRecord }) {
  const chapter = project.document.chapters[0];

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <article className="rounded-[32px] border border-[var(--preview-paper-border)] bg-[var(--preview-paper)] p-8 shadow-[var(--shadow-soft)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">{copy.previewCanvasEyebrow}</p>
        <h2 className="mt-4 text-4xl font-black tracking-tight text-[var(--text-primary)]">{project.document.title}</h2>
        <p className="mt-3 max-w-3xl text-lg leading-8 text-[var(--text-secondary)]">{project.document.subtitle}</p>
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
                <blockquote key={block.id} className="rounded-[28px] border-l-4 border-[var(--preview-quote-border)] bg-[var(--preview-quote-bg)] px-6 py-6 text-lg leading-8 text-[var(--text-primary)]">
                  {block.content}
                </blockquote>
              );
            }

            return (
              <p key={block.id} className="text-base leading-8 text-[var(--text-secondary)]">
                {block.content}
              </p>
            );
          })}
        </div>
      </article>

      <aside className={`rounded-[32px] border border-[var(--border-subtle)] bg-gradient-to-br p-8 shadow-[var(--shadow-soft)] ${paletteMap[project.cover.palette]}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] opacity-70">{copy.previewCoverEyebrow}</p>
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
