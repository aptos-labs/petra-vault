import { describe, it, expect } from 'vitest';
import {
  createRangeVoteTransactionPayloadData,
  getContiguousRanges
} from '../../lib/payloads';

const VAULT = '0x1';

describe('getContiguousRanges', () => {
  it('returns an empty array for no sequence numbers', () => {
    expect(getContiguousRanges([])).toEqual([]);
  });

  it('collapses a fully contiguous selection into one range', () => {
    expect(getContiguousRanges([1, 2, 3, 4])).toEqual([[1, 4]]);
  });

  it('sorts and de-duplicates before grouping', () => {
    expect(getContiguousRanges([3, 1, 2, 3, 5])).toEqual([
      [1, 3],
      [5, 5]
    ]);
  });

  it('splits a non-contiguous selection into multiple runs', () => {
    expect(getContiguousRanges([1, 2, 4, 6, 7])).toEqual([
      [1, 2],
      [4, 4],
      [6, 7]
    ]);
  });

  it('treats a single sequence number as a singleton range', () => {
    expect(getContiguousRanges([9])).toEqual([[9, 9]]);
  });
});

describe('createRangeVoteTransactionPayloadData', () => {
  it('uses vote_transactions for a contiguous run of approvals', () => {
    expect(
      createRangeVoteTransactionPayloadData({
        vaultAddress: VAULT,
        startSequenceNumber: 3,
        endSequenceNumber: 5,
        approve: true
      })
    ).toEqual({
      function: '0x1::multisig_account::vote_transactions',
      functionArguments: [VAULT, 3, 5, true]
    });
  });

  it('uses vote_transactions for a contiguous run of rejections', () => {
    expect(
      createRangeVoteTransactionPayloadData({
        vaultAddress: VAULT,
        startSequenceNumber: 1,
        endSequenceNumber: 3,
        approve: false
      })
    ).toEqual({
      function: '0x1::multisig_account::vote_transactions',
      functionArguments: [VAULT, 1, 3, false]
    });
  });

  it('uses approve_transaction for a singleton approval', () => {
    expect(
      createRangeVoteTransactionPayloadData({
        vaultAddress: VAULT,
        startSequenceNumber: 7,
        endSequenceNumber: 7,
        approve: true
      })
    ).toEqual({
      function: '0x1::multisig_account::approve_transaction',
      functionArguments: [VAULT, 7]
    });
  });

  it('uses reject_transaction for a singleton rejection', () => {
    expect(
      createRangeVoteTransactionPayloadData({
        vaultAddress: VAULT,
        startSequenceNumber: 7,
        endSequenceNumber: 7,
        approve: false
      })
    ).toEqual({
      function: '0x1::multisig_account::reject_transaction',
      functionArguments: [VAULT, 7]
    });
  });
});

describe('bulk vote payload planning', () => {
  it('maps a non-contiguous selection to one payload per run', () => {
    const payloads = getContiguousRanges([1, 2, 3, 5]).map(([start, end]) =>
      createRangeVoteTransactionPayloadData({
        vaultAddress: VAULT,
        startSequenceNumber: start,
        endSequenceNumber: end,
        approve: false
      })
    );

    expect(payloads).toEqual([
      {
        function: '0x1::multisig_account::vote_transactions',
        functionArguments: [VAULT, 1, 3, false]
      },
      {
        function: '0x1::multisig_account::reject_transaction',
        functionArguments: [VAULT, 5]
      }
    ]);
  });
});
