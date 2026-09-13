import { LandingFaq } from '@/components/marketing/landing-faq';
import { LandingFinalCta } from '@/components/marketing/landing-final-cta';
import { LandingHeader } from '@/components/marketing/landing-header';
import { LandingHero } from '@/components/marketing/landing-hero';
import { LandingPricing } from '@/components/marketing/landing-pricing';
import { LandingProductStory, type ProductMoment } from '@/components/marketing/landing-product-story';
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

  const exploreProductLabel =
    messages.heroSecondaryCta || (locale === 'en' ? 'Explore workflow' : 'Ver producto');

  const productMoments: ProductMoment[] = [
    {
      id: 'editor',
      badge: locale === 'en' ? '01 · Writing & Typography' : '01 · Escritura & Tipografía',
      title:
        locale === 'en'
          ? 'Live typographic composition workshop'
          : 'Taller de edición con tipografía viva',
      description:
        locale === 'en'
          ? 'Write or import your manuscript with smart chapter detection. Control typefaces, hierarchies, and proportional margins in real time.'
          : 'Escribe o importa tu manuscrito con detección inteligente de capítulos. Controla familias tipográficas, jerarquías y márgenes nobles en tiempo real.',
      pills:
        locale === 'en'
          ? ['Dynamic chapters', 'H1-H6 hierarchy', 'Proportional margins', 'Native ProseMirror']
          : ['Capítulos dinámicos', 'Jerarquía H1-H6', 'Márgenes nobles', 'ProseMirror nativo'],
      imageDark: '/landing/features/editor-preview-dark.png',
      imageLight: '/landing/features/editor-preview-light.png',
      altDark: 'Editor de capítulos en Anclora Talent mostrando Capítulo I de Atlas de la Memoria (tema oscuro)',
      altLight: 'Editor de capítulos en Anclora Talent mostrando Capítulo I de Atlas de la Memoria (tema claro)',
    },
    {
      id: 'spread',
      badge: locale === 'en' ? '02 · Real Double Spread' : '02 · Doble Pliego Real',
      title:
        locale === 'en'
          ? 'Physical spread inspection before print'
          : 'Inspección de pliego físico antes de imprenta',
      description:
        locale === 'en'
          ? 'Experience the physical book reading pace with facing pages. Automatic folios, balanced white space, and visual layout without surprises.'
          : 'Experimenta el ritmo de lectura del libro físico con vista enfrentada de páginas. Foliado automático, proporción de blancos y ajuste visual sin sorpresas.',
      pills:
        locale === 'en'
          ? ['Facing double spread', 'Automatic folios', 'Millimeter precision', 'Print accurate']
          : ['Doble pliego enfrentado', 'Foliado automático', 'Ajuste milimétrico', 'Fiel a imprenta'],
      imageDark: '/landing/features/preview-spread-dark.png',
      imageLight: '/landing/features/preview-spread-light.png',
      altDark: 'Visor de doble pliego abierto de Atlas de la Memoria (tema oscuro)',
      altLight: 'Visor de doble pliego abierto de Atlas de la Memoria (tema claro)',
    },
    {
      id: 'cover',
      badge: locale === 'en' ? '03 · Cover Studio' : '03 · Estudio de Cubierta',
      title:
        locale === 'en'
          ? 'Integral front and back cover design'
          : 'Diseño integral de portada y contraportada',
      description:
        locale === 'en'
          ? 'Millimeter canvas to compose front and back covers. Integrate high-res art, adjust typography, and prepare the final file for distribution.'
          : 'Lienzo milimétrico para componer la portada y contraportada de tu libro. Integra arte en alta resolución, ajusta la tipografía y prepara el archivo final para distribución.',
      pills:
        locale === 'en'
          ? ['Front & back canvas', 'Editorial typography', 'High resolution', 'PDF & EPUB export']
          : ['Lienzo frontal y dorso', 'Tipografía editorial', 'Alta resolución', 'Exportación PDF y EPUB'],
      imageDark: '/landing/features/cover-studio-dark.png',
      imageLight: '/landing/features/cover-studio-light.png',
      altDark: 'Estudio de portada de Atlas de la Memoria en Anclora Talent (tema oscuro)',
      altLight: 'Estudio de portada de Atlas de la Memoria en Anclora Talent (tema claro)',
      backImageDark: '/landing/features/cover-studio-back-dark.png',
      backImageLight: '/landing/features/cover-studio-back-light.png',
      backAltDark: 'Estudio de contraportada de Atlas de la Memoria en Anclora Talent (tema oscuro)',
      backAltLight: 'Estudio de contraportada de Atlas de la Memoria en Anclora Talent (tema claro)',
      hasBackCoverToggle: true,
    },
  ];

  // 4 clear bullets for pricing
  const pricingFeatures =
    locale === 'en'
      ? [
          'Unlimited editorial projects',
          'Clean export to PDF, EPUB, DOCX & HTML',
          'Front & back cover design studio',
          '100% your rights, no watermark or lock-in',
        ]
      : [
          'Proyectos editoriales ilimitados',
          'Exportación limpia a PDF, EPUB, DOCX y HTML',
          'Estudio de diseño de portada y contraportada',
          '100% tus derechos de autor, sin marcas ni bloqueos',
        ];

  // 3 high-impact questions for FAQ
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
          {/* 1. Hero Section */}
          <LandingHero
            eyebrow={messages.eyebrow}
            headline={messages.headline}
            subheadline={messages.subheadline}
            primaryCta={primaryCta}
            secondaryCta={secondaryCta}
            exploreProductLabel={exploreProductLabel}
            trustText={messages.heroTrust}
          />

          {/* 2. Unified Real Product Story (Editor, Spread, Cover Studio) */}
          <LandingProductStory
            id="producto"
            eyebrow={locale === 'en' ? 'Editorial Workflow' : 'Flujo Editorial Unificado'}
            title={
              locale === 'en'
                ? 'From manuscript to finished book in one place'
                : 'De manuscrito a libro terminado en un solo lugar'
            }
            description={
              locale === 'en'
                ? 'No fragmented tools: live typography writing, physical double spread inspection, and precision cover design.'
                : 'Sin herramientas dispersas: redacción con tipografía viva, lectura en doble pliego y diseño milimétrico de cubierta.'
            }
            moments={productMoments}
            frontLabel={locale === 'en' ? 'Front Cover' : 'Portada'}
            backLabel={locale === 'en' ? 'Back Cover' : 'Contraportada'}
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
            features={pricingFeatures}
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
