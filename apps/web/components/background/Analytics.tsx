'use client';

import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { AccountAddress } from '@aptos-labs/ts-sdk';
import { useEffect } from 'react';
import { GoogleAnalytics } from '@next/third-parties/google';
import { useParams } from 'next/navigation';
import { parseVaultId } from '@/lib/vaults';

export default function Analytics() {
  const { connected, account, network } = useWallet();

  const { vaultId } = useParams();

  const parsedVaultId =
    typeof vaultId === 'string'
      ? parseVaultId(decodeURIComponent(vaultId))
      : null;

  useEffect(() => {
    if (
      process.env.NEXT_PUBLIC_GA4_ID &&
      connected &&
      account &&
      account.address instanceof AccountAddress
    ) {
      const accountAddress = AccountAddress.from(account.address);
      window.gtag('set', 'user_id', accountAddress.toStringWithoutPrefix());
      window.gtag('set', 'user_properties', {
        ...(parsedVaultId && {
          vault_address: parsedVaultId.address.toStringWithoutPrefix(),
          vault_network: parsedVaultId.network
        }),
        account_address: accountAddress.toStringWithoutPrefix(),
        account_network: network?.name
      });
    }
  }, [parsedVaultId, account, connected, network]);

  if (!process.env.NEXT_PUBLIC_GA4_ID) {
    console.warn(
      'No Google Analytics GA4 ID found. Please set up the NEXT_PUBLIC_GA4_ID environment variable.'
    );
    return null;
  }

  return <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA4_ID} />;
}
