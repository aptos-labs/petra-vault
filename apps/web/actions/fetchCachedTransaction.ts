'use server';

import { unstable_cache } from 'next/cache';
import { createAptosServerClient } from '@/lib/aptos';
import { Network, TransactionResponse } from '@aptos-labs/ts-sdk';

export const fetchCachedTransaction = unstable_cache(
  async (version: number, network: Network): Promise<TransactionResponse> => {
    const aptos = createAptosServerClient(network);
    return aptos.getTransactionByVersion({ ledgerVersion: version });
  },
  ['aptos-transaction'],
  { revalidate: false }
);
