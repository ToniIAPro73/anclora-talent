import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { UiPreferencesProvider } from '@/components/providers/UiPreferencesProvider';
import { readUiPreferences } from '@/lib/ui-preferences/preferences.server';
import { TALENT_BRAND } from '@/lib/talent-brand';
import './globals.css';

// Use system fonts instead of Google Fonts to avoid network fetch issues during build
// Google Fonts will load at runtime via CSS if available
const dmSans = { variable: '--font-dm-sans' };
const jetbrainsMono = { variable: '--font-jetbrains-mono' };

export const metadata: Metadata = {
  title: `${TALENT_BRAND.name} | Crea y publica proyectos editoriales con claridad`,
  description: TALENT_BRAND.description,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const preferences = await readUiPreferences();

  return (
    <ClerkProvider>
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
          <UiPreferencesProvider initialPreferences={preferences}>{children}</UiPreferencesProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
