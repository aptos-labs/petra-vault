'use client';

import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PropsWithChildren, useEffect } from 'react';

export default function AuthenticationGuard({ children }: PropsWithChildren) {
  const { connected, account, isLoading } = useWallet();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isLoading && (!connected || !account)) {
      const query = searchParams.toString();
      const currentPathWithQuery = `${pathname}${query ? `?${query}` : ''}`;
      router.push(`/?redirect=${encodeURIComponent(currentPathWithQuery)}`);
    }
  }, [connected, isLoading, router, account, pathname, searchParams]);

  return <>{children}</>;
}
