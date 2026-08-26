import { useClients } from '@aptos-labs/react';
import { MoveModuleBytecode } from '@aptos-labs/ts-sdk';
import { useQuery } from '@tanstack/react-query';
import { isLikelyAddress } from '@/lib/entryFunctionInput';

interface UseAccountModulesParameters {
  address?: string;
  enabled?: boolean;
}

/**
 * Fetches every Move module (with its ABI) published under an account. A single
 * call yields both the module names and each module's exposed functions, which
 * powers the entry-function autocomplete. Mirrors {@link useEntryFunctionAbi} so
 * modules and ABIs resolve against the same (default) network.
 */
export default function useAccountModules({
  address,
  enabled = true
}: UseAccountModulesParameters) {
  const { aptos } = useClients();

  return useQuery({
    staleTime: 60 * 60_000,
    queryKey: ['account-modules', address],
    enabled: enabled && !!address && isLikelyAddress(address),
    queryFn: async (): Promise<MoveModuleBytecode[]> => {
      if (!address) throw new Error('Requires `address`');
      return aptos.getAccountModules({ accountAddress: address });
    }
  });
}
