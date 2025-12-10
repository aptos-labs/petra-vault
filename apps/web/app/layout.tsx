import type { Metadata } from 'next';
import { Work_Sans } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import AppProviders from '@/context/AppProviders';
import { ThemeProvider } from '@/context/ThemeProvider';
import { ReactScan } from '@/components/ReactScan';
import Analytics from '@/components/background/Analytics';
import TimeService from '@/components/background/TimeService';

const workSans = Work_Sans({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-work-sans'
});

export const metadata: Metadata = {
  title: 'Petra Vault by Aptos',
  description:
    'Secure, non-custodial multisig wallet solution on the Aptos Network. Create shared wallets, manage crypto assets with multiple signatures.',
  openGraph: {
    title: 'Petra Vault',
    description:
      'Secure, non-custodial multisig wallet solution on the Aptos Network. Create shared wallets, manage crypto assets with multiple signatures.',
    url: 'https://vault.petra.app',
    type: 'website',
    siteName: 'Petra Vault'
  },
  alternates: { canonical: 'https://vault.petra.app' },
  keywords: [
    'Petra Vault',
    'Aptos',
    'multisig wallet',
    'multi-signature',
    'non-custodial',
    'crypto wallet',
    'Aptos Network'
  ],
  creator: 'Aptos Labs',
  publisher: 'Aptos Labs',
  authors: [{ name: 'Aptos Labs', url: 'https://aptoslabs.com' }],
  twitter: {
    card: 'summary_large_image',
    title: 'Petra Vault',
    description:
      'Secure, non-custodial multisig wallet solution on the Aptos Network. Create shared wallets, manage crypto assets with multiple signatures.',
    site: '@PetraWallet',
    creator: '@PetraWallet'
  },
  metadataBase: new URL('https://vault.petra.app')
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {process.env.NEXT_PUBLIC_ENABLE_REACT_SCAN === '1' && <ReactScan />}
      <AppProviders>
        <body className={`${workSans.variable}`}>
          <ThemeProvider>
            {children}
            <Toaster richColors closeButton />
          </ThemeProvider>
        </body>
        <Analytics />
        <TimeService />
      </AppProviders>
    </html>
  );
}
