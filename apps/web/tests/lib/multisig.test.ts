import { describe, it, expect } from 'vitest';
import { getResolvablePrefix, ResolvableProposal } from '../../lib/multisig';

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
