import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  dehydrate,
  hydrate,
  QueryClient,
  QueryClientProvider
} from '@tanstack/react-query';
import {
  AccountAddress,
  EntryFunction,
  MultiSigTransactionPayload,
  Network
} from '@aptos-labs/ts-sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useMultisigExecutionEvents, {
  type ExecutionEvent
} from '@/hooks/useMultisigExecutionEvents';
import TransactionRow from '@/components/TransactionRow';
import { LONG_FRAMEWORK_ADDRESS } from '@/lib/constants';
import { storageOptionsSerializers } from '@/lib/storage';

const { getMultisigTransactions, getTransactionByVersion } = vi.hoisted(() => ({
  getMultisigTransactions: vi.fn(),
  getTransactionByVersion: vi.fn()
}));

vi.mock('@/operations', () => ({
  getMultisigIndexerClient: () => ({ getMultisigTransactions })
}));

vi.mock('@aptos-labs/react', () => ({
  useClients: () => ({
    aptos: {
      config: { network: 'mainnet' },
      getTransactionByVersion
    }
  }),
  useNameFromAddress: () => ({ data: undefined })
}));

const address = '0x1';
const network = { network: Network.MAINNET };
const timestamp = Date.parse('2026-08-20T00:33:24.335Z');
const payload = new MultiSigTransactionPayload(
  EntryFunction.build('0x1::aptos_account', 'transfer', [], [])
)
  .bcsToHex()
  .toString();
const row = {
  version: '7350673760',
  event_type: `${LONG_FRAMEWORK_ADDRESS}::multisig_account::TransactionExecutionSucceeded`,
  timestamp: '2026-08-20T00:33:24.335000',
  transaction_payload: payload,
  executor: '0x2',
  sequence_number: '7',
  num_approvals: '2',
  num_rejections: '0'
};

let client: QueryClient;

beforeEach(() => {
  vi.resetAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  getMultisigTransactions.mockResolvedValue({ multisig_transactions: [row] });
  getTransactionByVersion.mockRejectedValue(new Error('HTTP 410: pruned'));
});

afterEach(() => {
  client.clear();
  vi.restoreAllMocks();
});

function renderHistory() {
  let result: ReturnType<typeof useMultisigExecutionEvents> | undefined;
  function Probe() {
    result = useMultisigExecutionEvents({ address, network });
    return null;
  }
  renderToStaticMarkup(
    createElement(QueryClientProvider, { client }, createElement(Probe))
  );
  if (!result) throw new Error('History hook did not render');
  return result;
}

