import type { MarketingShowcasePanel } from './marketing-data';

type LandingProductShowcaseProps = {
  id: string;
  title: string;
  panels: MarketingShowcasePanel[];
};

export function LandingProductShowcase({ id, title, panels }: LandingProductShowcaseProps) {
  const titleId = `${id}-title`;

  return (
    <section id={id} aria-labelledby={titleId} className="rounded-[36px] border border-black/8 bg-slate-950 px-6 py-8 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-300">Producto</p>
          <h2 id={titleId} className="mt-3 max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl">
            {title}
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-7 text-white/68">
          El usuario no necesita interpretar capas tecnicas. Necesita ver como encajan documento, preview y portada en una
          sola experiencia.
        </p>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {panels.map((panel) => (
          <article key={panel.title} className="rounded-[30px] border border-white/10 bg-white/6 p-5">
            <div className="inline-flex rounded-full border border-teal-300/20 bg-teal-300/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-teal-200">
              {panel.accent ?? 'Bloque'}
            </div>
            <h3 className="mt-4 text-2xl font-black tracking-tight text-white">{panel.title}</h3>
            <p className="mt-3 text-sm leading-7 text-white/72">{panel.description}</p>
            {panel.bullets?.length ? (
              <ul className="mt-5 space-y-2 text-sm leading-7 text-white/84">
                {panel.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3">
                    <span className="mt-2 h-2 w-2 rounded-full bg-teal-300" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
