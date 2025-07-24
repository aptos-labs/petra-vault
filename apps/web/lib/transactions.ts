import { UseQueryResult } from '@tanstack/react-query';

import {
  UserTransactionResponse,
  WriteSetChange,
  WriteSetChangeWriteResource
} from '@aptos-labs/ts-sdk';

export function getSimulationQueryErrors(
  result: UseQueryResult<UserTransactionResponse, Error>
): [isError: boolean | undefined, message: string | undefined] {
  return [
    result.isError || (result.data && !result.data.success),
    result.error?.message ??
      result.data?.vm_status ??
      'An unknown error occurred with simulating your transaction.'
  ];
}

export const explainError = (error?: string) => {
  if (error?.includes('MAX_GAS_UNITS_BELOW_MIN_TRANSACTION_GAS_UNITS')) {
    return 'The account must have some APT to create a proposal. Please add some APT to the Vault and try again.';
  }
  return error;
};

export const isWriteSetChangeWriteResource = (
  change: WriteSetChange
): change is WriteSetChangeWriteResource => {
  return change.type === 'write_resource';
};
