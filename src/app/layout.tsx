import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const poppins = localFont({
  src: [
    { path: '../fonts/poppins-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/poppins-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/poppins-latin-600-normal.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-poppins',
  display: 'swap',
});

const description =
  "Proposez vos idées de stands et d'animations pour le Marché de Noël de l'UCAO-UUC, du 16 au 18 décembre 2026.";

export const metadata: Metadata = {
  metadataBase: process.env.SITE_URL ? new URL(process.env.SITE_URL) : undefined,
  title: 'Boîte à idées · Marché de Noël UCAO-UUC',
  description,
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Boîte à idées · Marché de Noël UCAO-UUC',
    description: 'Deux minutes suffisent, et chaque idée compte.',
    images: [{ url: '/entete-noel.jpg', width: 853, height: 440, alt: "L'UCAO-UUC et le BEE présentent le Marché de Noël" }],
    locale: 'fr_FR',
    type: 'website',
  },
};

export const viewport: Viewport = { themeColor: '#FFFFFF', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={poppins.variable}>
      <body>{children}</body>
    </html>
  );
}
