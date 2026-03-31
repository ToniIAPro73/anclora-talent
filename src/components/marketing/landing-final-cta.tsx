import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { MarketingCta } from './marketing-helpers';

type LandingFinalCtaProps = {
  primaryCta: MarketingCta;
  note: string;
};

export function LandingFinalCta({ primaryCta, note }: LandingFinalCtaProps) {
  return (
    <section className="rounded-[36px] border border-black/8 bg-[radial-gradient(circle_at_top,_rgba(13,148,136,0.18),_transparent_35%),linear-gradient(180deg,_#f7f2e7_0%,_#ebe4d6_100%)] px-6 py-8 shadow-[0_18px_60px_rgba(17,24,39,0.08)]">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Siguiente paso</p>
        <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          Abre tu cuenta y empieza con una base que ya parece producto.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
          {note}
        </p>
        <div className="mt-8">
          <Link
            href={primaryCta.href}
            className="inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#07111f] px-6 py-3 text-sm font-semibold text-[#f8f4eb] shadow-[0_14px_34px_rgba(7,17,31,0.2)] transition hover:bg-[#123148] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#07111f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#ebe4d6]"
          >
            {primaryCta.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
