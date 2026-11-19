import {
  discoverMultisigAccounts,
  MultisigDiscoveryResult
} from '@/lib/multisigDiscovery';
import { NetworkInfo } from '@aptos-labs/js-pro';
import { useAptosCore, useClients } from '@aptos-labs/react';
import { AccountAddress, Network } from '@aptos-labs/ts-sdk';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';

interface UseMultisigDiscoveredAccountsParameters
  extends Omit<
    UseQueryOptions<MultisigDiscoveryResult>,
    'queryFn' | 'queryKey'
  > {
  address?: string;
  network?: NetworkInfo;
}

/**
 * Discovers the multisig accounts the given address is currently an owner of,
 * using only standard Aptos indexer and fullnode APIs.
 *
 * Discovery is based on the transactions `address` has sent to
 * `0x1::multisig_account` (creating vaults, proposing, voting), so vaults the
 * address was added to but never acted on are not discoverable. The result
 * reports when the scan was truncated or partially failed; a failed scan
 * rejects rather than resolving with an empty list.
 */
export default function useMultisigDiscoveredAccounts({
  address,
  network,
  ...options
}: UseMultisigDiscoveredAccountsParameters) {
  const core = useAptosCore();

  const activeNetwork = network ?? core.network;
  const { aptos } = useClients({ network: activeNetwork });

  const enabled = Boolean(
    address &&
      activeNetwork.network !== Network.DEVNET &&
      (options.enabled ?? true)
  );

  return useQuery<MultisigDiscoveryResult>({
    staleTime: 1000 * 60 * 1,
    retry: 1,
    ...options,
    enabled,
    // Distinct from the legacy `multisig-discovered-accounts` key, whose
    // persisted entries have a different shape.
    queryKey: ['multisig-owner-discovery', address, activeNetwork],
    queryFn: ({ signal }) => {
      if (!address) throw new Error('Address is required');

      return discoverMultisigAccounts({
        aptos,
        owner: AccountAddress.from(address),
        signal
      });
    }
  });
}
