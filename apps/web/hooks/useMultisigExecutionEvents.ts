import { getMultisigIndexerClient } from '@/operations';
import { NetworkInfo, Order_By } from '@aptos-labs/js-pro';
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
import { LONG_FRAMEWORK_ADDRESS } from '@/lib/constants';

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
      const multisigIndexerClient = getMultisigIndexerClient(
        network?.network ?? aptos.config.network
      );

      if (!multisigIndexerClient) {
        console.error(
          `Multisig indexer client is unavailable for this network: ${network}.`
        );
        return [];
      }

      const { multisig_transactions: multisigTransactions } =
        await multisigIndexerClient.getMultisigTransactions({
          multisigAccount: address,
          where: {},
          orderBy: [{ version: Order_By.Desc }],
          offset: pageParam
        });

      const userTransactions = await Promise.all(
        multisigTransactions.map((e) =>
          client.fetchTransaction({
            ledgerVersion: Number(e.version),
            network
          })
        )
      );

      return multisigTransactions.reduce((acc, multisigTransaction) => {
        const userTransaction = userTransactions.find(
          (t) =>
            t.type === TransactionResponseType.User &&
            t.version === multisigTransaction.version
        );

        if (
          !userTransaction ||
          userTransaction.type !== TransactionResponseType.User
        ) {
          return acc;
        }

        // Normalize the sender address to fix zero prefixed addresses
        userTransaction.sender = AccountAddress.from(
          userTransaction.sender
        ).toString();

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
          sequenceNumber: Number(multisigTransaction.sequence_number),
          transaction: userTransaction
        });

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
