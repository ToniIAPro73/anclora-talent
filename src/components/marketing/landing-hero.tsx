import Image from 'next/image';
import Link from 'next/link';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import type { MarketingCta } from './marketing-helpers';

type LandingHeroProps = {
  eyebrow: string;
  headline: string;
  subheadline: string;
  primaryCta: MarketingCta;
  secondaryCta: MarketingCta | null;
  exploreProductLabel?: string;
  trustText?: string;
  coverLabel?: string;
  editorLabel?: string;
  spreadLabel?: string;
};

export function LandingHero({
  eyebrow,
  headline,
  subheadline,
  primaryCta,
  secondaryCta,
  exploreProductLabel,
  trustText = '100% tus derechos · Sin tarjeta · Exportación en PDF, EPUB y Word',
  coverLabel,
  editorLabel,
  spreadLabel,
}: LandingHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-[36px] border border-[var(--border-subtle)] bg-[var(--shell-main-surface)] px-5 py-8 text-[var(--text-primary)] shadow-[var(--shadow-strong)] sm:px-8 sm:py-12 lg:px-12 lg:py-16">
      {/* Editorial Canvas Background Art. Both themes render the SAME cotton-
          paper photo (not two different assets) — dark mode derives its tone
          from it with a pure color filter (.landing-hero-texture--dark) so
          grain/geometry/composition stay identical and only color adapts. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {/* Dark Theme: same cotton-paper photo, ink-navy color grade */}
        <div className="theme-dark-only absolute inset-0">
          <Image
            src="/landing/backgrounds/hero-light-paper.jpg"
            alt=""
            fill
            priority
            sizes="(max-width: 1280px) 100vw, 1280px"
            className="landing-hero-texture--dark object-cover object-right opacity-90"
          />
        </div>

        {/* Light Theme: Fine Art Cotton Paper */}
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
            <Link href={primaryCta.href} className="dashboard-button dashboard-button--primary">
              {primaryCta.label}
            </Link>
            {secondaryCta ? (
              <Link href={secondaryCta.href} className="dashboard-button">
                {secondaryCta.label}
              </Link>
            ) : null}
            {exploreProductLabel ? (
              <a href="#producto" className="dashboard-preview-link">
                {exploreProductLabel}
              </a>
            ) : null}
          </div>

          {/* Micro-trust line */}
          <div className="mt-5 flex items-center gap-2 text-xs font-medium text-[var(--text-tertiary)]">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--accent-text)] flex-shrink-0" />
            <span>{trustText}</span>
          </div>
        </div>

        {/* Right Column: Editorial Multi-view Collage */}
        <div className="relative mx-auto w-full max-w-lg lg:max-w-none pt-4 sm:pt-6">
          {/* Layer 1 (Offset Top-Left Background): Real Chapter Editor */}
          <div className="absolute -top-3 -left-3 sm:-top-5 sm:-left-5 w-[85%] overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-soft)] shadow-md opacity-40 transition-opacity duration-300 hover:opacity-75 hidden sm:block">
            <div className="absolute top-2.5 left-3 z-10 hidden sm:inline-flex items-center rounded-md bg-[var(--surface)]/85 px-2 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)] backdrop-blur-sm">
              <span>{editorLabel || 'Editor de capítulos'}</span>
            </div>
            <div className="relative aspect-[16/10] w-full bg-[var(--background)]">
              <div className="theme-dark-only relative h-full w-full">
                <Image
                  src="/landing/features/editor-preview-dark.png"
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 50vw, 500px"
                  className="object-cover object-top"
                />
              </div>
              <div className="theme-light-only relative h-full w-full">
                <Image
                  src="/landing/features/editor-preview-light.png"
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 50vw, 500px"
                  className="object-cover object-top"
                />
              </div>
            </div>
          </div>

          {/* Layer 2 (Primary Centerpiece): Real Cover Studio */}
          <div className="relative z-20 overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] shadow-2xl transition-all duration-300 hover:scale-[1.008]">
            <div className="relative aspect-[16/10] w-full bg-[var(--background)]">
              <div className="theme-dark-only relative h-full w-full">
                <Image
                  src="/landing/features/cover-studio-dark.png"
                  alt="Estudio de diseño de cubierta en Anclora Talent (tema oscuro)"
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 650px"
                  className="object-cover object-top"
                />
              </div>
              <div className="theme-light-only relative h-full w-full">
                <Image
                  src="/landing/features/cover-studio-light.png"
                  alt="Estudio de diseño de cubierta en Anclora Talent (tema claro)"
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 650px"
                  className="object-cover object-top"
                />
              </div>
            </div>
          </div>

          {/* Layer 3 (Floating Inset Accent): Back Cover & Editorial Spine */}
          <div className="absolute -bottom-5 -right-2 sm:-bottom-6 sm:-right-4 z-30 flex items-center gap-3 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)]/95 p-2.5 sm:p-3 shadow-xl backdrop-blur-md transition hover:scale-105">
            <div className="relative h-13 w-10 overflow-hidden rounded border border-[var(--border-subtle)] shadow-sm flex-shrink-0">
              <div className="theme-dark-only relative h-full w-full">
                <Image
                  src="/landing/features/cover-studio-back-dark.png"
                  alt=""
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              </div>
              <div className="theme-light-only relative h-full w-full">
                <Image
                  src="/landing/features/cover-studio-back-light.png"
                  alt=""
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              </div>
            </div>
            <div className="pr-1.5 sm:pr-2">
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-text)]">
                <Sparkles className="h-3 w-3" />
                <span>{coverLabel || 'Estudio de cubierta'}</span>
              </div>
              <p className="text-xs font-semibold text-[var(--text-primary)] leading-tight">Atlas de la Memoria</p>
              <p className="text-[11px] text-[var(--text-tertiary)]">{spreadLabel || 'Contraportada & pliego'}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
