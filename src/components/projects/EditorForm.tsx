import { saveProjectDocumentAction } from '@/lib/projects/actions';
import type { ProjectRecord } from '@/lib/projects/types';
import { premiumPrimaryDarkButton, premiumSecondaryLightButton } from '@/components/ui/button-styles';

export function EditorForm({ project }: { project: ProjectRecord }) {
  const chapter = project.document.chapters[0];

  return (
    <form action={saveProjectDocumentAction} className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
      <input type="hidden" name="projectId" value={project.id} />

      <section className="space-y-4 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,_rgba(19,29,48,0.96)_0%,_rgba(9,16,29,0.98)_100%)] p-6 shadow-[0_16px_60px_rgba(3,7,18,0.3)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/45">Metadatos</p>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-white/88">Título</span>
          <input name="title" defaultValue={project.document.title} className="w-full rounded-[18px] border border-white/10 bg-white/6 px-4 py-3 text-white outline-none transition focus:border-teal-400" />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-white/88">Subtítulo</span>
          <textarea name="subtitle" defaultValue={project.document.subtitle} className="min-h-28 w-full rounded-[18px] border border-white/10 bg-white/6 px-4 py-3 text-white outline-none transition focus:border-teal-400" />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-white/88">Título del capítulo</span>
          <input name="chapterTitle" defaultValue={chapter.title} className="w-full rounded-[18px] border border-white/10 bg-white/6 px-4 py-3 text-white outline-none transition focus:border-teal-400" />
        </label>
      </section>

      <section className="space-y-4 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,_rgba(19,29,48,0.96)_0%,_rgba(9,16,29,0.98)_100%)] p-6 shadow-[0_16px_60px_rgba(3,7,18,0.3)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/45">Documento vivo</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-white">{project.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-white/68">
            La edición persiste sobre el documento canónico. El preview lee exactamente este mismo contenido.
          </p>
        </div>

        <div className="space-y-4">
          {chapter.blocks.map((block) => (
            <label key={block.id} className="block space-y-2 rounded-[24px] border border-white/8 bg-white/4 p-5">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">{block.type}</span>
              <input type="hidden" name="blockId" value={block.id} />
              <textarea
                name="blockContent"
                defaultValue={block.content}
                className="min-h-30 w-full rounded-[18px] border border-white/10 bg-white/8 px-4 py-3 text-white outline-none transition focus:border-teal-400"
              />
            </label>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="submit" className={`${premiumPrimaryDarkButton} px-5`}>
            Guardar cambios
          </button>
          <a href={`/projects/${project.id}/preview`} className={`${premiumSecondaryLightButton} px-5`}>
            Abrir preview
          </a>
        </div>
      </section>
    </form>
  );
}
