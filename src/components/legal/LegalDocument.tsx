'use client';

import Link from 'next/link';
import { useUiPreferences } from '@/components/providers/UiPreferencesProvider';

type Kind = 'privacy' | 'terms' | 'legal';

type Block = {
  title: string;
  paragraphs: string[];
};

type Content = {
  title: string;
  description: string;
  updated: string;
  blocks: Block[];
};

const CONTENT: Record<Kind, (en: boolean) => Content> = {
  privacy: (en) => ({
    title: en ? 'Privacy policy' : 'Política de privacidad',
    description: en
      ? 'Personal data processing in Anclora Talent, platform for talent management, candidate profiles and professional matching.'
      : 'Tratamiento de datos personales en Anclora Talent, plataforma de gestión de talento, perfiles de candidatos y matching profesional.',
    updated: en ? 'Last updated: 17 May 2026' : 'Última actualización: 17 de mayo de 2026',
    blocks: [
      {
        title: en ? 'Controller and contact' : 'Responsable y contacto',
        paragraphs: [
          en
            ? 'Controller: Anclora Group, owner and operator of Anclora Talent.'
            : 'Responsable del tratamiento: Anclora Group, entidad propietaria y operadora de Anclora Talent.',
          en ? 'Privacy contact: hola@anclora.com.' : 'Contacto para privacidad: hola@anclora.com.',
        ],
      },
      {
        title: en ? 'Data we may process' : 'Datos que podemos tratar',
        paragraphs: [
          en
            ? 'We may process account, authentication and session data; professional profile data and CVs voluntarily provided; job application and matching data; technical data required for security, operation and incident diagnosis.'
            : 'Podemos tratar datos de cuenta, autenticación y sesión; datos de perfil profesional y curriculares aportados voluntariamente; datos de candidaturas y matching; datos técnicos necesarios para seguridad, operación y diagnóstico de incidencias.',
        ],
      },
      {
        title: en ? 'Purposes' : 'Finalidades',
        paragraphs: [
          en
            ? "Create and maintain the user account; manage candidate profiles and job offers; enable professional matching between candidates and companies; manage contact requests at the user's request."
            : 'Crear y mantener la cuenta de usuario; gestionar perfiles de candidatos y ofertas de empleo; facilitar el matching profesional entre candidatos y empresas; gestionar solicitudes de contacto a petición del usuario.',
        ],
      },
      {
        title: en ? 'Legal basis' : 'Base legitimadora',
        paragraphs: [
          en
            ? 'Processing is based on execution of a contract (service provision), legitimate interests of the platform operator, and explicit consent where required.'
            : 'El tratamiento se basa en la ejecución de un contrato (prestación del servicio), el interés legítimo del operador de la plataforma y el consentimiento explícito donde sea necesario.',
        ],
      },
      {
        title: en ? 'Data retention' : 'Conservación de datos',
        paragraphs: [
          en
            ? 'Data are kept while the account is active and for the legally required periods after deletion. CVs and profile data may be retained for the periods necessary to manage active applications.'
            : 'Los datos se conservan mientras la cuenta está activa y durante los plazos legalmente exigibles tras la baja. Los datos curriculares y de perfil pueden conservarse el tiempo necesario para gestionar candidaturas activas.',
        ],
      },
      {
        title: 'Cookies',
        paragraphs: [
          en
            ? 'Necessary cookies support session, security and preferences. Optional analytics or marketing remain disabled unless accepted.'
            : 'Las cookies necesarias soportan sesión, seguridad y preferencias. Las opcionales de análisis o marketing permanecen desactivadas salvo consentimiento.',
        ],
      },
    ],
  }),
  terms: (en) => ({
    title: en ? 'Terms of service' : 'Términos del servicio',
    description: en ? 'Use conditions for Anclora Talent.' : 'Condiciones de uso de Anclora Talent.',
    updated: en ? 'Last updated: 17 May 2026' : 'Última actualización: 17 de mayo de 2026',
    blocks: [
      {
        title: en ? 'Operator' : 'Operador',
        paragraphs: [
          en
            ? 'Anclora Talent is part of the Anclora Group technology ecosystem.'
            : 'Anclora Talent forma parte del ecosistema tecnológico de Anclora Group.',
          en
            ? 'Owner and operator of the service: Anclora Group. Contact: hola@anclora.com.'
            : 'Entidad propietaria y operadora del servicio: Anclora Group. Contacto: hola@anclora.com.',
        ],
      },
      {
        title: en ? 'Service scope' : 'Objeto del servicio',
        paragraphs: [
          en
            ? 'Anclora Talent enables talent management, candidate profiles, job postings and professional matching.'
            : 'Anclora Talent permite la gestión de talento, perfiles de candidatos, publicación de ofertas y matching profesional.',
          en
            ? 'The platform does not guarantee employment, interviews, selection outcomes or contractual relationships between parties.'
            : 'La plataforma no garantiza empleo, entrevistas, resultados de selección ni relaciones contractuales entre las partes.',
        ],
      },
      {
        title: en ? 'User obligations' : 'Obligaciones del usuario',
        paragraphs: [
          en
            ? 'Users must provide truthful information and ensure they have the right to submit any files or data uploaded.'
            : 'Los usuarios deben facilitar información veraz y garantizar que tienen derecho a subir los archivos o datos aportados.',
          en
            ? 'Credentials must be kept confidential. Third-party data must not be processed without a legitimate basis.'
            : 'Las credenciales deben mantenerse confidenciales. No se deben tratar datos de terceros sin base legítima.',
        ],
      },
      {
        title: en ? 'Limitation of liability' : 'Limitación de responsabilidad',
        paragraphs: [
          en
            ? 'Anclora Group is not liable for decisions made by companies or candidates based on platform information.'
            : 'Anclora Group no responde de las decisiones adoptadas por empresas o candidatos sobre la base de la información de la plataforma.',
        ],
      },
    ],
  }),
  legal: (en) => ({
    title: en ? 'Legal notice' : 'Aviso legal',
    description: en
      ? 'General information about the site owner and basic access conditions for Anclora Talent.'
      : 'Información general del titular del sitio y condiciones básicas de acceso a Anclora Talent.',
    updated: en ? 'Last updated: 17 May 2026' : 'Última actualización: 17 de mayo de 2026',
    blocks: [
      {
        title: en ? 'Site owner' : 'Titular del sitio',
        paragraphs: [
          en ? 'Owner and operator: Anclora Group.' : 'Titular y operador: Anclora Group.',
          en
            ? 'Anclora Talent is part of the Anclora Group technology ecosystem. No granted trademark registration is asserted.'
            : 'Anclora Talent forma parte del ecosistema tecnológico de Anclora Group. No se afirma registro concedido de marca.',
          en ? 'Contact email: hola@anclora.com.' : 'Email de contacto: hola@anclora.com.',
        ],
      },
      {
        title: en ? 'Site purpose' : 'Finalidad del sitio',
        paragraphs: [
          en
            ? 'The site provides tools for talent management, publication of job offers, candidate profiles and professional matching within the Anclora Group ecosystem.'
            : 'El sitio ofrece herramientas de gestión de talento, publicación de ofertas, perfiles de candidatos y matching profesional dentro del ecosistema Anclora Group.',
        ],
      },
      {
        title: en ? 'Informative nature' : 'Naturaleza informativa',
        paragraphs: [
          en
            ? 'Matching results and candidate recommendations are indicative. The platform does not guarantee any employment outcome or contractual relationship.'
            : 'Los resultados de matching y las recomendaciones de candidatos tienen carácter orientativo. La plataforma no garantiza ningún resultado de empleo ni relación contractual.',
        ],
      },
      {
        title: en ? 'Intellectual property' : 'Propiedad intelectual',
        paragraphs: [
          en
            ? 'The visual identity, interfaces, workflows and intangible assets of the service are governed by Anclora Group, without prejudice to the rights of third parties or data submitted by users.'
            : 'La identidad visual, interfaces, flujos y activos intangibles del servicio se gobiernan bajo Anclora Group, sin perjuicio de derechos de terceros o datos aportados por usuarios.',
        ],
      },
    ],
  }),
};

