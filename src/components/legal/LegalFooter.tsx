'use client';

import Link from 'next/link';
import { useUiPreferences } from '@/components/providers/UiPreferencesProvider';

export function LegalFooter() {
  const { locale } = useUiPreferences();
  const en = locale === 'en';
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-(--border-subtle) bg-(--surface-overlay) px-5 py-5 text-xs text-(--text-tertiary)">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p>© {year} Anclora Group — {en ? 'All rights reserved.' : 'Todos los derechos reservados.'}</p>
          <p>{en ? 'Anclora Talent is part of the Anclora Group technology ecosystem.' : 'Anclora Talent forma parte del ecosistema tecnológico de Anclora Group.'}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/terms" className="hover:text-(--text-primary)">{en ? 'Terms of service' : 'Términos del servicio'}</Link>
          <Link href="/privacy" className="hover:text-(--text-primary)">{en ? 'Privacy policy' : 'Política de privacidad'}</Link>
          <Link href="/legal" className="hover:text-(--text-primary)">{en ? 'Legal notice' : 'Aviso legal'}</Link>
          <a href="mailto:hola@anclora.com" className="hover:text-(--text-primary)">hola@anclora.com</a>
          <button type="button" onClick={() => window.dispatchEvent(new Event('anclora:open-cookie-preferences'))} className="hover:text-(--text-primary)">Cookies</button>
        </div>
      </div>
    </footer>
  );
}
