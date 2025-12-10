import { PropsWithChildren } from 'react';
import { AptosJSCoreProvider, useWalletAdapterCore } from '@aptos-labs/react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Network } from '@aptos-labs/ts-sdk';
import { getServerTime } from '@/lib/serverTime';

export default function AptosCoreProvider({ children }: PropsWithChildren) {
  const wallet = useWallet();

  const core = useWalletAdapterCore({
    wallet,
    config: {
      serverTime: getServerTime,
      apiKey: {
        ...(process.env.NEXT_PUBLIC_APTOS_MAINNET_API_KEY && {
          [Network.MAINNET]: process.env.NEXT_PUBLIC_APTOS_MAINNET_API_KEY
        }),
        ...(process.env.NEXT_PUBLIC_APTOS_TESTNET_API_KEY && {
          [Network.TESTNET]: process.env.NEXT_PUBLIC_APTOS_TESTNET_API_KEY
        }),
        ...(process.env.NEXT_PUBLIC_APTOS_DEVNET_API_KEY && {
          [Network.DEVNET]: process.env.NEXT_PUBLIC_APTOS_DEVNET_API_KEY
        })
      }
    }
  });

  return <AptosJSCoreProvider core={core}>{children}</AptosJSCoreProvider>;
}
