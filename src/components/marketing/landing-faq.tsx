import { ChevronDown, HelpCircle } from 'lucide-react';
import type { MarketingFaqItem } from './marketing-data';

type LandingFaqProps = {
  eyebrow: string;
  title: string;
  description: string;
  items: readonly MarketingFaqItem[];
  id?: string;
};

export function LandingFaq({
  description,
  eyebrow,
  items,
  title,
  id = 'faq',
}: LandingFaqProps) {
  return (
    <section
      id={id}
      className="scroll-mt-20 rounded-[34px] border border-[var(--border-subtle)] bg-[var(--page-surface)] px-6 py-8 shadow-[var(--shadow-soft)] sm:px-8 sm:py-12"
    >
      <div className="mx-auto max-w-3xl text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--accent-text)]">
          <HelpCircle className="h-3 w-3" />
          <span>{eyebrow}</span>
        </div>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl lg:text-4xl font-editorial">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
          {description}
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-3xl space-y-3.5">
        {items.map((item) => (
          <details
            key={item.question}
            className="group rounded-[22px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-5 transition-colors duration-200 open:border-[var(--border-strong)] open:bg-[var(--surface-elevated)]"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-[var(--text-primary)] text-sm sm:text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
              <span>{item.question}</span>
              <span className="ml-4 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--background)] text-[var(--text-secondary)] transition duration-200 group-open:rotate-180 group-open:text-[var(--accent-text)]">
                <ChevronDown className="h-4 w-4" />
              </span>
            </summary>
            <div className="mt-3.5 border-t border-[var(--border-subtle)] pt-3.5 text-xs sm:text-sm leading-relaxed text-[var(--text-secondary)]">
              {item.answer}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
