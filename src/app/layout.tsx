import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Geist, Geist_Mono } from 'next/font/google';
import { UiPreferencesProvider } from '@/components/providers/UiPreferencesProvider';
import { readUiPreferences } from '@/lib/ui-preferences/preferences.server';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Anclora Talent | Crea y publica proyectos editoriales con claridad',
  description:
    'Anclora Talent te permite crear tu cuenta, lanzar proyectos editoriales y trabajar sobre documento, preview y portada desde un mismo flujo.',
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
        className={`${geistSans.variable} ${geistMono.variable}`}
        suppressHydrationWarning
      >
        <body>
          <UiPreferencesProvider initialPreferences={preferences}>{children}</UiPreferencesProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
