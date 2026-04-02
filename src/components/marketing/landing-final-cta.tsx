import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { MarketingCta } from './marketing-helpers';
import { premiumPrimaryMintButton } from '@/components/ui/button-styles';

type LandingFinalCtaProps = {
  eyebrow: string;
  title: string;
  primaryCta: MarketingCta;
  note: string;
};

export function LandingFinalCta({ eyebrow, note, primaryCta, title }: LandingFinalCtaProps) {
  return (
    <section className="rounded-[36px] border border-[var(--border-subtle)] bg-[var(--shell-main-surface)] px-6 py-8 text-[var(--text-primary)] shadow-[var(--shadow-strong)]">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">{eyebrow}</p>
        <h2 className="mt-3 text-3xl font-black tracking-tight text-[var(--text-primary)] sm:text-4xl">
          {title}
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
          {note}
        </p>
        <div className="mt-8">
          <Link
            href={primaryCta.href}
            className={`${premiumPrimaryMintButton} focus-visible:ring-offset-[var(--background)]`}
          >
            {primaryCta.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
