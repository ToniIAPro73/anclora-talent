import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Sparkles, BookOpen } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import type { MarketingCta } from './marketing-helpers';
import { premiumPrimaryMintButton } from '@/components/ui/button-styles';

type LandingHeroProps = {
  eyebrow: string;
  headline: string;
  subheadline: string;
  primaryCta: MarketingCta;
  secondaryCta: MarketingCta | null;
  trustText?: string;
};

export function LandingHero({
  eyebrow,
  headline,
  subheadline,
  primaryCta,
  secondaryCta,
  trustText = '100% tus derechos · Sin tarjeta de crédito · Exportación en PDF, EPUB y DOCX',
}: LandingHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-[36px] border border-[var(--border-subtle)] bg-[var(--shell-main-surface)] px-5 py-8 text-[var(--text-primary)] shadow-[var(--shadow-strong)] sm:px-8 sm:py-12 lg:px-12 lg:py-16">
      {/* Editorial Canvas Background Art */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {/* Dark Theme: Renaissance Book Proportion Grid & Warm Copper Lighting */}
        <div className="theme-dark-only absolute inset-0">
          <Image
            src="/landing/backgrounds/hero-dark-editorial.jpg"
            alt=""
            fill
            priority
            sizes="(max-width: 1280px) 100vw, 1280px"
            className="object-cover object-right opacity-35 mix-blend-screen"
          />
        </div>

        {/* Light Theme: Fine Art Cotton Paper & Deckle Edge */}
        <div className="theme-light-only absolute inset-0">
          <Image
            src="/landing/backgrounds/hero-light-paper.jpg"
            alt=""
            fill
            priority
            sizes="(max-width: 1280px) 100vw, 1280px"
            className="object-cover object-center opacity-85 mix-blend-multiply"
          />
        </div>

        {/* Soft Ambient Radiance */}
        <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-[var(--accent-glow)] blur-3xl opacity-60" />
        <div className="absolute -bottom-24 left-1/4 h-80 w-80 rounded-full bg-[var(--accent-glow-soft)] blur-3xl opacity-40" />
      </div>

      <div className="relative grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12">
        {/* Left Column: Copy & Actions */}
        <div>
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)] backdrop-blur-sm">
            <BrandLogo size={14} priority />
            <span>{eyebrow}</span>
          </div>

          {/* Editorial H1 */}
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-5xl lg:text-6xl font-editorial leading-[1.1]">
            {headline}
          </h1>

          {/* Subheadline */}
          <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">
            {subheadline}
          </p>

          {/* CTAs */}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={primaryCta.href}
              className={`${premiumPrimaryMintButton} focus-visible:ring-offset-[var(--background)]`}
            >
              <span>{primaryCta.label}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            {secondaryCta ? (
              <Link
                href={secondaryCta.href}
                className="inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-full border border-[var(--button-secondary-border)] bg-[var(--button-secondary-bg)] px-6 py-3 text-sm font-semibold text-[var(--button-secondary-fg)] transition hover:border-[var(--button-secondary-hover-border)] hover:bg-[var(--button-secondary-hover-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
              >
                {secondaryCta.label}
              </Link>
            ) : null}
          </div>

          {/* Micro-trust line */}
          <div className="mt-4 flex items-center gap-2 text-xs font-medium text-[var(--text-tertiary)]">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--accent-text)] flex-shrink-0" />
            <span>{trustText}</span>
          </div>

          {/* Three Value Badges */}
          <div className="mt-8 grid grid-cols-3 gap-2.5 sm:gap-4 border-t border-[var(--border-subtle)] pt-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)]">01</span>
              <span className="mt-1 text-xs font-semibold text-[var(--text-primary)]">Sin tarjeta</span>
              <span className="text-[11px] text-[var(--text-tertiary)]">Plan creador libre</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)]">02</span>
              <span className="mt-1 text-xs font-semibold text-[var(--text-primary)]">Multiformato</span>
              <span className="text-[11px] text-[var(--text-tertiary)]">PDF · EPUB · Word</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)]">03</span>
              <span className="mt-1 text-xs font-semibold text-[var(--text-primary)]">100% tuyo</span>
              <span className="text-[11px] text-[var(--text-tertiary)]">Derechos íntegros</span>
            </div>
          </div>
        </div>

        {/* Right Column: Layered UI Composition */}
        <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
          {/* Main frame: Editor Preview */}
          <div className="overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] shadow-2xl transition-transform duration-300 hover:scale-[1.01]">
            {/* Window Chrome Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--text-tertiary)]">
                <BookOpen className="h-3 w-3 text-[var(--accent-text)]" />
                <span>anclora-talent // editor</span>
              </div>
              <div className="text-[10px] uppercase font-mono tracking-wider text-[var(--accent-text)] font-semibold">
                Doble pliego
              </div>
            </div>

            {/* Real Screenshot Embed: Paired Dark and Light */}
            <div className="relative aspect-[16/10] w-full bg-[var(--background)]">
              <div className="theme-dark-only relative h-full w-full">
                <Image
                  src="/landing/features/preview-spread-dark.png"
                  alt="Vista previa del visor de doble pliego en Anclora Talent (tema oscuro)"
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
                  className="object-cover object-top"
                />
              </div>
              <div className="theme-light-only relative h-full w-full">
                <Image
                  src="/landing/features/preview-spread-light.png"
                  alt="Vista previa del visor de doble pliego en Anclora Talent (tema claro)"
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
                  className="object-cover object-top"
                />
              </div>
            </div>
          </div>

          {/* Floating Inset Badge: Cover Canvas preview */}
          <div className="absolute -bottom-5 -left-4 sm:-bottom-6 sm:-left-6 hidden sm:flex items-center gap-3.5 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)]/95 p-3 shadow-xl backdrop-blur-md">
            <div className="relative h-14 w-10 overflow-hidden rounded border border-[var(--border-subtle)] shadow-sm flex-shrink-0">
              <div className="theme-dark-only relative h-full w-full">
                <Image
                  src="/landing/hero/cover-preview-dark.png"
                  alt="Estudio visual de cubiertas (tema oscuro)"
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              </div>
              <div className="theme-light-only relative h-full w-full">
                <Image
                  src="/landing/hero/cover-preview-light.png"
                  alt="Estudio visual de cubiertas (tema claro)"
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              </div>
            </div>
            <div className="pr-2">
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-text)]">
                <Sparkles className="h-3 w-3" />
                <span>Estudio de cubierta</span>
              </div>
              <p className="text-xs font-semibold text-[var(--text-primary)]">Lienzo milimétrico</p>
              <p className="text-[11px] text-[var(--text-tertiary)]">Frontal · Lomo · Reverso</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
