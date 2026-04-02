import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import type { MarketingCta } from './marketing-helpers';
import { premiumPrimaryMintButton } from '@/components/ui/button-styles';

type LandingHeroProps = {
  eyebrow: string;
  headline: string;
  subheadline: string;
  primaryCta: MarketingCta;
  secondaryCta: MarketingCta | null;
};

export function LandingHero({
  eyebrow,
  headline,
  subheadline,
  primaryCta,
  secondaryCta,
}: LandingHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-[40px] border border-[var(--border-subtle)] bg-[var(--shell-main-surface)] px-6 py-8 text-[var(--text-primary)] shadow-[var(--shadow-strong)] sm:px-8 lg:px-10 lg:py-10">
      <div className="pointer-events-none absolute -right-16 top-8 h-56 w-56 rounded-full bg-[var(--accent-glow)] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-[var(--accent-glow-soft)] blur-3xl" />

      <div className="relative grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.26em] text-[var(--text-secondary)]">
            <Sparkles className="h-3.5 w-3.5 text-[var(--accent-mint)]" />
            {eyebrow}
          </div>

          <h1 className="mt-6 max-w-4xl text-5xl font-black tracking-tight text-[var(--text-primary)] sm:text-6xl lg:text-7xl">
            {headline}
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--text-secondary)] sm:text-xl">
            {subheadline}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={primaryCta.href}
              className={`${premiumPrimaryMintButton} focus-visible:ring-offset-[var(--background)]`}
            >
              {primaryCta.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
            {secondaryCta ? (
              <Link
                href={secondaryCta.href}
                className="inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-full border border-[var(--button-secondary-border)] bg-[var(--button-secondary-bg)] px-6 py-3 text-sm font-semibold text-[var(--button-secondary-fg)] transition hover:border-[var(--button-secondary-hover-border)] hover:bg-[var(--button-secondary-hover-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-mint)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
              >
                {secondaryCta.label}
              </Link>
            ) : null}
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-tertiary)]">01</p>
              <p className="mt-2 text-sm font-semibold">Registro inmediato</p>
            </div>
            <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-tertiary)]">02</p>
              <p className="mt-2 text-sm font-semibold">Flujo editorial claro</p>
            </div>
            <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-tertiary)]">03</p>
              <p className="mt-2 text-sm font-semibold">Resultado publicable</p>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-x-12 top-0 h-24 rounded-full bg-[var(--accent-glow)] blur-2xl" />
          <div className="relative rounded-[34px] border border-[var(--border-subtle)] bg-[color:var(--panel-on-canvas)] p-5 shadow-[var(--shadow-strong)] backdrop-blur">
            <div className="rounded-[28px] bg-[var(--surface-elevated)] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent-mint)]">Anclora Talent</p>
                  <p className="mt-2 text-2xl font-black tracking-tight">Sistema editorial premium</p>
                </div>
                <div className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Ready
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-[24px] bg-[var(--surface-soft)] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Documento</p>
                  <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">Un origen de verdad</p>
                </div>
                <div className="rounded-[24px] bg-[var(--surface-soft)] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Preview</p>
                  <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">Lectura en contexto</p>
                </div>
                <div className="rounded-[24px] bg-[var(--surface-soft)] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Portada</p>
                  <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">Assets listos para publicar</p>
                </div>
              </div>

              <div className="mt-6 rounded-[28px] border border-[var(--border-strong)] bg-[linear-gradient(135deg,_rgba(212,175,55,0.18),_rgba(18,74,80,0.28))] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-mint)]">Flujo recomendado</p>
                <p className="mt-3 text-lg font-semibold leading-8 text-[var(--text-primary)]">
                  Crea tu cuenta, inicia un proyecto y trabaja con una estructura visual que no te obliga a recomponer todo
                  cada vez.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
