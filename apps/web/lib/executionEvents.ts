import { AccountAddress, UserTransactionResponse } from '@aptos-labs/ts-sdk';

export type ExecutionEventType = 'success' | 'failed' | 'rejected';

export interface ExecutionEvent {
  type: ExecutionEventType;
  version: string;
  payload?: string;
  approvals?: number;
  rejections?: number;
  executor: AccountAddress;
  sequenceNumber: number;
  transaction: UserTransactionResponse;
}

const EXECUTION_EVENT_TYPES: Record<string, ExecutionEventType> = {
  TransactionExecutionSucceeded: 'success',
  TransactionExecutionSucceededEvent: 'success',
  TransactionExecutionFailed: 'failed',
  TransactionExecutionFailedEvent: 'failed',
  ExecuteRejectedTransaction: 'rejected',
  ExecuteRejectedTransactionEvent: 'rejected'
};

const LENIENT = { maxMissingChars: 63 };
const MODULE_PREFIX = '::multisig_account::';

function getExecutionEventType(
  eventType: string
): ExecutionEventType | undefined {
  const index = eventType.indexOf(MODULE_PREFIX);
  if (index === -1) return undefined;
  const address = eventType.slice(0, index);
  try {
    if (!AccountAddress.from(address, LENIENT).equals(AccountAddress.ONE)) {
      return undefined;
    }
  } catch {
    return undefined;
  }
  return EXECUTION_EVENT_TYPES[eventType.slice(index + MODULE_PREFIX.length)];
}

function sameAddress(a: unknown, b: AccountAddress): boolean {
  if (typeof a !== 'string') return false;
  try {
    return AccountAddress.from(a, LENIENT).equals(b);
  } catch {
    return false;
  }
}

function toOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Finds every multisig execution event of `vaultAddress` emitted by a user transaction.
 *
 * A single transaction may execute several multisig transactions (e.g.
 * `execute_rejected_transactions`), so all matches are returned in emission order.
 * Module events carry the multisig account in `data.multisig_account`; legacy handle
 * events are identified by the account owning the event GUID. When both representations
 * of the same execution (same type and sequence number) were emitted they are merged
 * into one entry. All entries share one normalized transaction object.
 */
export function extractExecutionEvents(
  transaction: UserTransactionResponse,
  vaultAddress: string
): ExecutionEvent[] {
  const vault = AccountAddress.from(vaultAddress, LENIENT);
  const events = new Map<string, ExecutionEvent>();
  let normalizedTransaction: UserTransactionResponse | undefined;

  for (const event of transaction.events ?? []) {
    const type = getExecutionEventType(event.type);
    if (!type) continue;

    const belongsToVault =
      sameAddress(event.data?.multisig_account, vault) ||
      sameAddress(event.guid?.account_address, vault);
    if (!belongsToVault) continue;

    const executor = event.data?.executor;
    if (typeof executor !== 'string') {
      throw new Error(
        `Execution event in transaction ${transaction.version} has no executor.`
      );
    }
    const sequenceNumber = toOptionalNumber(event.data?.sequence_number);
    if (sequenceNumber === undefined) {
      throw new Error(
        `Execution event in transaction ${transaction.version} has no sequence number.`
      );
    }

    const payload =
      typeof event.data?.transaction_payload === 'string'
        ? event.data.transaction_payload
        : undefined;
    const approvals = toOptionalNumber(event.data?.num_approvals);
    const rejections = toOptionalNumber(event.data?.num_rejections);

    const key = `${type}:${sequenceNumber}`;
    const existing = events.get(key);
    if (existing) {
      existing.payload ??= payload;
      existing.approvals ??= approvals;
      existing.rejections ??= rejections;
      continue;
    }

    // Normalize the sender address to fix zero prefixed addresses
    normalizedTransaction ??= {
      ...transaction,
      sender: AccountAddress.from(transaction.sender, LENIENT).toString()
    };

    events.set(key, {
      type,
      version: transaction.version,
      payload,
      approvals,
      rejections,
      executor: AccountAddress.from(executor, LENIENT),
      sequenceNumber,
      transaction: normalizedTransaction
    });
  }

  return [...events.values()];
}