export function LegalDocument({ kind }: { kind: Kind }) {
  const { locale } = useUiPreferences();
  const en = locale === 'en';
  const content = CONTENT[kind](en);
  return (
    <main className="min-h-screen bg-(--page-bg) px-5 py-12 text-(--text-primary)">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-3xl border border-(--border-subtle) bg-(--surface-elevated) p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--accent-mint)">Anclora Talent</p>
          <h1 className="mt-3 text-4xl font-semibold">{content.title}</h1>
          <p className="mt-3 text-sm leading-7 text-(--text-secondary)">{content.description}</p>
          <p className="mt-2 text-xs text-(--text-tertiary)">{content.updated}</p>
        </section>
        <section className="space-y-4 rounded-3xl border border-(--border-subtle) bg-(--surface-panel) p-6">
          {content.blocks.map((block) => (
            <article key={block.title} className="rounded-2xl border border-(--border-subtle) bg-(--surface-elevated) p-5">
              <h2 className="text-2xl font-semibold">{block.title}</h2>
              {block.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-3 text-sm leading-7 text-(--text-secondary)">
                  {paragraph}
                </p>
              ))}
            </article>
          ))}
        </section>
        <nav className="flex flex-wrap gap-3 text-sm">
          <Link href="/terms" className="rounded-full border border-(--border-subtle) px-5 py-3">
            Terms
          </Link>
          <Link href="/privacy" className="rounded-full border border-(--border-subtle) px-5 py-3">
            Privacy
          </Link>
          <Link href="/legal" className="rounded-full border border-(--border-subtle) px-5 py-3">
            Legal
          </Link>
          <Link href="/" className="rounded-full bg-(--accent-mint) px-5 py-3 font-semibold text-black">
            {en ? 'Back' : 'Volver'}
          </Link>
        </nav>
      </div>
    </main>
  );
}
