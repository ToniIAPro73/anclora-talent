import { Feather, Zap, ShieldCheck } from 'lucide-react';
import type { MarketingBenefit } from './marketing-data';

type LandingBenefitsProps = {
  eyebrow: string;
  title: string;
  items: readonly MarketingBenefit[];
};

const BENEFIT_ICONS = [Feather, Zap, ShieldCheck];

export function LandingBenefits({ eyebrow, title, items }: LandingBenefitsProps) {
  return (
    <section className="rounded-[34px] border border-[var(--border-subtle)] bg-[var(--page-surface)] px-6 py-8 shadow-[var(--shadow-soft)] sm:px-8 sm:py-10">
      <div className="flex flex-col gap-2 border-b border-[var(--border-subtle)] pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--accent-text)]">
          {eyebrow}
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl font-editorial">
          {title}
        </h2>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {items.map((item, idx) => {
          const Icon = BENEFIT_ICONS[idx % BENEFIT_ICONS.length] ?? Feather;
          return (
            <article
              key={item.title}
              className="flex flex-col justify-between rounded-[26px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-6 transition duration-200 hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]"
            >
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/15 text-[var(--accent-text)]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-xl font-bold tracking-tight text-[var(--text-primary)]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {item.description}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
