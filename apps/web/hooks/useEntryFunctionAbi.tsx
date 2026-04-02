import { useClients } from '@aptos-labs/react';
import { fetchEntryFunctionAbi } from '@aptos-labs/ts-sdk';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';

interface useEntryFunctionAbiParameters
  extends Omit<UseQueryOptions, 'queryKey' | 'queryFn'> {
  entryFunction?: string;
}

export default function useEntryFunctionAbi({
  entryFunction
}: useEntryFunctionAbiParameters) {
  const { aptos } = useClients();

  return useQuery({
    staleTime: 60 * 60_000,
    queryKey: ['function-abi', entryFunction],
    enabled: entryFunction !== undefined,
    queryFn: async () => {
      if (!entryFunction) throw new Error('Requires `entryFunction`');

      const [moduleAddress, moduleName, functionName] =
        entryFunction.split('::');

      if (!moduleAddress || !moduleName || !functionName) {
        throw new Error('Invalid entry function');
      }

      return await fetchEntryFunctionAbi(
        moduleAddress,
        moduleName,
        functionName,
        aptos.config
      );
    }
  });
}
