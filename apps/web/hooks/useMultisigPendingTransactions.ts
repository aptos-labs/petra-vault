import { ModuleViewReturnType } from '@/lib/types/modules';
import { useViewModule, UseViewModuleParameters } from '@aptos-labs/react';
import { AccountAddress } from '@aptos-labs/ts-sdk';

export interface PendingMultisigTransaction {
  payload?: string;
  payloadHash?: string;
  votes: { approvals: AccountAddress[]; rejections: AccountAddress[] };
  creator: AccountAddress;
  multisigAddress: AccountAddress;
  creation: Date;
}

export interface UseMultisigPendingTransactionsOptions
  extends Omit<
    UseViewModuleParameters<
      ModuleViewReturnType<'0x1::multisig_account::get_pending_transactions'>
    >,
    'payload'
  > {
  address: string;
}

export default function useMultisigPendingTransactions({
  address,
  ...options
}: UseMultisigPendingTransactionsOptions) {
  const { data, ...query } = useViewModule<
    ModuleViewReturnType<'0x1::multisig_account::get_pending_transactions'>
  >({
    staleTime: 60_000,
    payload: {
      function: '0x1::multisig_account::get_pending_transactions',
      functionArguments: [address]
    },
    ...options
  });

  return {
    data: data?.at(0)?.map(
      (e) =>
        ({
          creator: AccountAddress.from(e.creator),
          multisigAddress: AccountAddress.from(address),
          payload: e.payload.vec.at(0),
          payloadHash: e.payload_hash.vec.at(0),
          votes: e.votes.data.reduce(
            (acc, v) => {
              if (v.value) {
                acc.approvals.push(AccountAddress.from(v.key));
              } else {
                acc.rejections.push(AccountAddress.from(v.key));
              }
              return acc;
            },
            { approvals: [], rejections: [] } as {
              approvals: AccountAddress[];
              rejections: AccountAddress[];
            }
          ),
          creation: new Date(Number(e.creation_time_secs) * 1000)
        }) satisfies PendingMultisigTransaction
    ),
    ...query
  };
}
