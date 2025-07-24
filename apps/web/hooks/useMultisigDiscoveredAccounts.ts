import { LONG_FRAMEWORK_ADDRESS } from '@/lib/constants';
import { normalizeAddress } from '@/lib/address';
import { isWriteSetChangeWriteResource } from '@/lib/transactions';
import { getMultisigIndexerClient } from '@/operations';
import {
  GetMultisigOwnerActivitiesQuery,
  Order_By
} from '@/operations/generated/sdk';
import {
  AccountTransaction,
  FetchAccountTransactionsResult,
  NetworkInfo
} from '@aptos-labs/js-pro';
import { useAptosCore } from '@aptos-labs/react';
import {
  AccountAddress,
  Network,
  TransactionResponseType,
  UserTransactionResponse
} from '@aptos-labs/ts-sdk';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';

type MultisigCreationTransaction = AccountTransaction & {
  userTransaction: UserTransactionResponse;
};

type UseMultisigDiscoveredAccountResult = AccountAddress[];

interface UseMultisigDiscoveredAccountsParameters
  extends Omit<
    UseQueryOptions<UseMultisigDiscoveredAccountResult>,
    'queryFn' | 'queryKey'
  > {
  address?: string;
  network?: NetworkInfo;
}

export default function useMultisigDiscoveredAccounts({
  address,
  network,
  ...options
}: UseMultisigDiscoveredAccountsParameters) {
  const core = useAptosCore();

  const activeNetwork = network ?? core.network;

  const enabled = Boolean(
    address &&
      activeNetwork.network !== Network.DEVNET &&
      (options.enabled ?? true)
  );

  const query = useQuery<UseMultisigDiscoveredAccountResult>({
    staleTime: 1000 * 60 * 1,
    ...options,
    enabled,
    queryKey: ['multisig-discovered-accounts', address, activeNetwork],
    queryFn: async () => {
      const multisigIndexerClient = getMultisigIndexerClient(
        activeNetwork.network
      );

      if (!multisigIndexerClient)
        throw new Error(
          `Multisig indexer client is unavailable for this network: ${activeNetwork}.`
        );

      if (!address) throw new Error('Address is required');

      // This promise may take a long time before it's fully resolved. It will paginate through all of the owner activities and
      // `create_with_owners` transactions to get all of the multisig accounts that have been created and interacted with.
      const [activities, creationTransactions] = await Promise.all([
        (async () => {
          const data: GetMultisigOwnerActivitiesQuery['multisig_owner_activities'] =
            [];

          let activitiesResponse: GetMultisigOwnerActivitiesQuery['multisig_owner_activities'] =
            [];
          let activitiesOffset = 0;
          do {
            activitiesResponse = (
              await multisigIndexerClient.getMultisigOwnerActivities({
                orderBy: [{ version: Order_By.Desc }],
                limit: 100,
                offset: activitiesOffset,
                where: {
                  _or: [
                    { owners_added: { _contains: [address] } },
                    { owners_removed: { _contains: [address] } },
                    { owner_vote: { _eq: address } }
                  ]
                }
              })
            ).multisig_owner_activities;
            activitiesOffset += activitiesResponse.length;
            data.push(...activitiesResponse);
          } while (activitiesResponse.length === 100);

          return data;
        })(),
        (async () => {
          const creationTransactions: MultisigCreationTransaction[] = [];

          let creationTransactionsResponse: FetchAccountTransactionsResult;
          let creationTransactionsOffset = 0;
          do {
            creationTransactionsResponse =
              await core.client.fetchAccountTransactions({
                address,
                where: {
                  user_transaction: {
                    entry_function_id_str: {
                      _eq: '0x1::multisig_account::create_with_owners'
                    }
                  }
                },
                limit: 100,
                offset: creationTransactionsOffset
              });

            const { transactions } = creationTransactionsResponse;

            creationTransactionsOffset += transactions.length;

            const creationMultisigUserTransactions = await Promise.all(
              transactions.map((t) =>
                core.client.fetchTransaction({
                  ledgerVersion: Number(t.transactionVersion),
                  network: activeNetwork
                })
              )
            );

            creationTransactions.push(
              ...(transactions
                .map((t) => {
                  const userTransaction = creationMultisigUserTransactions.find(
                    (ut) =>
                      ut.type === TransactionResponseType.User &&
                      Number(ut.version) === Number(t.transactionVersion)
                  );

                  if (!userTransaction) return undefined;

                  return { ...t, userTransaction };
                })
                .filter(Boolean) as MultisigCreationTransaction[])
            );
          } while (creationTransactionsResponse.transactions.length === 100);

          return creationTransactions;
        })()
      ]);

      const discoveredAccounts: {
        [account: string]: { hasVoted: boolean };
      } = {};

      creationTransactions.forEach((transaction) => {
        const { userTransaction } = transaction;

        userTransaction.changes.forEach((change) => {
          if (
            isWriteSetChangeWriteResource(change) &&
            change.data.type === '0x1::multisig_account::MultisigAccount'
          ) {
            discoveredAccounts[normalizeAddress(change.address)] = {
              hasVoted: true
            };
          }
        });
      });

      console.log('discoveredAccounts', discoveredAccounts);

      activities.forEach((activity) => {
        if (
          activity.event_type ===
            `${LONG_FRAMEWORK_ADDRESS}::multisig_account::AddOwners` ||
          activity.event_type ===
            `${LONG_FRAMEWORK_ADDRESS}::multisig_account::AddOwnersEvent`
        ) {
          discoveredAccounts[normalizeAddress(activity.multisig_account)] = {
            hasVoted: false
          };
        }

        if (
          activity.event_type ===
            `${LONG_FRAMEWORK_ADDRESS}::multisig_account::RemoveOwners` ||
          activity.event_type ===
            `${LONG_FRAMEWORK_ADDRESS}::multisig_account::RemoveOwnersEvent`
        ) {
          delete discoveredAccounts[
            normalizeAddress(activity.multisig_account)
          ];
        }

        if (
          activity.event_type ===
            `${LONG_FRAMEWORK_ADDRESS}::multisig_account::Vote` ||
          activity.event_type ===
            `${LONG_FRAMEWORK_ADDRESS}::multisig_account::VoteEvent`
        ) {
          discoveredAccounts[normalizeAddress(activity.multisig_account)] = {
            hasVoted: true
          };
        }
      });

      return Object.keys(discoveredAccounts).map((account) =>
        AccountAddress.from(account)
      );
    }
  });

  return query;
}
