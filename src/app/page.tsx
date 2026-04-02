import { auth } from '@clerk/nextjs/server';
import { LandingBenefits } from '@/components/marketing/landing-benefits';
import { LandingFinalCta } from '@/components/marketing/landing-final-cta';
import { LandingHero } from '@/components/marketing/landing-hero';
import { LandingProductShowcase } from '@/components/marketing/landing-product-showcase';
import { LandingProofStrip } from '@/components/marketing/landing-proof-strip';
import { LandingWorkflow } from '@/components/marketing/landing-workflow';
import { getPrimaryCta, getSecondaryCta } from '@/components/marketing/marketing-helpers';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { readUiPreferences } from '@/lib/ui-preferences/preferences.server';

export default async function HomePage() {
  const { userId } = await auth();
  const { locale } = await readUiPreferences();
  const messages = resolveLocaleMessages(locale).landing;
  const primaryCta = getPrimaryCta(userId);
  const secondaryCta = getSecondaryCta(userId);

  return (
    <main className="min-h-screen px-4 py-4 text-[var(--text-primary)] sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 lg:gap-6">
        <LandingHero
          eyebrow={messages.eyebrow}
          headline={messages.headline}
          subheadline={messages.subheadline}
          primaryCta={primaryCta}
          secondaryCta={secondaryCta}
        />
        <LandingProofStrip eyebrow={messages.proofEyebrow} items={messages.proofItems} />
        <LandingWorkflow
          eyebrow={messages.workflowEyebrow}
          title={messages.workflowTitle}
          description={messages.workflowDescription}
          advanceLabel={messages.workflowAdvance}
          stepLabel={messages.workflowStepLabel}
          steps={messages.workflowSteps}
        />
        <LandingProductShowcase
          id="product-showcase"
          eyebrow={messages.productEyebrow}
          title={messages.productTitle}
          description={messages.productDescription}
          panels={messages.showcasePanels}
        />
        <LandingBenefits
          eyebrow={messages.benefitsEyebrow}
          title={messages.benefitsTitle}
          items={messages.benefits}
        />
        <LandingFinalCta
          eyebrow={messages.finalEyebrow}
          title={messages.finalTitle}
          primaryCta={primaryCta}
          note={messages.finalNote}
        />
      </div>
    </main>
  );
}
