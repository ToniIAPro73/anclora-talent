type LandingProofStripProps = {
  items: string[];
};

export function LandingProofStrip({ items }: LandingProofStripProps) {
  return (
    <section className="rounded-[32px] border border-black/8 bg-white/82 px-6 py-6 shadow-[0_18px_60px_rgba(17,24,39,0.06)]">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Confianza</p>
      <ul className="mt-4 grid gap-3 lg:grid-cols-3" role="list">
        {items.map((item) => (
          <li key={item} className="rounded-[24px] border border-black/8 bg-[#f8f4eb] px-5 py-4 text-sm font-semibold leading-7 text-slate-800">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
