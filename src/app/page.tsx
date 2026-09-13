import { LandingFaq } from '@/components/marketing/landing-faq';
import { LandingFinalCta } from '@/components/marketing/landing-final-cta';
import { LandingHeader } from '@/components/marketing/landing-header';
import { LandingHero } from '@/components/marketing/landing-hero';
import { LandingPricing } from '@/components/marketing/landing-pricing';
import { LandingProductStory } from '@/components/marketing/landing-product-story';
import { LandingUseCases } from '@/components/marketing/landing-use-cases';
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

  // 3 high-impact questions for landing FAQ
  const faqItems = messages.faqItems.slice(0, 3);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      {/* 1. Floating Glass Navigation Header */}
      <LandingHeader
        nav={messages.nav}
        primaryCta={primaryCta}
        secondaryCta={secondaryCta}
        isAuthenticated={isAuthenticated}
      />

      {/* Main Content Sections */}
      <main className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 sm:gap-10 lg:gap-12">
          {/* 1. Hero Section with Real Cover Studio Centerpiece & Editorial Collage */}
          <LandingHero
            eyebrow={messages.eyebrow}
            headline={messages.headline}
            subheadline={messages.subheadline}
            primaryCta={primaryCta}
            secondaryCta={secondaryCta}
            exploreProductLabel={messages.heroSecondaryCta}
            trustText={messages.heroTrust}
            coverLabel={messages.heroCollageCoverLabel}
            editorLabel={messages.heroCollageEditorLabel}
            spreadLabel={messages.heroCollageSpreadLabel}
          />

          {/* 2. Unified Real Product Story (Editor, Spread, Cover Studio) */}
          <LandingProductStory
            id="producto"
            eyebrow={messages.productStory.eyebrow}
            title={messages.productStory.title}
            description={messages.productStory.description}
            moments={messages.productStory.moments}
            frontLabel={messages.productStory.frontLabel}
            backLabel={messages.productStory.backLabel}
            viewLabel={messages.productStory.viewLabel}
          />

          {/* 3. Audience Use Cases */}
          <LandingUseCases
            id="audiencias"
            eyebrow={messages.useCasesEyebrow}
            title={messages.useCasesTitle}
            description={messages.useCasesDescription}
            useCases={messages.useCases}
          />

          {/* 4. Transparent Access / Pricing */}
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

          {/* 5. Accessible FAQ Accordion */}
          <LandingFaq
            id="faq"
            eyebrow={messages.faqEyebrow}
            title={messages.faqTitle}
            description={messages.faqDescription}
            items={faqItems}
          />

          {/* 6. Final Call to Action */}
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
