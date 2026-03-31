import { ImagePlus, ListTree, PenSquare, Type } from 'lucide-react';
import { Panel } from '../../shared/ui/Panel';
import { SectionHeader } from '../../shared/ui/SectionHeader';

const blocks = [
  'Título y subtítulo',
  'Capítulo',
  'Párrafo',
  'Imagen',
  'Cita destacada',
  'Separador editorial',
];

export function EditorScreen() {
  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Feature 02"
        title="Editor orientado a estructura, no a HTML arbitrario."
        description="La decisión clave es trabajar con un documento canónico por bloques y metadatos. El editor visual vendrá encima de esa capa, no al revés."
      />

      <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
        <Panel>
          <div className="flex items-center gap-3">
            <ListTree className="h-5 w-5 text-brand-teal" />
            <h3 className="font-headline text-xl font-black">Bloques del MVP</h3>
          </div>
          <div className="mt-5 space-y-3">
            {blocks.map((block) => (
              <div key={block} className="rounded-[20px] bg-white px-4 py-3 text-sm font-semibold text-ink">
                {block}
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="bg-[#fffefb]">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-[22px] bg-white px-5 py-5">
              <PenSquare className="h-5 w-5 text-brand-coral" />
              <h3 className="mt-4 font-headline text-lg font-black">Edición semántica</h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                El usuario edita contenido editorial y la app conserva intención de bloque, no solo texto.
              </p>
            </div>
            <div className="rounded-[22px] bg-white px-5 py-5">
              <ImagePlus className="h-5 w-5 text-brand-coral" />
              <h3 className="mt-4 font-headline text-lg font-black">Assets vinculados</h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                Imágenes y recursos deben relacionarse con capítulos, portada y exportación.
              </p>
            </div>
            <div className="rounded-[22px] bg-white px-5 py-5">
              <Type className="h-5 w-5 text-brand-coral" />
              <h3 className="mt-4 font-headline text-lg font-black">Estilos globales</h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                Tipografía, ritmo vertical y jerarquía deben vivir en un tema editorial reutilizable.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-[26px] border border-panel-border bg-white px-6 py-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Implementación siguiente</p>
            <h2 className="mt-2 font-headline text-2xl font-black text-ink">Documento ejemplo del MVP</h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-muted">
              <p>
                Capítulo 1 con título, dos párrafos, una imagen y una cita destacada. Esa será la
                primera pieza vertical completa para probar editor, preview y PDF.
              </p>
              <p>
                El objetivo del próximo paso no es construir todas las herramientas de formato,
                sino cerrar el circuito contenido fuente → edición → previsualización.
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
