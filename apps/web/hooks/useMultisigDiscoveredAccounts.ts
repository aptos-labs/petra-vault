import {
  FetchAccountTransactionsResult,
  NetworkInfo
} from '@aptos-labs/js-pro';
import { useAptosCore } from '@aptos-labs/react';
import { AccountAddress, GetEventsResponse, Network } from '@aptos-labs/ts-sdk';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';

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
      if (!address) throw new Error('Address is required');

      const { aptos } = core.client.getClients({ network });

      // This promise may take a long time before it's fully resolved. It will paginate through all of the events and
      // `create_with_owners` transactions to get all of the multisig accounts that have been created and interacted with.
      const [events, { creationTransactions, creationMultisigRegisterEvents }] =
        await Promise.all([
          (async () => {
            const data: GetEventsResponse = [];

            let eventsResponse: GetEventsResponse = [];
            let eventsOffset = 0;
            do {
              eventsResponse = await aptos.getEvents({
                options: {
                  orderBy: [{ transaction_version: 'asc' }],
                  offset: eventsOffset,
                  limit: 100,
                  where: {
                    indexed_type: {
                      _in: [
                        '0x1::multisig_account::AddOwners',
                        '0x1::multisig_account::RemoveOwners',
                        '0x1::multisig_account::Vote'
                      ]
                    },
                    _or: [
                      { data: { _contains: { owners_added: [address] } } },
                      { data: { _contains: { owners_removed: [address] } } },
                      { data: { _contains: { owner: address } } }
                    ]
                  }
                }
              });
              eventsOffset += eventsResponse.length;
              data.push(...eventsResponse);
            } while (eventsResponse.length === 100);

            return data;
          })(),
          (async () => {
            const creationTransactions = [];
            const creationMultisigRegisterEvents = [];

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
              creationTransactions.push(...transactions);

              const creationMultisigRegisterEventsResponse =
                await aptos.getEvents({
                  options: {
                    orderBy: [{ transaction_version: 'desc' }],
                    where: {
                      indexed_type: {
                        _in: [
                          '0x1::account::CoinRegister',
                          '0x1::account::CoinRegisterEvent'
                        ]
                      },
                      transaction_version: {
                        _in: transactions.map((t) =>
                          Number(t.transactionVersion)
                        )
                      }
                    }
                  }
                });

              creationMultisigRegisterEvents.push(
                ...creationMultisigRegisterEventsResponse
              );
            } while (creationTransactionsResponse.transactions.length === 100);

            return { creationTransactions, creationMultisigRegisterEvents };
          })()
        ]);

      const discoveredAccounts: {
        [account: string]: { hasVoted: boolean };
      } = {};

      creationTransactions.forEach((transaction) => {
        const multisigRegisterEvent = creationMultisigRegisterEvents.find(
          (t) =>
            t.transaction_version === Number(transaction.transactionVersion)
        );

        if (!multisigRegisterEvent) return;

        discoveredAccounts[
          multisigRegisterEvent.data.account ??
            multisigRegisterEvent.account_address
        ] = { hasVoted: true };
      });

      events.forEach((event) => {
        if (event.indexed_type === '0x1::multisig_account::AddOwners') {
          discoveredAccounts[event.data.multisig_account] = {
            hasVoted: false
          };
        }

        if (event.indexed_type === '0x1::multisig_account::RemoveOwners') {
          delete discoveredAccounts[event.data.multisig_account];
        }

        if (event.indexed_type === '0x1::multisig_account::Vote') {
          discoveredAccounts[event.data.multisig_account] = {
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
