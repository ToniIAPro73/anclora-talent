import { ArrowRight, CheckCircle2, FolderKanban, Library, Rows4 } from 'lucide-react';
import { initiatives, nowCards } from '../../app/data/roadmap';
import { Panel } from '../../shared/ui/Panel';
import { SectionHeader } from '../../shared/ui/SectionHeader';
import { StatusBadge } from '../../shared/ui/StatusBadge';

export function DashboardScreen() {
  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Estado del repositorio"
        title="La app ya tiene dirección visual, pero ahora toca construir el producto."
        description="He reemplazado el enfoque de demo única por una base modular para poder evolucionar importación, edición, portada, preview y exportación sin rehacer el frontend en cada iteración."
        action={
          <button className="rounded-full bg-ink px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-teal">
            Continuar con el MVP
          </button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Diagnóstico</p>
              <h2 className="mt-2 font-headline text-2xl font-black text-ink">Qué queda ya orientado</h2>
            </div>
            <FolderKanban className="h-8 w-8 text-brand-teal" />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {nowCards.map((card) => (
              <div key={card.title} className="rounded-[24px] bg-white px-5 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{card.title}</p>
                <p className="mt-3 font-headline text-2xl font-black text-ink">{card.value}</p>
                <p className="mt-3 text-sm leading-6 text-muted">{card.detail}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="bg-ink text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">Punto de partida</p>
          <h2 className="mt-3 font-headline text-3xl font-black">Prioridad técnica inmediata</h2>
          <p className="mt-4 text-sm leading-7 text-white/72">
            El siguiente sprint debe dejar un documento editable real y persistente. Sin ese núcleo,
            el importador, el preview y la exportación seguirán siendo demos desacopladas.
          </p>
          <div className="mt-8 flex items-center gap-3 text-sm font-semibold text-brand-sand">
            Abrir roadmap
            <ArrowRight className="h-4 w-4" />
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel>
          <div className="flex items-center gap-3">
            <Rows4 className="h-5 w-5 text-brand-teal" />
            <h3 className="font-headline text-xl font-black">Frentes abiertos</h3>
          </div>
          <ul className="mt-5 space-y-4 text-sm leading-6 text-muted">
            <li>Modelo de datos editorial todavía inexistente.</li>
            <li>Importación real pendiente para `docx`, `pdf`, `doc` y `txt`.</li>
            <li>Portadas y preview aún no trabajan sobre contenido fuente real.</li>
          </ul>
        </Panel>

        <Panel>
          <div className="flex items-center gap-3">
            <Library className="h-5 w-5 text-brand-coral" />
            <h3 className="font-headline text-xl font-black">Documentación creada</h3>
          </div>
          <ul className="mt-5 space-y-4 text-sm leading-6 text-muted">
            <li>`sdd/product.md` define el alcance del MVP.</li>
            <li>`sdd/architecture.md` fija la estructura técnica recomendada.</li>
            <li>`sdd/data-model.md` y `sdd/roadmap.md` ordenan implementación y entregas.</li>
          </ul>
        </Panel>

        <Panel>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-brand-teal" />
            <h3 className="font-headline text-xl font-black">Salud actual</h3>
          </div>
          <ul className="mt-5 space-y-4 text-sm leading-6 text-muted">
            <li>Proyecto modularizado sobre React + Vite.</li>
            <li>Build y typecheck deben seguir verdes tras cada fase.</li>
            <li>La siguiente implementación útil ya puede empezar por features.</li>
          </ul>
        </Panel>
      </div>

      <Panel>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Roadmap operativo</p>
            <h2 className="mt-2 font-headline text-2xl font-black text-ink">Fases ya aterrizadas en el repo</h2>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          {initiatives.map((initiative) => (
            <div
              key={initiative.title}
              className="flex flex-col gap-4 rounded-[24px] border border-panel-border bg-white px-5 py-5 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <StatusBadge status={initiative.status} />
                  <p className="font-headline text-xl font-bold text-ink">{initiative.title}</p>
                </div>
                <p className="max-w-3xl text-sm leading-6 text-muted">{initiative.summary}</p>
              </div>
              <button className="rounded-full border border-panel-border px-4 py-2 text-sm font-bold text-ink transition hover:border-ink hover:bg-ink hover:text-white">
                Ver detalle
              </button>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
