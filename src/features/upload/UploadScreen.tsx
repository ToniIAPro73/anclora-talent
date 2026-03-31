import { FileDigit, FileText, FileType2, FolderInput, ScanSearch } from 'lucide-react';
import { Panel } from '../../shared/ui/Panel';
import { SectionHeader } from '../../shared/ui/SectionHeader';

const sources = [
  {
    label: 'TXT / Markdown',
    detail: 'Entrada de bajo riesgo para arrancar el pipeline.',
    icon: FileText,
  },
  {
    label: 'DOCX',
    detail: 'Prioridad alta para MVP por equilibrio entre valor y complejidad.',
    icon: FileType2,
  },
  {
    label: 'PDF',
    detail: 'Importación asistida; no asumir fidelidad estructural completa.',
    icon: FileDigit,
  },
];

export function UploadScreen() {
  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Feature 01"
        title="Importación documental preparada para crecer por etapas."
        description="El primer objetivo no es soportarlo todo a la vez, sino normalizar bien `txt` y `docx`, dejando `pdf` y `doc` para pipelines asistidos o de backend."
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel className="bg-white">
          <div className="rounded-[28px] border-2 border-dashed border-panel-border bg-[#fcfaf5] px-6 py-10 text-center">
            <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-[26px] bg-brand-teal text-white">
              <FolderInput className="h-8 w-8" />
            </div>
            <h2 className="mt-6 font-headline text-3xl font-black text-ink">Zona de ingestión MVP</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted">
              Próxima implementación: carga de archivo, identificación de formato, extracción,
              normalización a bloques y vista previa de incidencias de importación.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button className="rounded-full bg-ink px-5 py-3 text-sm font-bold text-white">
                Seleccionar documento
              </button>
              <button className="rounded-full border border-panel-border px-5 py-3 text-sm font-bold text-ink">
                Ver contrato de importación
              </button>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center gap-3">
            <ScanSearch className="h-5 w-5 text-brand-coral" />
            <h3 className="font-headline text-xl font-black">Estrategia de parsing</h3>
          </div>
          <div className="mt-5 space-y-4">
            {sources.map((source) => (
              <div key={source.label} className="rounded-[22px] bg-white px-4 py-4">
                <div className="flex items-center gap-3">
                  <source.icon className="h-4 w-4 text-brand-teal" />
                  <p className="font-headline text-base font-bold text-ink">{source.label}</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">{source.detail}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
