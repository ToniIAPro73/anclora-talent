import { Image, Layers3, PanelTop, TypeOutline } from 'lucide-react';
import { Panel } from '../../shared/ui/Panel';
import { SectionHeader } from '../../shared/ui/SectionHeader';

export function CoverStudioScreen() {
  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Feature 03"
        title="El estudio de portadas debe ser una feature propia, no una pantalla decorativa."
        description="Portada, contraportada y lomo requieren un modelo visual distinto al del editor de contenido. Aquí conviene trabajar con layout, capas, templates y exportaciones específicas."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel>
          <Layers3 className="h-5 w-5 text-brand-teal" />
          <h3 className="mt-4 font-headline text-xl font-black">Capas y zonas seguras</h3>
          <p className="mt-3 text-sm leading-6 text-muted">
            Fondo, overlays, titulares, autor y claims deben reposicionarse sin romper composición.
          </p>
        </Panel>
        <Panel>
          <TypeOutline className="h-5 w-5 text-brand-coral" />
          <h3 className="mt-4 font-headline text-xl font-black">Tipografías editoriales</h3>
          <p className="mt-3 text-sm leading-6 text-muted">
            Sistema tipográfico distinto al interior, con presets de portada y combinaciones revisables.
          </p>
        </Panel>
        <Panel>
          <Image className="h-5 w-5 text-brand-teal" />
          <h3 className="mt-4 font-headline text-xl font-black">Assets y variantes</h3>
          <p className="mt-3 text-sm leading-6 text-muted">
            Generación de variantes por formato, miniatura comercial y promoción digital.
          </p>
        </Panel>
      </div>

      <Panel className="overflow-hidden">
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[28px] bg-[#183536] px-6 py-8 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/55">Concepto</p>
            <h2 className="mt-3 max-w-sm font-headline text-4xl font-black leading-tight">
              Portadas pensadas para venta digital, no solo para verse bonitas.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-white/72">
              La portada debe funcionar en full size y en miniatura. Por eso el MVP tiene que medir
              legibilidad, contraste y jerarquía antes de exportar.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] bg-[#efe8d7] px-5 py-5">
              <PanelTop className="h-5 w-5 text-ink" />
              <p className="mt-4 font-headline text-lg font-black text-ink">Templates base</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Ensayo, negocio, novela y manual práctico como primeras familias.
              </p>
            </div>
            <div className="rounded-[24px] bg-white px-5 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Siguiente trabajo</p>
              <p className="mt-4 font-headline text-lg font-black text-ink">Canvas de portada</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Primera versión con fondo, texto, imagen, overlays y export de miniatura.
              </p>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
