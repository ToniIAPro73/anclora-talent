import { Flag, Layers2, Rocket, ShieldCheck } from 'lucide-react';
import { Panel } from '../../shared/ui/Panel';
import { SectionHeader } from '../../shared/ui/SectionHeader';

const phases = [
  {
    phase: 'Fase 0',
    title: 'Base técnica',
    detail: 'Documentación, reglas, estructura de carpetas y limpieza de dependencias heredadas.',
  },
  {
    phase: 'Fase 1',
    title: 'Core editorial',
    detail: 'Documento canónico, proyecto, assets, editor y preview real.',
  },
  {
    phase: 'Fase 2',
    title: 'Importación y salida',
    detail: 'TXT/DOCX primero, PDF asistido después, exportación PDF y EPUB.',
  },
];

export function StrategyScreen() {
  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Roadmap"
        title="Ruta recomendada para poner la app en marcha sin desperdiciar iteraciones."
        description="La estrategia es vertical: cerrar un flujo real pequeño antes de abrir más pantallas o más formatos."
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel>
          <div className="grid gap-4">
            {phases.map((phase) => (
              <div key={phase.phase} className="rounded-[24px] bg-white px-5 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-teal">{phase.phase}</p>
                <p className="mt-2 font-headline text-2xl font-black text-ink">{phase.title}</p>
                <p className="mt-3 text-sm leading-6 text-muted">{phase.detail}</p>
              </div>
            ))}
          </div>
        </Panel>

        <div className="grid gap-6">
          <Panel>
            <Rocket className="h-5 w-5 text-brand-coral" />
            <h3 className="mt-4 font-headline text-xl font-black">Agilidad real</h3>
            <p className="mt-3 text-sm leading-6 text-muted">
              Cada sprint debe cerrar una historia end-to-end. No acumular UI sin flujo funcional.
            </p>
          </Panel>
          <Panel>
            <ShieldCheck className="h-5 w-5 text-brand-teal" />
            <h3 className="mt-4 font-headline text-xl font-black">Criterios de calidad</h3>
            <p className="mt-3 text-sm leading-6 text-muted">
              Typecheck verde, build verde, contratos de datos simples y consistencia entre editor, preview y export.
            </p>
          </Panel>
          <Panel>
            <Layers2 className="h-5 w-5 text-brand-coral" />
            <h3 className="mt-4 font-headline text-xl font-black">IA con propósito</h3>
            <p className="mt-3 text-sm leading-6 text-muted">
              La IA entrará cuando haya un núcleo editorial sólido: limpieza, completado, estilo y ayuda a portada.
            </p>
          </Panel>
          <Panel>
            <Flag className="h-5 w-5 text-brand-teal" />
            <h3 className="mt-4 font-headline text-xl font-black">Meta del próximo sprint</h3>
            <p className="mt-3 text-sm leading-6 text-muted">
              Documento de ejemplo importado, editable y previsualizable con una primera salida PDF.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
