import { CreateProjectForm } from '@/components/projects/CreateProjectForm';

export default function NewProjectPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Proyecto nuevo</p>
        <h2 className="mt-2 text-4xl font-black tracking-tight">Crea el contenedor editorial base</h2>
        <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
          Al crear el proyecto se generan documento, portada y contrato de edición para que el flujo completo arranque ya sobre el modelo canónico.
        </p>
      </div>
      <div className="max-w-3xl">
        <CreateProjectForm />
      </div>
    </div>
  );
}
