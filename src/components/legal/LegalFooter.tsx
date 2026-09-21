'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUiPreferences } from '@/components/providers/UiPreferencesProvider';

const FOOTERLESS_PATHS = ['/sign-in', '/sign-up'];
const APP_SHELL_PATHS = ['/dashboard', '/projects', '/invite'];

type LegalFooterProps = {
  mode?: 'global' | 'application';
};

export function LegalFooter({ mode = 'global' }: LegalFooterProps) {
  const { locale } = useUiPreferences();
  const pathname = usePathname();

  // The root layout owns the public footer. Protected routes render this same
  // component from AppShell so it stays in document flow after the workspace.
  const hiddenFromGlobalLayout = [...FOOTERLESS_PATHS, ...APP_SHELL_PATHS].some((path) =>
    pathname.startsWith(path),
  );
  if (mode === 'global' && hiddenFromGlobalLayout) {
    return null;
  }
  const en = locale === 'en';
  const year = new Date().getFullYear();
  return (
    <footer
      data-testid="legal-footer"
      className="talent-legal-footer border-t border-[var(--border-subtle)] bg-[var(--background)] px-5 py-6 text-xs text-[var(--text-tertiary)] transition-colors"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p>© {year} Anclora Group — {en ? 'All rights reserved.' : 'Todos los derechos reservados.'}</p>
          <p>{en ? 'Anclora Talent is part of the Anclora Group technology ecosystem.' : 'Anclora Talent forma parte del ecosistema tecnológico de Anclora Group.'}</p>
        </div>
        <nav aria-label={en ? 'Legal links' : 'Enlaces legales'}>
          <ul className="m-0 flex list-none flex-wrap gap-3 p-0">
            <li><Link href="/terms" className="hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">{en ? 'Terms of service' : 'Términos del servicio'}</Link></li>
            <li><Link href="/privacy" className="hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">{en ? 'Privacy policy' : 'Política de privacidad'}</Link></li>
            <li><Link href="/legal" className="hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">{en ? 'Legal notice' : 'Aviso legal'}</Link></li>
            <li><a href="mailto:hola@anclora.com" className="hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">hola@anclora.com</a></li>
            <li><button type="button" onClick={() => window.dispatchEvent(new Event('anclora:open-cookie-preferences'))} className="hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">Cookies</button></li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
