import Image from 'next/image';
import Link from 'next/link';
import type { MarketingCta } from './marketing-helpers';

type LandingFinalCtaProps = {
  eyebrow: string;
  title: string;
  primaryCta: MarketingCta;
  secondaryCta?: MarketingCta | null;
  note: string;
};

export function LandingFinalCta({
  eyebrow,
  note,
  primaryCta,
  secondaryCta,
  title,
}: LandingFinalCtaProps) {
  return (
    <section className="relative overflow-hidden rounded-[36px] border border-[var(--border-subtle)] bg-[var(--shell-main-surface)] px-6 py-10 text-[var(--text-primary)] shadow-[var(--shadow-strong)] sm:px-10 sm:py-14">
      {/* Bookcloth Texture & Warm Light */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <Image
          src="/landing/backgrounds/cta-bookcloth.jpg"
          alt=""
          fill
          sizes="(max-width: 1280px) 100vw, 1280px"
          className="object-cover object-center opacity-20 dark:opacity-30 mix-blend-overlay"
        />
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[var(--accent-glow)] blur-3xl opacity-60" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[var(--accent-glow-soft)] blur-3xl opacity-40" />
      </div>

      <div className="relative max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--accent-text)]">
          {eyebrow}
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl lg:text-5xl font-editorial">
          {title}
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
          {note}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link href={primaryCta.href} className="dashboard-button dashboard-button--primary">
            {primaryCta.label}
          </Link>
          {secondaryCta ? (
            <Link href={secondaryCta.href} className="dashboard-button">
              {secondaryCta.label}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
