import { BookMarked, FileOutput, MonitorSmartphone, ScanEye } from 'lucide-react';
import { Panel } from '../../shared/ui/Panel';
import { SectionHeader } from '../../shared/ui/SectionHeader';

export function PreviewScreen() {
  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Feature 04"
        title="Preview y exportación deben compartir la misma fuente de verdad."
        description="El error clásico es renderizar el preview desde la UI y exportar con otra lógica. Aquí el plan es que ambos se alimenten del mismo documento canónico."
      />

      <div className="grid gap-6 lg:grid-cols-4">
        <Panel>
          <MonitorSmartphone className="h-5 w-5 text-brand-teal" />
          <h3 className="mt-4 font-headline text-lg font-black">Dispositivos</h3>
          <p className="mt-2 text-sm leading-6 text-muted">Simulación inicial para lectura digital y PDF.</p>
        </Panel>
        <Panel>
          <BookMarked className="h-5 w-5 text-brand-coral" />
          <h3 className="mt-4 font-headline text-lg font-black">Ritmo editorial</h3>
          <p className="mt-2 text-sm leading-6 text-muted">Capítulos, paginación y respiración visual.</p>
        </Panel>
        <Panel>
          <ScanEye className="h-5 w-5 text-brand-teal" />
          <h3 className="mt-4 font-headline text-lg font-black">Control de incidencias</h3>
          <p className="mt-2 text-sm leading-6 text-muted">Desbordes, imágenes rotas y bloques sin mapear.</p>
        </Panel>
        <Panel>
          <FileOutput className="h-5 w-5 text-brand-coral" />
          <h3 className="mt-4 font-headline text-lg font-black">Salidas prioritarias</h3>
          <p className="mt-2 text-sm leading-6 text-muted">PDF primero, EPUB después, otros formatos más tarde.</p>
        </Panel>
      </div>

      <Panel className="bg-ink text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/55">Principio de arquitectura</p>
        <h2 className="mt-3 font-headline text-3xl font-black">Sin documento fuente común no hay export fiable.</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-white/72">
          El preview del MVP no debe ser un mock visual. Debe renderizar el mismo contenido que
          luego alimentará el pipeline de PDF y EPUB, con el mismo tema editorial y el mismo orden de bloques.
        </p>
      </Panel>
    </div>
  );
}
