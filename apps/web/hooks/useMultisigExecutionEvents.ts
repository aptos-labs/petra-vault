import { fetchCachedTransaction } from '@/actions/fetchCachedTransaction';
import { ExecutionEvent, extractExecutionEvents } from '@/lib/executionEvents';
import { NetworkInfo, Order_By } from '@aptos-labs/js-pro';
import { useAptosCore } from '@aptos-labs/react';
import { Network, TransactionResponseType } from '@aptos-labs/ts-sdk';
import {
  DefaultError,
  InfiniteData,
  QueryKey,
  useInfiniteQuery,
  UseInfiniteQueryOptions
} from '@tanstack/react-query';

export type { ExecutionEvent };

/** Number of account transactions scanned per page. */
const ACCOUNT_TRANSACTIONS_PAGE_SIZE = 15;

export interface MultisigExecutionEventsPage {
  events: ExecutionEvent[];
  /**
   * Exclusive upper transaction version of the next page, or `undefined` when the
   * account's transaction history has been fully scanned. A page may contain fewer
   * events than the page size (even none) while still having a next page, because
   * unrelated account transactions (votes, proposals, ...) are skipped.
   * Events are ordered by descending version.
   */
  nextCursor?: string;
}

interface UseMultisigExecutionEventsParameters
  extends Omit<
    UseInfiniteQueryOptions<
      MultisigExecutionEventsPage,
      DefaultError,
      InfiniteData<MultisigExecutionEventsPage, string | null>,
      QueryKey,
      string | null
    >,
    | 'queryFn'
    | 'queryKey'
    | 'initialPageParam'
    | 'getNextPageParam'
    | 'getPreviousPageParam'
  > {
  address: string;
  network?: NetworkInfo;
}

/**
 * Execution history of a multisig account, built from standard Aptos APIs:
 * the indexer's account transactions list the versions that touched the account, and the
 * fullnode transaction (with its events) tells whether one of them executed a multisig
 * transaction. Request failures are thrown so they surface through the query's `error`.
 */
export default function useMultisigExecutionEvents({
  address,
  network,
  ...options
}: UseMultisigExecutionEventsParameters) {
  const core = useAptosCore();

  const activeNetwork = network ?? core.network;

  const enabled = Boolean(
    activeNetwork.network !== Network.DEVNET && (options.enabled ?? true)
  );

  return useInfiniteQuery({
    ...options,
    enabled,
    // v2: page shape changed from ExecutionEvent[] to { events, nextCursor }.
    queryKey: ['multisig-execution-history-v2', address, activeNetwork],
    staleTime: 30_000,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }): Promise<MultisigExecutionEventsPage> => {
      const { transactions } = await core.client.fetchAccountTransactions({
        network: activeNetwork,
        address,
        orderBy: [{ transaction_version: Order_By.Desc }],
        where:
          pageParam === null
            ? undefined
            : { transaction_version: { _lt: pageParam } },
        limit: ACCOUNT_TRANSACTIONS_PAGE_SIZE,
        offset: 0
      });

      const fetched = await Promise.all(
        transactions.map((t) =>
          fetchCachedTransaction(
            Number(t.transactionVersion),
            activeNetwork.network
          )
        )
      );

      const events = fetched.flatMap((transaction) =>
        transaction.type === TransactionResponseType.User
          ? extractExecutionEvents(transaction, address)
          : []
      );

      return {
        events,
        nextCursor:
          transactions.length === ACCOUNT_TRANSACTIONS_PAGE_SIZE
            ? transactions.at(-1)?.transactionVersion
            : undefined
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined
  });
}
