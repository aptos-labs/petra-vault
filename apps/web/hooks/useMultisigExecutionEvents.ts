import { NetworkInfo } from '@aptos-labs/js-pro';
import { useClients } from '@aptos-labs/react';
import {
  AccountAddress,
  Network,
  TransactionResponseType,
  UserTransactionResponse
} from '@aptos-labs/ts-sdk';
import {
  DefaultError,
  InfiniteData,
  QueryKey,
  useInfiniteQuery,
  UseInfiniteQueryOptions
} from '@tanstack/react-query';

export interface ExecutionEvent {
  type: 'success' | 'failed' | 'rejected';
  version: string;
  payload?: string;
  approvals?: number;
  rejections?: number;
  executor: AccountAddress;
  sequenceNumber: number;
  transaction: UserTransactionResponse;
}

interface UseMultisigExecutionEventsParameters
  extends Omit<
    UseInfiniteQueryOptions<
      ExecutionEvent[],
      DefaultError,
      InfiniteData<ExecutionEvent[]>,
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
  const { aptos, client } = useClients({ network });

  const enabled = Boolean(
    network?.network !== Network.DEVNET && (options.enabled ?? true)
  );

  return useInfiniteQuery({
    ...options,
    enabled,
    queryKey: ['multisig-execution-events', address, network],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const events = await aptos.getEvents({
        options: {
          orderBy: [{ transaction_version: 'desc' }],
          offset: pageParam,
          limit: 100,
          where: {
            _or: [
              {
                indexed_type: {
                  _in: [
                    '0x1::multisig_account::TransactionExecutionSucceeded',
                    '0x1::multisig_account::TransactionExecutionFailed',
                    '0x1::multisig_account::ExecuteRejectedTransaction'
                  ]
                },
                data: { _contains: { multisig_account: address } }
              },
              {
                indexed_type: {
                  _in: [
                    '0x1::multisig_account::TransactionExecutionSucceededEvent',
                    '0x1::multisig_account::TransactionExecutionFailedEvent',
                    '0x1::multisig_account::ExecuteRejectedTransactionEvent'
                  ]
                },
                account_address: { _eq: address }
              }
            ]
          }
        }
      });

      const transactions = await Promise.all(
        events.map((event) =>
          client.fetchTransaction({
            ledgerVersion: event.transaction_version,
            network
          })
        )
      );

      return events.reduce((acc, event) => {
        const transaction = transactions.find(
          (t) =>
            t.type === TransactionResponseType.User &&
            t.version === event.transaction_version.toString()
        );

        if (!transaction || transaction.type !== TransactionResponseType.User) {
          return acc;
        }

        // Normalize the sender address to fix zero prefixed addresses
        transaction.sender = AccountAddress.from(transaction.sender).toString();

        if (
          event.indexed_type ===
            '0x1::multisig_account::TransactionExecutionSucceeded' ||
          event.indexed_type ===
            '0x1::multisig_account::TransactionExecutionSucceededEvent'
        ) {
          acc.push({
            type: 'success',
            version: event.transaction_version,
            payload: event.data.transaction_payload,
            approvals: Number(event.data.num_approvals),
            executor: AccountAddress.from(event.data.executor),
            sequenceNumber: Number(event.data.sequence_number),
            transaction
          });
        }

        if (
          event.indexed_type ===
            '0x1::multisig_account::TransactionExecutionFailed' ||
          event.indexed_type ===
            '0x1::multisig_account::TransactionExecutionFailedEvent'
        ) {
          acc.push({
            type: 'failed',
            version: event.transaction_version,
            payload: event.data.transaction_payload,
            approvals: Number(event.data.num_approvals),
            executor: AccountAddress.from(event.data.executor),
            sequenceNumber: Number(event.data.sequence_number),
            transaction
          });
        }

        if (
          event.indexed_type ===
            '0x1::multisig_account::ExecuteRejectedTransaction' ||
          event.indexed_type ===
            '0x1::multisig_account::ExecuteRejectedTransactionEvent'
        ) {
          acc.push({
            type: 'rejected',
            version: event.transaction_version,
            payload: event.data.transaction_payload,
            rejections: Number(event.data.num_rejections),
            executor: AccountAddress.from(event.data.executor),
            sequenceNumber: Number(event.data.sequence_number),
            transaction
          });
        }

        return acc;
      }, [] as ExecutionEvent[]);
    },
    getPreviousPageParam: (_, __, ___, allPageParams) => allPageParams.at(-1),
    getNextPageParam: (lastPage, _, lastPageParam) =>
      lastPage.length === 0 || lastPage.length !== 100
        ? undefined
        : lastPageParam + lastPage.length
  });
}
