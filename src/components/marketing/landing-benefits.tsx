import type { MarketingBenefit } from './marketing-data';

type LandingBenefitsProps = {
  eyebrow: string;
  title: string;
  items: readonly MarketingBenefit[];
};

export function LandingBenefits({ eyebrow, title, items }: LandingBenefitsProps) {
  return (
    <section className="rounded-[34px] border border-[var(--border-subtle)] bg-[var(--page-surface)] px-6 py-8 shadow-[var(--shadow-soft)]">
      <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">{eyebrow}</p>
        <h2 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">{title}</h2>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {items.map((item) => (
          <article key={item.title} className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--page-surface-muted)] p-5">
            <h3 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">{item.title}</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
