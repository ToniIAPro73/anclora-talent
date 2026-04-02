type LandingProofStripProps = {
  eyebrow: string;
  items: readonly string[];
};

export function LandingProofStrip({ eyebrow, items }: LandingProofStripProps) {
  return (
    <section className="rounded-[32px] border border-[var(--border-subtle)] bg-[var(--page-surface)] px-6 py-6 shadow-[var(--shadow-soft)]">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">{eyebrow}</p>
      <ul className="mt-4 grid gap-3 lg:grid-cols-3" role="list">
        {items.map((item) => (
          <li key={item} className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-5 py-4 text-sm font-semibold leading-7 text-[var(--text-primary)]">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
