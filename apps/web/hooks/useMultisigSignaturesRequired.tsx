import { ModuleViewReturnType } from '@/lib/types/modules';
import { useViewModule, UseViewModuleParameters } from '@aptos-labs/react';

export interface UseMultisigSignaturesRequiredOptions
  extends Omit<
    UseViewModuleParameters<
      ModuleViewReturnType<'0x1::multisig_account::num_signatures_required'>
    >,
    'payload'
  > {
  address: string;
}

export default function useMultisigSignaturesRequired({
  address,
  ...options
}: UseMultisigSignaturesRequiredOptions) {
  const { data, ...query } = useViewModule<
    ModuleViewReturnType<'0x1::multisig_account::num_signatures_required'>
  >({
    staleTime: 5 * 60_000,
    payload: {
      function: '0x1::multisig_account::num_signatures_required',
      functionArguments: [address]
    },
    ...options
  });
  return {
    data: data?.at(0) ? Number(data.at(0)) : undefined,
    ...query
  };
}
