import { createProjectAction } from '@/lib/projects/actions';

export function CreateProjectForm() {
  return (
    <form action={createProjectAction} className="rounded-[28px] border border-black/8 bg-white p-6 shadow-[0_16px_60px_rgba(17,24,39,0.06)]">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Nuevo proyecto</p>
      <h2 className="mt-3 text-2xl font-black tracking-tight">Crea la base del libro o documento editorial</h2>
      <label className="mt-6 block space-y-2">
        <span className="text-sm font-semibold text-slate-700">Título del proyecto</span>
        <input
          type="text"
          name="title"
          required
          placeholder="Ej. Manual de marca editorial 2026"
          className="w-full rounded-[20px] border border-black/10 bg-[#f9f6ef] px-4 py-3 outline-none transition focus:border-teal-700"
        />
      </label>
      <button
        type="submit"
        className="mt-6 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
      >
        Crear proyecto y abrir editor
      </button>
    </form>
  );
}
