'use client';

import Link from 'next/link';
import { useUiPreferences } from '@/components/providers/UiPreferencesProvider';

export function LegalFooter() {
  const { locale } = useUiPreferences();
  const en = locale === 'en';
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-[var(--border-subtle)] bg-[var(--surface-overlay)] px-5 py-5 text-xs text-[var(--text-tertiary)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p>© {year} Anclora Group — {en ? 'All rights reserved.' : 'Todos los derechos reservados.'}</p>
          <p>{en ? 'Anclora Talent is a commercial brand operated under exclusive license by Anclora Group.' : 'Anclora Talent es una marca comercial operada bajo licencia exclusiva por Anclora Group.'}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/terms" className="hover:text-[var(--text-primary)]">{en ? 'Terms of service' : 'Términos del servicio'}</Link>
          <Link href="/privacy" className="hover:text-[var(--text-primary)]">{en ? 'Privacy policy' : 'Política de privacidad'}</Link>
          <Link href="/legal" className="hover:text-[var(--text-primary)]">{en ? 'Legal notice' : 'Aviso legal'}</Link>
          <a href="mailto:hola@anclora.com" className="hover:text-[var(--text-primary)]">hola@anclora.com</a>
          <button type="button" onClick={() => window.dispatchEvent(new Event('anclora:open-cookie-preferences'))} className="hover:text-[var(--text-primary)]">Cookies</button>
        </div>
      </div>
    </footer>
  );
}
