'use client';

import Link from 'next/link';
import { useUiPreferences } from '@/components/providers/UiPreferencesProvider';

type Kind = 'privacy' | 'terms' | 'legal';

export function LegalDocument({ kind }: { kind: Kind }) {
  const { locale } = useUiPreferences();
  const en = locale === 'en';
  const content = getContent(en, kind);
  return (
    <main className="min-h-screen bg-[var(--page-bg)] px-5 py-12 text-[var(--text-primary)]">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-mint)]">Anclora Talent</p>
          <h1 className="mt-3 text-4xl font-semibold">{content.title}</h1>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{content.description}</p>
          <p className="mt-2 text-xs text-[var(--text-tertiary)]">{content.updated}</p>
        </section>
        <section className="space-y-4 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-panel)] p-6">
          {content.blocks.map((block) => (
            <article key={block.title} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5">
              <h2 className="text-2xl font-semibold">{block.title}</h2>
              {block.paragraphs.map((paragraph) => <p key={paragraph} className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{paragraph}</p>)}
            </article>
          ))}
        </section>
        <nav className="flex flex-wrap gap-3 text-sm">
          <Link href="/terms" className="rounded-full border border-[var(--border-subtle)] px-5 py-3">Terms</Link>
          <Link href="/privacy" className="rounded-full border border-[var(--border-subtle)] px-5 py-3">Privacy</Link>
          <Link href="/legal" className="rounded-full border border-[var(--border-subtle)] px-5 py-3">Legal</Link>
          <Link href="/" className="rounded-full bg-[var(--accent-mint)] px-5 py-3 font-semibold text-black">{en ? 'Back' : 'Volver'}</Link>
        </nav>
      </div>
    </main>
  );
}

function getContent(en: boolean, kind: Kind) {
  const updated = en ? 'Last updated: 17 May 2026' : 'Última actualización: 17 de mayo de 2026';
  if (kind === 'privacy') return { title: en ? 'Privacy policy' : 'Política de privacidad', description: en ? 'Personal data processing in Anclora Talent.' : 'Tratamiento de datos personales en Anclora Talent.', updated, blocks: [{ title: en ? 'Controller' : 'Responsable', paragraphs: [en ? 'Controller: Anclora Group, owner and operator of Anclora Talent.' : 'Responsable: Anclora Group, entidad propietaria y operadora de Anclora Talent.', 'hola@anclora.com'] }, { title: 'Cookies', paragraphs: [en ? 'Necessary cookies support session, security and preferences. Optional analytics or marketing remain disabled unless accepted.' : 'Las cookies necesarias soportan sesión, seguridad y preferencias. Las opcionales de análisis o marketing permanecen desactivadas salvo consentimiento.'] }] };
  if (kind === 'terms') return { title: en ? 'Terms of service' : 'Términos del servicio', description: en ? 'Use conditions for Anclora Talent.' : 'Condiciones de uso de Anclora Talent.', updated, blocks: [{ title: en ? 'Operator' : 'Operador', paragraphs: [en ? 'Anclora Talent is a commercial brand operated under exclusive license by Anclora Group.' : 'Anclora Talent es una marca comercial operada bajo licencia exclusiva por Anclora Group.'] }, { title: en ? 'Service' : 'Servicio', paragraphs: [en ? 'The app supports editorial project creation and publishing workflows. User content must be reviewed before publication.' : 'La app soporta creación de proyectos editoriales y flujos de publicación. El contenido del usuario debe revisarse antes de publicarse.'] }] };
  return { title: en ? 'Legal notice' : 'Aviso legal', description: en ? 'Ownership and contact.' : 'Titularidad y contacto.', updated, blocks: [{ title: en ? 'Ownership' : 'Titularidad', paragraphs: [en ? 'Owner and operator: Anclora Group.' : 'Titular y operador: Anclora Group.', en ? 'No granted trademark registration is asserted.' : 'No se afirma registro concedido de marca.'] }, { title: en ? 'Contact' : 'Contacto', paragraphs: ['hola@anclora.com'] }] };
}
