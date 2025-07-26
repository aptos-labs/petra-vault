import { Metadata } from 'next';
import Login from '@/components/Login';
import Link from 'next/link';
import HackenBadge from '@/components/HackenBadge';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Login to Petra Vault',
  description:
    'Securely access your Petra Vault multisig wallet on the Aptos Network. Connect your wallet to manage shared crypto assets and proposals.',
  alternates: {
    canonical: 'https://vault.petra.app'
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
            <Image
              src="/petra_logo.svg"
              alt="Petra Logo"
              className="w-5 mr-2 text-black"
              width={20}
              height={20}
            />
            <span className="leading-none text-lg translate-y-0.25">
              Petra Vault
            </span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full">
            <Login />
          </div>
        </div>
        <div className="flex justify-center">
          <HackenBadge />
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <div className="absolute inset-0 bg-primary" />
        <img
          src="/login_asset.jpeg"
          alt="Landscape"
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
      </div>
    </div>
  );
}
