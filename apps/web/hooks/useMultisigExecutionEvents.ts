import { getMultisigIndexerClient } from '@/operations';
import { NetworkInfo, Order_By } from '@aptos-labs/js-pro';
import { useClients } from '@aptos-labs/react';
import { AccountAddress, Network } from '@aptos-labs/ts-sdk';
import {
  DefaultError,
  InfiniteData,
  QueryKey,
  useInfiniteQuery,
  UseInfiniteQueryOptions
} from '@tanstack/react-query';
import { LONG_FRAMEWORK_ADDRESS } from '@/lib/constants';

const MULTISIG_EXECUTION_EVENTS_PAGE_SIZE = 15;

export interface ExecutionEvent {
  type: 'success' | 'failed' | 'rejected';
  version: string;
  /** Execution time in milliseconds since epoch, from the indexer. */
  timestamp?: number;
  payload?: string;
  approvals?: number;
  rejections?: number;
  /** The owner that executed the transaction, also its on-chain sender. */
  executor: AccountAddress;
  sequenceNumber: number;
}

/**
 * A single page of execution events. `rawCount` is the number of rows the
 * indexer returned before per-row filtering, so pagination can decide whether
 * more pages exist independently of how many rows survived.
 */
export interface MultisigExecutionEventsPage {
  events: ExecutionEvent[];
  rawCount: number;
}

/**
 * Normalizes the indexer's transaction timestamp into milliseconds since epoch.
 * The column may surface either raw microseconds (e.g. "1692491604335271") or an
 * ISO-8601 string without a timezone (e.g. "2026-08-20T00:33:24.335271", which
 * is UTC), so both are handled.
 */
function timestampToMillis(timestamp: unknown): number | undefined {
  if (timestamp === null || timestamp === undefined) return undefined;
  const value = String(timestamp);
  if (/^\d+$/.test(value)) return Number(value) / 1000;
  const normalized = /[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`;
  const millis = Date.parse(normalized);
  return Number.isNaN(millis) ? undefined : millis;
}

interface UseMultisigExecutionEventsParameters
  extends Omit<
    UseInfiniteQueryOptions<
      MultisigExecutionEventsPage,
      DefaultError,
      InfiniteData<MultisigExecutionEventsPage>,
      QueryKey,
      number
    >,
    | 'queryFn'
    | 'queryKey'
    | 'initialPageParam'
    | 'getNextPageParam'
    | 'getPreviousPageParam'
  > {
  address: string;
  network?: NetworkInfo;
  page?: number;
}

export default function useMultisigExecutionEvents({
  address,
  network,
  ...options
}: UseMultisigExecutionEventsParameters) {
  const { aptos } = useClients({ network });

  const enabled = Boolean(
    network?.network !== Network.DEVNET && (options.enabled ?? true)
  );

  return useInfiniteQuery({
    ...options,
    enabled,
    queryKey: ['multisig-execution-events', address, network],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const resolvedNetwork = network?.network ?? aptos.config.network;

      const multisigIndexerClient = getMultisigIndexerClient(resolvedNetwork);

      if (!multisigIndexerClient) {
        console.error(
          `Multisig indexer client is unavailable for this network: ${network}.`
        );
        return { events: [], rawCount: 0 };
      }

      const { multisig_transactions: multisigTransactions } =
        await multisigIndexerClient.getMultisigTransactions({
          multisigAccount: address,
          where: {},
          orderBy: [{ version: Order_By.Desc }],
          limit: MULTISIG_EXECUTION_EVENTS_PAGE_SIZE,
          offset: pageParam
        });

      // Everything the UI renders (payload, timestamp, executor/sender, status)
      // is already on the indexer row, so build the events directly instead of
      // re-fetching each transaction from the fullnode — which is heavier and
      // fails once old versions get pruned (HTTP 410).
      const events = multisigTransactions.reduce((acc, multisigTransaction) => {
        let status: 'success' | 'failed' | 'rejected';
        switch (multisigTransaction.event_type) {
          case `${LONG_FRAMEWORK_ADDRESS}::multisig_account::TransactionExecutionSucceeded`:
          case `${LONG_FRAMEWORK_ADDRESS}::multisig_account::TransactionExecutionSucceededEvent`:
            status = 'success';
            break;
          case `${LONG_FRAMEWORK_ADDRESS}::multisig_account::TransactionExecutionFailed`:
          case `${LONG_FRAMEWORK_ADDRESS}::multisig_account::TransactionExecutionFailedEvent`:
            status = 'failed';
            break;
          case `${LONG_FRAMEWORK_ADDRESS}::multisig_account::ExecuteRejectedTransaction`:
          case `${LONG_FRAMEWORK_ADDRESS}::multisig_account::ExecuteRejectedTransactionEvent`:
            status = 'rejected';
            break;
          default:
            console.error(
              `Unknown event type: ${multisigTransaction.event_type}`
            );
            return acc;
        }

        acc.push({
          type: status,
          version: multisigTransaction.version,
          timestamp: timestampToMillis(multisigTransaction.timestamp),
          payload: multisigTransaction.transaction_payload as
            | string
            | undefined,
          approvals: multisigTransaction.num_approvals
            ? Number(multisigTransaction.num_approvals)
            : undefined,
          rejections: multisigTransaction.num_rejections
            ? Number(multisigTransaction.num_rejections)
            : undefined,
          executor: AccountAddress.from(multisigTransaction.executor!),
          sequenceNumber: Number(multisigTransaction.sequence_number)
        });

        return acc;
      }, [] as ExecutionEvent[]);

      return { events, rawCount: multisigTransactions.length };
    },
    getPreviousPageParam: (_, __, ___, allPageParams) => allPageParams.at(-1),
    // Decide whether more pages exist from the raw indexer row count, not the
    // filtered `events` length. Rows can drop (unknown event types), and using
    // the filtered length here would halt pagination early and hide history.
    getNextPageParam: (lastPage, _, lastPageParam) =>
      lastPage.rawCount < MULTISIG_EXECUTION_EVENTS_PAGE_SIZE
        ? undefined
        : lastPageParam + MULTISIG_EXECUTION_EVENTS_PAGE_SIZE
  });
}
