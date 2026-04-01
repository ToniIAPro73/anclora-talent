import { createProjectAction } from '@/lib/projects/actions';
import { premiumPrimaryDarkButton } from '@/components/ui/button-styles';
import { supportedImportAccept } from '@/lib/projects/import-config';

export function CreateProjectForm() {
  return (
    <form action={createProjectAction} className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.08),_transparent_35%),linear-gradient(180deg,_#131d30_0%,_#0b1220_100%)] p-6 text-white shadow-[0_20px_70px_rgba(3,7,18,0.34)]">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/45">Nuevo proyecto</p>
      <h2 className="mt-3 text-2xl font-black tracking-tight text-white">Crea una base editorial con estándar premium</h2>
      <p className="mt-3 max-w-xl text-sm leading-7 text-white/68">
        El proyecto puede nacer vacío o a partir de un documento fuente real para arrancar con contenido útil desde el primer minuto.
      </p>
      <label htmlFor="project-title" className="mt-6 block space-y-2">
        <span className="text-sm font-semibold text-white/88">Título del proyecto</span>
        <input
          id="project-title"
          type="text"
          name="title"
          required
          placeholder="Ej. Manual de marca editorial 2026"
          className="w-full rounded-[20px] border border-white/12 bg-white/6 px-4 py-3 text-white outline-none transition placeholder:text-white/32 focus:border-teal-400"
        />
      </label>
      <label htmlFor="source-document" className="mt-5 block space-y-2">
        <span className="text-sm font-semibold text-white/88">Documento base opcional</span>
        <input
          id="source-document"
          data-testid="source-document-input"
          type="file"
          name="sourceDocument"
          accept={supportedImportAccept}
          className="block w-full rounded-[18px] border border-dashed border-white/14 bg-white/4 px-4 py-3 text-sm text-white/72 file:mr-4 file:rounded-full file:border-0 file:bg-[#8ce9de] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#07111f]"
        />
        <p className="text-xs leading-6 text-white/45">
          Soporta `pdf`, `doc`, `docx`, `txt` y `md`. Si el archivo se puede extraer bien, el editor arrancará ya sembrado con ese contenido.
        </p>
      </label>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xs text-xs leading-6 text-white/45">
          La creación persiste sobre Neon desde el primer paso y abre el editor con base importada si has adjuntado documento.
        </p>
        <button
          type="submit"
          className={premiumPrimaryDarkButton}
        >
          Crear proyecto y abrir editor
        </button>
      </div>
    </form>
  );
}
