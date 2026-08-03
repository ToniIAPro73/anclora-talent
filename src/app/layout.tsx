import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { UiPreferencesProvider } from '@/components/providers/UiPreferencesProvider';
import { CookieConsent } from '@/components/legal/CookieConsent';
import { LegalFooter } from '@/components/legal/LegalFooter';
import { readUiPreferences } from '@/lib/ui-preferences/preferences.server';
import { TALENT_BRAND } from '@/lib/talent-brand';
import './globals.css';

// DM Sans is the contractual app typeface. Self-hosted (variable font,
// latin subset covers ES/EN) so builds never depend on Google Fonts network.
const dmSans = localFont({
  src: [
    {
      path: './fonts/dm-sans-latin.woff2',
      style: 'normal',
      weight: '100 1000',
    },
  ],
  variable: '--font-dm-sans',
  display: 'swap',
});

// JetBrains Mono is only used by editor/numeric UI; keep system mono fallback
// (no network dependency at build time).
const jetbrainsMono = { variable: '--font-jetbrains-mono' };

export const metadata: Metadata = {
  title: `${TALENT_BRAND.name} | Crea y publica proyectos editoriales con claridad`,
  description: TALENT_BRAND.description,
  icons: {
    icon: [
      { url: TALENT_BRAND.faviconPath, sizes: 'any' },
      { url: TALENT_BRAND.favicon32Path, type: 'image/png', sizes: '32x32' },
    ],
    apple: [{ url: TALENT_BRAND.appleTouchIconPath, sizes: '180x180' }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const preferences = await readUiPreferences();

  return (
    <html
      lang={preferences.locale}
      data-locale={preferences.locale}
      data-theme={preferences.theme}
      className={`${dmSans.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body
        className="tier-premium domain-human-capital archetype-app role-consumer cluster-core product-anclora-talent"
        suppressHydrationWarning
      >
        <UiPreferencesProvider initialPreferences={preferences}>
          {children}
          <LegalFooter />
          <CookieConsent />
        </UiPreferencesProvider>
      </body>
    </html>
  );
}
