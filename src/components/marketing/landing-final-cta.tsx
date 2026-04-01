import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { MarketingCta } from './marketing-helpers';
import { premiumPrimaryMintButton } from '@/components/ui/button-styles';

type LandingFinalCtaProps = {
  primaryCta: MarketingCta;
  note: string;
};

export function LandingFinalCta({ primaryCta, note }: LandingFinalCtaProps) {
  return (
    <section className="rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.16),_transparent_35%),linear-gradient(180deg,_#111a2b_0%,_#0a1120_100%)] px-6 py-8 text-white shadow-[0_18px_60px_rgba(3,7,18,0.28)]">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/50">Siguiente paso</p>
        <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
          Abre tu cuenta y empieza con una base que ya parece producto.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70">
          {note}
        </p>
        <div className="mt-8">
          <Link
            href={primaryCta.href}
            className={`${premiumPrimaryMintButton} focus-visible:ring-offset-[#0a1120]`}
          >
            {primaryCta.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
