import { ModuleViewReturnType } from '@/lib/types/modules';
import { useViewModule, UseViewModuleParameters } from '@aptos-labs/react';

export interface UseMultisigSequenceNumberOptions
  extends Omit<
    UseViewModuleParameters<
      ModuleViewReturnType<'0x1::multisig_account::last_resolved_sequence_number'>
    >,
    'payload'
  > {
  address: string;
}

export default function useMultisigSequenceNumber({
  address,
  ...options
}: UseMultisigSequenceNumberOptions) {
  const { data, ...query } = useViewModule<
    ModuleViewReturnType<'0x1::multisig_account::last_resolved_sequence_number'>
  >({
    staleTime: 60_000,
    payload: {
      function: '0x1::multisig_account::last_resolved_sequence_number',
      functionArguments: [address]
    },
    ...options
  });
  const sequenceNumber = data?.at(0);
  return {
    data: sequenceNumber ? parseInt(sequenceNumber) : undefined,
    ...query
  };
}
