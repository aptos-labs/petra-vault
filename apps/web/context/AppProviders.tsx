'use client';

import { AptosWalletAdapterProvider } from '@aptos-labs/wallet-adapter-react';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import AptosCoreProvider from './AptosCoreProvider';
import { storageOptionsSerializers } from '@/lib/storage';
import { hasWindow } from '@/lib/utils';
import { createQueryClient } from '@/lib/queryClient';

const queryClient = createQueryClient();

export const ALLOWED_PERSISTED_QUERY_KEYS: string[] = [
  'view-module',
  'multisig-discovered-accounts',
  'multisig-execution-events'
];

const localStoragePersister = createSyncStoragePersister({
  storage: hasWindow() ? window.localStorage : null,
  serialize: (client) => {
    const sanitizedClient = client;
    sanitizedClient.clientState.queries =
      sanitizedClient.clientState.queries.filter((query) =>
        ALLOWED_PERSISTED_QUERY_KEYS.some((e) => query.queryHash.includes(e))
      );
    return JSON.stringify(sanitizedClient, storageOptionsSerializers.replacer);
  },
  deserialize: (e) => JSON.parse(e, storageOptionsSerializers.reviver)
});

export default function AppProviders({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <AptosWalletAdapterProvider autoConnect onError={console.error}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: localStoragePersister }}
      >
        <AptosCoreProvider>{children}</AptosCoreProvider>
      </PersistQueryClientProvider>
    </AptosWalletAdapterProvider>
  );
}
