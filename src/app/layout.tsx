import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Geist, Geist_Mono } from 'next/font/google';
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`}>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
