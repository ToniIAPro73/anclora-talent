import type { MarketingBenefit } from './marketing-data';

type LandingBenefitsProps = {
  items: MarketingBenefit[];
};

export function LandingBenefits({ items }: LandingBenefitsProps) {
  return (
    <section className="rounded-[34px] border border-black/8 bg-white px-6 py-8 shadow-[0_18px_60px_rgba(17,24,39,0.06)]">
      <div className="flex flex-col gap-3 border-b border-black/8 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Beneficios</p>
        <h2 className="text-3xl font-black tracking-tight text-slate-950">Lo que el usuario gana en cada visita</h2>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {items.map((item) => (
          <article key={item.title} className="rounded-[28px] border border-black/8 bg-[linear-gradient(180deg,_#ffffff_0%,_#f8f4eb_100%)] p-5">
            <h3 className="text-2xl font-black tracking-tight text-slate-950">{item.title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
