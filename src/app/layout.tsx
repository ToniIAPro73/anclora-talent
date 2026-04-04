import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { DM_Sans, JetBrains_Mono } from 'next/font/google';
import { UiPreferencesProvider } from '@/components/providers/UiPreferencesProvider';
import { readUiPreferences } from '@/lib/ui-preferences/preferences.server';
import { TALENT_BRAND } from '@/lib/talent-brand';
import './globals.css';

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  weight: ['400'],
});

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
        <body>
          <UiPreferencesProvider initialPreferences={preferences}>{children}</UiPreferencesProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
