import { createProjectAction } from '@/lib/projects/actions';

export function CreateProjectForm() {
  return (
    <form action={createProjectAction} className="rounded-[32px] border border-black/8 bg-[linear-gradient(180deg,_#fffdf8_0%,_#f7f0e4_100%)] p-6 shadow-[0_18px_60px_rgba(17,24,39,0.08)]">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Nuevo proyecto</p>
      <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Crea una base editorial con estándar premium</h2>
      <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">
        El primer proyecto ya debería nacer con una estructura clara, una presencia sólida y un
        flujo que no parezca una demo técnica.
      </p>
      <label className="mt-6 block space-y-2">
        <span className="text-sm font-semibold text-slate-700">Título del proyecto</span>
        <input
          type="text"
          name="title"
          required
          placeholder="Ej. Manual de marca editorial 2026"
          className="w-full rounded-[20px] border border-black/10 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-700"
        />
      </label>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xs text-xs leading-6 text-slate-500">
          La creación abre el editor directamente y persiste sobre Neon desde el primer paso.
        </p>
        <button
          type="submit"
          className="inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-full bg-[#07111f] px-5 py-3 text-sm font-semibold text-[#f8f4eb] shadow-[0_14px_34px_rgba(7,17,31,0.18)] transition hover:bg-[#123148]"
        >
          Crear proyecto y abrir editor
        </button>
      </div>
    </form>
  );
}
