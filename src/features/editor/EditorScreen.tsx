import { ImagePlus, ListTree, PenSquare, Type } from 'lucide-react';
import { useDocumentStore } from '../../domain/document/store';
import { Panel } from '../../shared/ui/Panel';
import { SectionHeader } from '../../shared/ui/SectionHeader';

export function EditorScreen() {
  const { document, updateBlockContent } = useDocumentStore();
  const blocks = document.chapters.flatMap((chapter) => chapter.blocks);

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
              <div key={block.id} className="rounded-[20px] bg-white px-4 py-3 text-sm font-semibold text-ink">
                {block.type}
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
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Documento vivo</p>
            <h2 className="mt-2 font-headline text-2xl font-black text-ink">{document.title}</h2>
            <div className="mt-5 space-y-5">
              {document.chapters.map((chapter) => (
                <div key={chapter.id} className="rounded-[22px] border border-panel-border bg-[#fcfaf5] px-5 py-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    {chapter.title}
                  </p>
                  <div className="mt-4 space-y-4">
                    {chapter.blocks.map((block) => {
                      if (block.type === 'image') {
                        return (
                          <div key={block.id} className="rounded-[18px] bg-white px-4 py-4 text-sm leading-6 text-muted">
                            Imagen vinculada: {block.caption}
                          </div>
                        );
                      }

                      if (block.type === 'divider') {
                        return (
                          <div key={block.id} className="rounded-[18px] bg-white px-4 py-4 text-sm font-semibold text-muted">
                            {block.label}
                          </div>
                        );
                      }

                      return (
                        <label key={block.id} className="block space-y-2">
                          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                            {block.type}
                          </span>
                          <textarea
                            className="min-h-24 w-full rounded-[18px] border border-panel-border bg-white px-4 py-3 text-sm leading-6 text-ink outline-none transition focus:border-brand-teal"
                            value={block.content}
                            onChange={(event) =>
                              updateBlockContent(chapter.id, block.id, event.target.value)
                            }
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