describe('execution history', () => {
  it.each([
    { name: 'empty', page: [] },
    {
      name: 'populated',
      page: [
        { version: row.version, transaction: { timestamp: '1787186004335000' } }
      ]
    }
  ])(
    'ignores restored $name array pages from the previous cache format',
    async ({ page }) => {
      const oldKey = ['multisig-execution-events', address, network];
      const oldData = { pages: [page], pageParams: [0] };
      client.setQueryData(oldKey, oldData);
      const stored = JSON.stringify(dehydrate(client));
      client.clear();
      hydrate(client, JSON.parse(stored));
      expect(client.getQueryData(oldKey)).toEqual(oldData);

      const history = renderHistory();
      expect(history.data).toBeUndefined();
      const refreshed = await history.refetch();
      expect(refreshed.data?.pages[0]).toMatchObject({
        rawCount: 1,
        events: [{ version: row.version, timestamp }]
      });
    }
  );

  it('restores the current cache format with usable executor addresses', async () => {
    await renderHistory().refetch();
    const stored = JSON.stringify(
      dehydrate(client),
      storageOptionsSerializers.replacer
    );
    client.clear();
    hydrate(client, JSON.parse(stored, storageOptionsSerializers.reviver));

    const event = renderHistory().data?.pages[0]?.events[0];
    expect(event?.timestamp).toBe(timestamp);
    expect(event?.executor.toString()).toBe(row.executor);
  });

  it.each([
    ['1787186004335000', timestamp],
    [1787186004335000, timestamp],
    ['2026-08-20T00:33:24.335000', timestamp],
    ['2026-08-20T00:33:24.335Z', timestamp],
    ['2026-08-19T21:33:24.335-03:00', timestamp],
    [null, undefined],
    ['invalid', undefined]
  ])(
    'converts indexer timestamp %j to milliseconds',
    async (value, expected) => {
      getMultisigTransactions.mockResolvedValue({
        multisig_transactions: [{ ...row, timestamp: value }]
      });
      const result = await renderHistory().refetch();
      expect(result.isSuccess).toBe(true);
      expect(result.data?.pages[0]?.events[0]).toMatchObject({
        timestamp: expected
      });
    }
  );

  it.each([
    ['TransactionExecutionSucceeded', 'success'],
    ['TransactionExecutionSucceededEvent', 'success'],
    ['TransactionExecutionFailed', 'failed'],
    ['TransactionExecutionFailedEvent', 'failed'],
    ['ExecuteRejectedTransaction', 'rejected'],
    ['ExecuteRejectedTransactionEvent', 'rejected']
  ])(
    'reads %s entirely from the indexer, even when the fullnode has pruned it',
    async (event, type) => {
      getMultisigTransactions.mockResolvedValue({
        multisig_transactions: [
          {
            ...row,
            event_type: `${LONG_FRAMEWORK_ADDRESS}::multisig_account::${event}`,
            transaction_payload: type === 'rejected' ? null : payload
          }
        ]
      });
      const result = await renderHistory().refetch();
      expect(result.isSuccess).toBe(true);
      expect(result.data?.pages[0]?.events[0]).toMatchObject({
        type,
        version: row.version,
        timestamp,
        executor: AccountAddress.from('0x2'),
        sequenceNumber: 7,
        approvals: 2,
        rejections: 0
      });
      expect(getTransactionByVersion).not.toHaveBeenCalled();
    }
  );

  it('continues after a full page containing an unknown event and stops after a short page', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    getMultisigTransactions
      .mockResolvedValueOnce({
        multisig_transactions: Array.from({ length: 15 }, (_, index) => ({
          ...row,
          version: String(100 - index),
          event_type: index === 0 ? 'unknown' : row.event_type
        }))
      })
      .mockResolvedValueOnce({ multisig_transactions: [row] });
    const first = await renderHistory().fetchNextPage();
    expect(first.data?.pages[0]?.events).toHaveLength(14);
    expect(first.hasNextPage).toBe(true);
    expect(error).toHaveBeenCalledWith('Unknown event type: unknown');

    const second = await first.fetchNextPage();
    expect(getMultisigTransactions).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        multisigAccount: address,
        offset: 15,
        limit: 15
      })
    );
    expect(second.data?.pages).toHaveLength(2);
    expect(second.data?.pages[1]?.events[0]?.version).toBe(row.version);
    expect(second.hasNextPage).toBe(false);
  });
});

describe('transaction rows', () => {
  it.each<ExecutionEvent['type']>(['success', 'failed', 'rejected'])(
    'renders a %s execution using only indexer fields',
    (type) => {
      const html = renderToStaticMarkup(
        createElement(TransactionRow, {
          network: Network.MAINNET,
          executionEvent: {
            type,
            version: row.version,
            timestamp,
            payload: type === 'rejected' ? undefined : payload,
            executor: AccountAddress.from(row.executor),
            sequenceNumber: 7,
            approvals: 2,
            rejections: 0
          }
        })
      );
      expect(html).toContain(
        type === 'rejected' ? 'Rejected transaction' : 'Transfer APT'
      );
      expect(html).toContain(`txn/${row.version}`);
      expect(html).toContain(new Date(timestamp).toLocaleString());
      expect(html).toContain('0x2');
      expect(getTransactionByVersion).not.toHaveBeenCalled();
    }
  );
});
