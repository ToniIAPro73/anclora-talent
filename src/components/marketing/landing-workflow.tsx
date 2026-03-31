import { ArrowRight } from 'lucide-react';
import type { MarketingWorkflowStep } from './marketing-data';

type LandingWorkflowProps = {
  steps: MarketingWorkflowStep[];
};

export function LandingWorkflow({ steps }: LandingWorkflowProps) {
  return (
    <section className="rounded-[34px] border border-black/8 bg-white px-6 py-8 shadow-[0_18px_60px_rgba(17,24,39,0.06)]">
      <div className="flex flex-col gap-3 border-b border-black/8 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Flujo</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Tres pasos para empezar sin friccion</h2>
        </div>
        <p className="max-w-xl text-sm leading-7 text-slate-600">
          La landing debe reducir la distancia entre la promesa y la accion. Aqui el usuario entiende el recorrido antes de
          registrarse.
        </p>
      </div>

      <ol className="mt-8 grid gap-4 lg:grid-cols-3" role="list">
        {steps.map((step, index) => (
          <li key={step.title} className="rounded-[28px] border border-black/8 bg-[linear-gradient(180deg,_#fefcf6_0%,_#f6f0e7_100%)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
              Paso {index + 1}
            </p>
            <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{step.title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{step.description}</p>
            <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-950">
              Avanzar
              <ArrowRight className="h-4 w-4" />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
