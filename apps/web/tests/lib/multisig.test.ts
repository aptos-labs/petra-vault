import { describe, it, expect } from 'vitest';
import {
  capPrefixToSelection,
  getResolvablePrefix,
  ResolvableProposal
} from '../../lib/multisig';

const approved = (executable = true): ResolvableProposal => ({
  approvals: 2,
  rejections: 0,
  executable
});
const rejected = (): ResolvableProposal => ({
  approvals: 0,
  rejections: 2,
  executable: true
});
const pending = (): ResolvableProposal => ({
  approvals: 1,
  rejections: 0,
  executable: true
});

describe('getResolvablePrefix', () => {
  it('returns zero for an empty queue', () => {
    expect(getResolvablePrefix([], 2)).toEqual({ executable: 0, removable: 0 });
  });

  it('counts a fully approved prefix as executable', () => {
    expect(getResolvablePrefix([approved(), approved(), pending()], 2)).toEqual(
      {
        executable: 2,
        removable: 0
      }
    );
  });

  it('stops the executable prefix at the first non-approved proposal', () => {
    expect(getResolvablePrefix([approved(), pending(), approved()], 2)).toEqual(
      { executable: 1, removable: 0 }
    );
  });

  it('does not count an approved proposal without a runnable payload', () => {
    expect(getResolvablePrefix([approved(false), approved()], 2)).toEqual({
      executable: 0,
      removable: 0
    });
  });

  it('counts a fully rejected prefix as removable', () => {
    expect(getResolvablePrefix([rejected(), rejected(), pending()], 2)).toEqual(
      {
        executable: 0,
        removable: 2
      }
    );
  });

  it('stops the removable prefix at the first non-rejected proposal', () => {
    expect(getResolvablePrefix([rejected(), pending(), rejected()], 2)).toEqual(
      {
        executable: 0,
        removable: 1
      }
    );
  });

  it('executes rather than removes when a proposal meets both thresholds', () => {
    // A 1-of-N vault can have a front proposal with one approval and one
    // rejection — approvals win, so it is executable and not removable.
    const both: ResolvableProposal = {
      approvals: 1,
      rejections: 1,
      executable: true
    };
    expect(getResolvablePrefix([both, rejected()], 1)).toEqual({
      executable: 1,
      removable: 0
    });
  });

  it('respects the signatures-required threshold', () => {
    const oneApproval: ResolvableProposal = {
      approvals: 1,
      rejections: 0,
      executable: true
    };
    expect(getResolvablePrefix([oneApproval], 1)).toEqual({
      executable: 1,
      removable: 0
    });
    expect(getResolvablePrefix([oneApproval], 2)).toEqual({
      executable: 0,
      removable: 0
    });
  });

  it('returns zero when signaturesRequired is not yet known (0)', () => {
    expect(getResolvablePrefix([approved(), rejected()], 0)).toEqual({
      executable: 0,
      removable: 0
    });
  });
});

describe('capPrefixToSelection', () => {
  it('returns the full prefix length when nothing is selected', () => {
    expect(capPrefixToSelection([5, 6, 7, 8, 9], new Set())).toBe(5);
  });

  it('narrows to the selected leading run of the prefix', () => {
    // Remove(5) becomes Remove(2) when only the two front proposals are selected.
    expect(capPrefixToSelection([5, 6, 7, 8, 9], new Set([5, 6]))).toBe(2);
  });

  it('stops at the first unselected proposal (a gap blocks the rest)', () => {
    expect(capPrefixToSelection([5, 6, 7, 8], new Set([5, 7, 8]))).toBe(1);
  });

  it('returns zero when the front of the prefix is not selected', () => {
    expect(capPrefixToSelection([5, 6, 7], new Set([6, 7]))).toBe(0);
  });

  it('ignores selected sequence numbers outside the prefix', () => {
    expect(capPrefixToSelection([5, 6], new Set([5, 6, 7, 8]))).toBe(2);
  });
});
