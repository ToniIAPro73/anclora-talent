import { BookMarked, FileOutput, MonitorSmartphone, ScanEye } from 'lucide-react';
import { useDocumentStore } from '../../domain/document/store';
import { Panel } from '../../shared/ui/Panel';
import { SectionHeader } from '../../shared/ui/SectionHeader';

export function PreviewScreen() {
  const { document } = useDocumentStore();
  const assetMap = new Map<string, (typeof document.assets)[number]>(
    document.assets.map((asset) => [asset.id, asset]),
  );

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

      <Panel className="overflow-hidden bg-ink text-white">
        <div className="grid gap-8 xl:grid-cols-[0.78fr_1.22fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/55">Principio de arquitectura</p>
            <h2 className="mt-3 font-headline text-3xl font-black">Sin documento fuente común no hay export fiable.</h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/72">
              Este preview ya consume el mismo contrato que alimenta el editor. Lo que cambie en el
              editor debe aparecer aquí sin transformar el modelo dos veces.
            </p>
          </div>
          <div className="rounded-[28px] bg-white px-6 py-6 text-ink">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Render editorial</p>
            <h3 className="mt-3 font-headline text-3xl font-black">{document.title}</h3>
            <p className="mt-2 text-base leading-7 text-muted">{document.subtitle}</p>
            <div className="mt-8 space-y-6">
              {document.chapters.map((chapter) => (
                <article key={chapter.id} className="space-y-4">
                  {chapter.blocks.map((block) => {
                    if (block.type === 'heading') {
                      return (
                        <h4 key={block.id} className="font-headline text-2xl font-black text-ink">
                          {block.content}
                        </h4>
                      );
                    }

                    if (block.type === 'paragraph') {
                      return (
                        <p key={block.id} className="text-sm leading-7 text-muted">
                          {block.content}
                        </p>
                      );
                    }

                    if (block.type === 'quote') {
                      return (
                        <blockquote
                          key={block.id}
                          className="rounded-[24px] border-l-4 border-brand-coral bg-[#fcfaf5] px-5 py-5"
                        >
                          <p className="text-base font-medium leading-7 text-ink">{block.content}</p>
                          {block.attribution ? (
                            <footer className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                              {block.attribution}
                            </footer>
                          ) : null}
                        </blockquote>
                      );
                    }

                    if (block.type === 'image') {
                      const asset = assetMap.get(block.assetId);

                      return (
                        <figure key={block.id} className="space-y-3">
                          {asset ? (
                            <img
                              src={asset.source}
                              alt={asset.alt}
                              className="h-64 w-full rounded-[24px] object-cover"
                            />
                          ) : null}
                          <figcaption className="text-sm leading-6 text-muted">{block.caption}</figcaption>
                        </figure>
                      );
                    }

                    return (
                      <div key={block.id} className="py-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                        {block.label}
                      </div>
                    );
                  })}
                </article>
              ))}
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
