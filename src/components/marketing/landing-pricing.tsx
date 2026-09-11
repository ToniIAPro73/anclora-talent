import Link from 'next/link';
import { Check, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import { premiumPrimaryMintButton } from '@/components/ui/button-styles';

type LandingPricingProps = {
  eyebrow: string;
  title: string;
  description: string;
  planName: string;
  price: string;
  cadence: string;
  featuresTitle: string;
  ctaText: string;
  footnote: string;
  features: readonly string[];
  id?: string;
};

export function LandingPricing({
  cadence,
  ctaText,
  description,
  eyebrow,
  features,
  featuresTitle,
  footnote,
  planName,
  price,
  title,
  id = 'acceso',
}: LandingPricingProps) {
  return (
    <section
      id={id}
      className="scroll-mt-20 rounded-[34px] border border-[var(--border-subtle)] bg-[var(--page-surface)] px-6 py-8 shadow-[var(--shadow-soft)] sm:px-8 sm:py-12"
    >
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--accent-text)]">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl lg:text-4xl font-editorial">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
          {description}
        </p>
      </div>

      {/* Featured Pricing Card */}
      <div className="mx-auto mt-10 max-w-2xl overflow-hidden rounded-[30px] border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-6 shadow-xl sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border-subtle)] pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--accent-text)]">
              <Sparkles className="h-3 w-3" />
              <span>{planName}</span>
            </div>
            <p className="mt-2 text-xs text-[var(--text-tertiary)]">Acceso para autores y editores</p>
          </div>

          <div className="text-left sm:text-right">
            <div className="flex items-baseline gap-1 sm:justify-end">
              <span className="text-4xl font-extrabold text-[var(--text-primary)] font-editorial">{price}</span>
            </div>
            <span className="text-xs text-[var(--text-tertiary)]">{cadence}</span>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            {featuresTitle}
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 text-xs text-[var(--text-primary)]">
            {features.map((feat) => (
              <li key={feat} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[var(--accent-text)]">
                  <Check className="h-2.5 w-2.5" />
                </span>
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 border-t border-[var(--border-subtle)] pt-6">
          <Link
            href="/sign-up"
            className={`w-full sm:w-auto ${premiumPrimaryMintButton} justify-center`}
          >
            <span>{ctaText}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--accent-text)]" />
            <span>{footnote}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
