import { Metadata } from 'next';
import Login from '@/components/Login';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Login to Petra Vault',
  description:
    'Securely access your Petra Vault multisig wallet on the Aptos Network. Connect your wallet to manage shared crypto assets and proposals.',
  openGraph: {
    title: 'Login to Petra Vault',
    description:
      'Securely access your Petra Vault multisig wallet on the Aptos Network.',
    url: 'https://vault.petra.app/login'
  },
  twitter: {
    title: 'Login to Petra Vault',
    description:
      'Securely access your Petra Vault multisig wallet on the Aptos Network.'
  },
  alternates: {
    canonical: 'https://vault.petra.app/login'
  }
};

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link
            href="/"
            className="flex items-center justify-center font-medium whitespace-pre"
          >
            <img src="/petra_logo.png" alt="Petra Logo" className="w-4 mr-2" />
            <h1>Petra Vault</h1>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full">
            <Login />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <img
          src="/login_asset.jpeg"
          alt="Landscape"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}
