'use client';

import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { PropsWithChildren, useEffect } from 'react';

export default function AuthenticationGuard({ children }: PropsWithChildren) {
  const { connected, account, isLoading } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!connected || !account)) {
      router.push('/');
    }
  }, [connected, isLoading, router, account]);

  return <>{children}</>;
}
