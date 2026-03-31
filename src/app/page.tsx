import { auth } from '@clerk/nextjs/server';
import { LandingBenefits } from '@/components/marketing/landing-benefits';
import { LandingFinalCta } from '@/components/marketing/landing-final-cta';
import { LandingHero } from '@/components/marketing/landing-hero';
import { LandingProductShowcase } from '@/components/marketing/landing-product-showcase';
import { LandingProofStrip } from '@/components/marketing/landing-proof-strip';
import { LandingWorkflow } from '@/components/marketing/landing-workflow';
import {
  marketingBenefitItems,
  marketingProofItems,
  marketingShowcasePanels,
  marketingWorkflowSteps,
} from '@/components/marketing/marketing-data';
import { getPrimaryCta, getSecondaryCta } from '@/components/marketing/marketing-helpers';

export default async function HomePage() {
  const { userId } = await auth();
  const primaryCta = getPrimaryCta(userId);
  const secondaryCta = getSecondaryCta(userId);

  return (
    <main className="min-h-screen px-4 py-4 text-slate-950 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 lg:gap-6">
        <LandingHero
          eyebrow="Anclora Talent"
          headline="Convierte talento en una presencia editorial lista para publicar."
          subheadline="Crea tu cuenta, lanza tu proyecto y trabaja sobre un flujo claro de documento, preview y portada desde una misma plataforma."
          primaryCta={primaryCta}
          secondaryCta={secondaryCta}
        />
        <LandingProofStrip items={marketingProofItems} />
        <LandingWorkflow steps={marketingWorkflowSteps} />
        <LandingProductShowcase
          id="product-showcase"
          title="Una plataforma donde documento, preview y portada dejan de competir entre si."
          panels={marketingShowcasePanels}
        />
        <LandingBenefits items={marketingBenefitItems} />
        <LandingFinalCta
          primaryCta={primaryCta}
          note="Empieza con una cuenta propia, crea tu primer proyecto y trabaja con una base que ya transmite claridad, consistencia y salida real."
        />
      </div>
    </main>
  );
}
