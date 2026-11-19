import { describe, it, expect } from 'vitest';
import { UserTransactionResponse } from '@aptos-labs/ts-sdk';
import { extractExecutionEvents } from '../../lib/executionEvents';

const VAULT = '0xabc';
const LONG_VAULT = `0x${'0'.repeat(61)}abc`;
const LONG_FRAMEWORK = `0x${'0'.repeat(63)}1`;

const makeTransaction = (events: unknown[]): UserTransactionResponse =>
  ({
    type: 'user_transaction',
    version: '100',
    sender: '0x0123',
    timestamp: '1000',
    events
  }) as unknown as UserTransactionResponse;

describe('extractExecutionEvents', () => {
  it('maps a module success event of the vault', () => {
    const [event] = extractExecutionEvents(
      makeTransaction([
        {
          guid: { account_address: '0x0', creation_number: '0' },
          type: '0x1::multisig_account::TransactionExecutionSucceeded',
          data: {
            multisig_account: LONG_VAULT,
            executor: '0x5',
            sequence_number: '7',
            transaction_payload: '0x01',
            num_approvals: '2'
          }
        }
      ]),
      VAULT
    );

    expect(event).toMatchObject({
      type: 'success',
      version: '100',
      payload: '0x01',
      approvals: 2,
      rejections: undefined,
      sequenceNumber: 7
    });
    expect(event?.executor.toStringLong()).toBe(`0x${'0'.repeat(63)}5`);
    expect(event?.transaction.sender).toBe(`0x${'0'.repeat(60)}0123`);
  });

  it('maps legacy handle events by guid owner and long framework type', () => {
    const [event] = extractExecutionEvents(
      makeTransaction([
        {
          guid: { account_address: VAULT, creation_number: '5' },
          type: `${LONG_FRAMEWORK}::multisig_account::ExecuteRejectedTransactionEvent`,
          data: { executor: '0x5', sequence_number: '3', num_rejections: '2' }
        }
      ]),
      VAULT
    );
    expect(event).toMatchObject({
      type: 'rejected',
      sequenceNumber: 3,
      rejections: 2
    });
  });

  it('maps failed events', () => {
    const [event] = extractExecutionEvents(
      makeTransaction([
        {
          guid: { account_address: '0x0', creation_number: '0' },
          type: '0x1::multisig_account::TransactionExecutionFailed',
          data: {
            multisig_account: VAULT,
            executor: '0x5',
            sequence_number: '1'
          }
        }
      ]),
      VAULT
    );
    expect(event?.type).toBe('failed');
  });

  it('ignores events of other multisig accounts and unrelated events', () => {
    expect(
      extractExecutionEvents(
        makeTransaction([
          {
            guid: { account_address: '0x0', creation_number: '0' },
            type: '0x1::multisig_account::TransactionExecutionSucceeded',
            data: {
              multisig_account: '0xdef',
              executor: '0x5',
              sequence_number: '1'
            }
          },
          {
            guid: { account_address: VAULT, creation_number: '1' },
            type: '0x1::multisig_account::Vote',
            data: { executor: '0x5', sequence_number: '1' }
          },
          {
            guid: { account_address: VAULT, creation_number: '1' },
            type: '0x2::multisig_account::TransactionExecutionSucceeded',
            data: { executor: '0x5', sequence_number: '1' }
          }
        ]),
        VAULT
      )
    ).toEqual([]);
  });

  it('returns every execution of a single transaction (execute_rejected_transactions)', () => {
    const events = extractExecutionEvents(
      makeTransaction([
        {
          guid: { account_address: '0x0', creation_number: '0' },
          type: '0x1::multisig_account::ExecuteRejectedTransaction',
          data: {
            multisig_account: VAULT,
            executor: '0x5',
            sequence_number: '3',
            num_rejections: '2'
          }
        },
        {
          guid: { account_address: '0x0', creation_number: '0' },
          type: '0x1::multisig_account::ExecuteRejectedTransaction',
          data: {
            multisig_account: VAULT,
            executor: '0x5',
            sequence_number: '4',
            num_rejections: '3'
          }
        }
      ]),
      VAULT
    );

    expect(events.map((e) => e.sequenceNumber)).toEqual([3, 4]);
    expect(events.map((e) => e.rejections)).toEqual([2, 3]);
  });

  it('merges legacy and module representations of the same execution', () => {
    const events = extractExecutionEvents(
      makeTransaction([
        {
          guid: { account_address: '0x0', creation_number: '0' },
          type: '0x1::multisig_account::ExecuteRejectedTransaction',
          data: {
            multisig_account: VAULT,
            executor: '0x5',
            sequence_number: '3',
            num_rejections: '2'
          }
        },
        {
          guid: { account_address: VAULT, creation_number: '5' },
          type: '0x1::multisig_account::ExecuteRejectedTransactionEvent',
          data: { executor: '0x5', sequence_number: '3', num_rejections: '2' }
        }
      ]),
      VAULT
    );

    expect(events).toHaveLength(1);
    expect(events[0]?.sequenceNumber).toBe(3);
  });

  it('throws on a malformed matching event instead of dropping it', () => {
    expect(() =>
      extractExecutionEvents(
        makeTransaction([
          {
            guid: { account_address: VAULT, creation_number: '1' },
            type: '0x1::multisig_account::TransactionExecutionSucceeded',
            data: { sequence_number: '1' }
          }
        ]),
        VAULT
      )
    ).toThrow(/no executor/);
  });
});
