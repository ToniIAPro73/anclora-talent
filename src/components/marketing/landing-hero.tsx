import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import type { MarketingCta } from './marketing-helpers';
import { premiumPrimaryMintButton } from '@/components/ui/button-styles';

type LandingHeroProps = {
  eyebrow: string;
  headline: string;
  subheadline: string;
  primaryCta: MarketingCta;
  secondaryCta: MarketingCta;
};

export function LandingHero({
  eyebrow,
  headline,
  subheadline,
  primaryCta,
  secondaryCta,
}: LandingHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-[40px] border border-black/8 bg-[radial-gradient(circle_at_top_left,_rgba(13,148,136,0.18),_transparent_32%),linear-gradient(180deg,_#101827_0%,_#172236_100%)] px-6 py-8 text-white shadow-[0_30px_120px_rgba(17,24,39,0.2)] sm:px-8 lg:px-10 lg:py-10">
      <div className="pointer-events-none absolute -right-16 top-8 h-56 w-56 rounded-full bg-teal-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-amber-200/10 blur-3xl" />

      <div className="relative grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-xs font-semibold uppercase tracking-[0.26em] text-white/72">
            <Sparkles className="h-3.5 w-3.5 text-teal-300" />
            {eyebrow}
          </div>

          <h1 className="mt-6 max-w-4xl text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
            {headline}
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/74 sm:text-xl">
            {subheadline}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={primaryCta.href}
              className={`${premiumPrimaryMintButton} focus-visible:ring-offset-[#101827]`}
            >
              {primaryCta.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={secondaryCta.href}
              className="inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-full border border-white/18 bg-white/6 px-6 py-3 text-sm font-semibold text-[#f8f4eb] transition hover:border-white/32 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101827]"
            >
              {secondaryCta.label}
            </Link>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/55">01</p>
              <p className="mt-2 text-sm font-semibold">Registro inmediato</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/55">02</p>
              <p className="mt-2 text-sm font-semibold">Flujo editorial claro</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/55">03</p>
              <p className="mt-2 text-sm font-semibold">Resultado publicable</p>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-x-12 top-0 h-24 rounded-full bg-teal-400/15 blur-2xl" />
          <div className="relative rounded-[34px] border border-white/10 bg-white/8 p-5 shadow-[0_22px_80px_rgba(15,23,42,0.28)] backdrop-blur">
            <div className="rounded-[28px] bg-slate-950/88 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-300">Anclora Talent</p>
                  <p className="mt-2 text-2xl font-black tracking-tight">Sistema editorial premium</p>
                </div>
                <div className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                  Ready
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-[24px] bg-white/8 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/52">Documento</p>
                  <p className="mt-3 text-sm font-semibold text-white">Un origen de verdad</p>
                </div>
                <div className="rounded-[24px] bg-white/8 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/52">Preview</p>
                  <p className="mt-3 text-sm font-semibold text-white">Lectura en contexto</p>
                </div>
                <div className="rounded-[24px] bg-white/8 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/52">Portada</p>
                  <p className="mt-3 text-sm font-semibold text-white">Assets listos para publicar</p>
                </div>
              </div>

              <div className="mt-6 rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,_rgba(45,212,191,0.16),_rgba(15,23,42,0.08))] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-200">Flujo recomendado</p>
                <p className="mt-3 text-lg font-semibold leading-8 text-white/92">
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
