import { describe, it, expect } from 'vitest';
import { createRemoveRejectedTransactionPayloadData } from '../../lib/payloads';

const VAULT = '0x1';

describe('createRemoveRejectedTransactionPayloadData', () => {
  it('uses execute_rejected_transaction for a single removal', () => {
    expect(
      createRemoveRejectedTransactionPayloadData({
        vaultAddress: VAULT,
        finalSequenceNumber: 5,
        count: 1
      })
    ).toEqual({
      function: '0x1::multisig_account::execute_rejected_transaction',
      functionArguments: [VAULT]
    });
  });

  it('uses execute_rejected_transactions for multiple removals', () => {
    expect(
      createRemoveRejectedTransactionPayloadData({
        vaultAddress: VAULT,
        finalSequenceNumber: 7,
        count: 3
      })
    ).toEqual({
      function: '0x1::multisig_account::execute_rejected_transactions',
      functionArguments: [VAULT, 7]
    });
  });

  it('treats a zero/negative count as the single-removal entry function', () => {
    expect(
      createRemoveRejectedTransactionPayloadData({
        vaultAddress: VAULT,
        finalSequenceNumber: 4,
        count: 0
      })
    ).toEqual({
      function: '0x1::multisig_account::execute_rejected_transaction',
      functionArguments: [VAULT]
    });
  });
});
