import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Public_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { FiscaliqProvider } from '@/components/providers/fiscaliq-provider';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const publicSans = Public_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

const appUrl = process.env.APP_URL || 'https://fiscaliq.fr';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'FISCALIQ — Vos impôts, enfin compréhensibles',
    template: '%s | FISCALIQ France',
  },
  description:
    'Vos impôts, enfin compréhensibles. Comprenez votre situation fiscale, estimez votre impôt sur le revenu, découvrez les économies possibles et gérez vos démarches en toute simplicité.',
  keywords: [
    'impôt sur le revenu 2026',
    'simulateur impôt particuliers France',
    'salaire brut en net après impôt',
    'prélèvement à la source',
    'quotient familial parts fiscales',
    'crédit impôt garde enfant emploi domicile',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'FISCALIQ — Vos impôts, enfin compréhensibles',
    description:
      'Comprenez votre situation fiscale, découvrez les économies possibles et prenez les bonnes décisions. Pour les salariés, couples, familles, étudiants, retraités et indépendants.',
    url: appUrl,
    siteName: 'FISCALIQ',
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FISCALIQ — Vos impôts, enfin compréhensibles',
    description:
      'Estimez votre impôt sur le revenu, simulez votre salaire net après prélèvement à la source et découvrez vos droits aux crédits et réductions d’impôt.',
  },
};

const jsonLdSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'FISCALIQ',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  inLanguage: 'fr-FR',
  description:
    'Plateforme française d’intelligence fiscale pour les particuliers et les foyers : simulateur d’impôt sur le revenu, salaire brut/net après prélèvement à la source, découverte des réductions et crédits d’impôt légaux et calendrier fiscal.',
  offers: {
    '@type': 'AggregateOffer',
    lowPrice: '0',
    highPrice: '9',
    priceCurrency: 'EUR',
    offerCount: '3',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={`${plusJakarta.variable} ${publicSans.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-screen bg-[#F8FAFC] text-[#101827] font-sans antialiased selection:bg-[#10B981]/20 selection:text-[#101827]"
      >
        <FiscaliqProvider>{children}</FiscaliqProvider>
      </body>
    </html>
  );
}
