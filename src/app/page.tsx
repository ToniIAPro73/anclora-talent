import { LandingBenefits } from '@/components/marketing/landing-benefits';
import { LandingFaq } from '@/components/marketing/landing-faq';
import { LandingFinalCta } from '@/components/marketing/landing-final-cta';
import { LandingHeader } from '@/components/marketing/landing-header';
import { LandingHero } from '@/components/marketing/landing-hero';
import { LandingPricing } from '@/components/marketing/landing-pricing';
import { LandingProductShowcase } from '@/components/marketing/landing-product-showcase';
import { LandingProofStrip } from '@/components/marketing/landing-proof-strip';
import { LandingShowcase } from '@/components/marketing/landing-showcase';
import { LandingUseCases } from '@/components/marketing/landing-use-cases';
import { LandingWorkflow } from '@/components/marketing/landing-workflow';
import { getPrimaryCta, getSecondaryCta } from '@/components/marketing/marketing-helpers';
import { getCurrentUser } from '@/lib/auth/guards';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { readUiPreferences } from '@/lib/ui-preferences/preferences.server';

export default async function HomePage() {
  const user = await getCurrentUser();
  const { locale } = await readUiPreferences();
  const messages = resolveLocaleMessages(locale).landing;
  const primaryCta = getPrimaryCta(user?.id ?? null);
  const secondaryCta = getSecondaryCta(user?.id ?? null);
  const isAuthenticated = Boolean(user?.id);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      {/* Floating Glass Navigation Header */}
      <LandingHeader
        nav={messages.nav}
        primaryCta={primaryCta}
        secondaryCta={secondaryCta}
        isAuthenticated={isAuthenticated}
      />

      {/* Main Content Sections */}
      <main className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 sm:gap-10 lg:gap-12">
          {/* Hero Section */}
          <LandingHero
            eyebrow={messages.eyebrow}
            headline={messages.headline}
            subheadline={messages.subheadline}
            primaryCta={primaryCta}
            secondaryCta={secondaryCta}
            trustText={messages.heroTrust}
          />

          {/* Proof & Standards Strip */}
          <LandingProofStrip
            eyebrow={messages.proofEyebrow}
            items={messages.proofItems}
          />

          {/* Sequential 3-Step Workflow */}
          <LandingWorkflow
            id="caracteristicas"
            eyebrow={messages.workflowEyebrow}
            title={messages.workflowTitle}
            description={messages.workflowDescription}
            advanceLabel={messages.workflowAdvance}
            stepLabel={messages.workflowStepLabel}
            steps={messages.workflowSteps}
          />

          {/* Editorial Studio / Bento Capabilities */}
          <LandingProductShowcase
            id="estudio"
            eyebrow={messages.bentoEyebrow}
            title={messages.bentoTitle}
            description={messages.bentoDescription}
            panels={messages.bentoPillars.map((p) => ({
              title: p.title,
              description: p.description,
              accent: p.tag,
              image: p.image,
              bullets: p.features,
            }))}
          />

          {/* Production Showcase (Vitrina) */}
          <LandingShowcase
            id="vitrina"
            eyebrow={messages.showcaseEyebrow}
            title={messages.showcaseTitle}
            description={messages.showcaseDescription}
            items={messages.showcaseItems}
          />

          {/* Audience Use Cases */}
          <LandingUseCases
            id="audiencias"
            eyebrow={messages.useCasesEyebrow}
            title={messages.useCasesTitle}
            description={messages.useCasesDescription}
            useCases={messages.useCases}
          />

          {/* Transparent Access / Pricing */}
          <LandingPricing
            id="acceso"
            eyebrow={messages.pricingEyebrow}
            title={messages.pricingTitle}
            description={messages.pricingDescription}
            planName={messages.pricingPlanName}
            price={messages.pricingPrice}
            cadence={messages.pricingCadence}
            featuresTitle={messages.pricingFeaturesTitle}
            ctaText={messages.pricingCta}
            footnote={messages.pricingFootnote}
            features={messages.pricingFeatures}
          />

          {/* Accessible FAQ Accordion */}
          <LandingFaq
            id="faq"
            eyebrow={messages.faqEyebrow}
            title={messages.faqTitle}
            description={messages.faqDescription}
            items={messages.faqItems}
          />

          {/* Platform Benefits */}
          <LandingBenefits
            eyebrow={messages.benefitsEyebrow}
            title={messages.benefitsTitle}
            items={messages.benefits}
          />

          {/* Final Call to Action */}
          <LandingFinalCta
            eyebrow={messages.finalEyebrow}
            title={messages.finalTitle}
            primaryCta={primaryCta}
            secondaryCta={secondaryCta}
            note={messages.finalNote}
          />
        </div>
      </main>
    </div>
  );
}
