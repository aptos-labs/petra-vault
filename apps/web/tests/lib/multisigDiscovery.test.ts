import { describe, expect, it, vi } from 'vitest';
import {
  AccountAddress,
  TransactionResponse,
  TransactionResponseType
} from '@aptos-labs/ts-sdk';
import {
  DISCOVERY_MAX_PAGES,
  DISCOVERY_PAGE_SIZE,
  DiscoveryClient,
  discoverMultisigAccounts,
  fetchMultisigOwners,
  getMultisigAddressesFromTransaction,
  MULTISIG_ACCOUNT_RESOURCE_TYPE,
  parseVaultAddress,
  verifyMultisigOwnership
} from '../../lib/multisigDiscovery';

const addr = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const address = (n: number) => AccountAddress.from(addr(n));

const OWNER = address(0x100);
const VAULT_A = address(0xa1);
const VAULT_B = address(0xb2);
const VAULT_C = address(0xc3);

const userTransaction = (
  payload: Record<string, unknown>,
  changes: Record<string, unknown>[] = []
) =>
  ({
    type: TransactionResponseType.User,
    payload,
    changes
  }) as unknown as TransactionResponse;

const entryFunction = (fn: string, args: unknown[]) => ({
  type: 'entry_function_payload',
  function: fn,
  type_arguments: [],
  arguments: args
});

const multisigResourceWrite = (vault: string) => ({
  type: 'write_resource',
  address: vault,
  state_key_hash: '0x',
  data: { type: MULTISIG_ACCOUNT_RESOURCE_TYPE, data: {} }
});

class FakeApiError extends Error {
  constructor(
    public status: number,
    public data: unknown = {}
  ) {
    super(`HTTP ${status}`);
  }
}

const notFound = () =>
  new FakeApiError(404, { error_code: 'resource_not_found' });

describe('parseVaultAddress', () => {
  it('accepts a full address', () => {
    expect(parseVaultAddress(addr(0xa1))?.toStringLong()).toBe(addr(0xa1));
  });

  it('trims whitespace and adds a missing 0x prefix', () => {
    expect(
      parseVaultAddress(`  ${addr(0xa1).slice(2)}\n`)?.toStringLong()
    ).toBe(addr(0xa1));
  });

  it('rejects empty and malformed input', () => {
    expect(parseVaultAddress('')).toBeUndefined();
    expect(parseVaultAddress('   ')).toBeUndefined();
    expect(parseVaultAddress('not-an-address')).toBeUndefined();
    expect(parseVaultAddress('0xzz')).toBeUndefined();
    expect(parseVaultAddress(`0x${'1'.repeat(65)}`)).toBeUndefined();
  });
});

describe('getMultisigAddressesFromTransaction', () => {
  it.each([
    'approve_transaction',
    'reject_transaction',
    'create_transaction',
    'create_transaction_with_hash',
    'vote_transaction',
    'execute_rejected_transaction',
    'add_owner'
  ])('reads the multisig address from the first argument of %s', (name) => {
    const tx = userTransaction(
      entryFunction(`0x1::multisig_account::${name}`, [addr(0xa1), '3'])
    );
    expect(getMultisigAddressesFromTransaction(tx)).toEqual([addr(0xa1)]);
  });

  it('normalizes short and uppercase addresses to the long form', () => {
    const tx = userTransaction(
      entryFunction('0x1::multisig_account::approve_transaction', [
        `0x${addr(0xa1).slice(2).toUpperCase()}`,
        '1'
      ])
    );
    expect(getMultisigAddressesFromTransaction(tx)).toEqual([addr(0xa1)]);
  });

  it('resolves vault creation from the MultisigAccount resource write', () => {
    const tx = userTransaction(
      entryFunction('0x1::multisig_account::create_with_owners', [
        [addr(0x200)],
        '1',
        [],
        []
      ]),
      [
        {
          type: 'write_resource',
          address: addr(0x100),
          state_key_hash: '0x',
          data: { type: '0x1::account::Account', data: {} }
        },
        multisigResourceWrite(addr(0xb2))
      ]
    );
    expect(getMultisigAddressesFromTransaction(tx)).toEqual([addr(0xb2)]);
  });

  it('does not treat the first argument of creation functions as a vault', () => {
    const tx = userTransaction(
      entryFunction('0x1::multisig_account::create', ['2', [], []])
    );
    expect(getMultisigAddressesFromTransaction(tx)).toEqual([]);

    const withExisting = userTransaction(
      entryFunction('0x1::multisig_account::create_with_owners', [
        addr(0x300),
        '1'
      ])
    );
    expect(getMultisigAddressesFromTransaction(withExisting)).toEqual([]);
  });

  it('reads the address of multisig payloads (execution)', () => {
    const tx = userTransaction({
      type: 'multisig_payload',
      multisig_address: addr(0xc3)
    });
    expect(getMultisigAddressesFromTransaction(tx)).toEqual([addr(0xc3)]);
  });

  it('deduplicates repeated addresses', () => {
    const tx = userTransaction(
      entryFunction('0x1::multisig_account::approve_transaction', [
        addr(0xa1),
        '1'
      ]),
      [multisigResourceWrite(addr(0xa1))]
    );
    expect(getMultisigAddressesFromTransaction(tx)).toEqual([addr(0xa1)]);
  });

  it('ignores unrelated functions, invalid arguments and non-user transactions', () => {
    expect(
      getMultisigAddressesFromTransaction(
        userTransaction(
          entryFunction('0x1::aptos_account::transfer', [addr(0xa1), '1'])
        )
      )
    ).toEqual([]);
    expect(
      getMultisigAddressesFromTransaction(
        userTransaction(
          entryFunction('0x1::multisig_account::approve_transaction', [
            'not-an-address',
            '1'
          ])
        )
      )
    ).toEqual([]);
    expect(
      getMultisigAddressesFromTransaction({
        type: TransactionResponseType.BlockMetadata
      } as unknown as TransactionResponse)
    ).toEqual([]);
  });
});

describe('fetchMultisigOwners / verifyMultisigOwnership', () => {
  const clientWithResource = (
    getAccountResource: (args: unknown) => Promise<unknown>
  ) => ({ getAccountResource }) as unknown as DiscoveryClient;

  it('returns the current owners', async () => {
    const aptos = clientWithResource(async () => ({
      owners: [addr(0x100), addr(0x200)]
    }));
    const owners = await fetchMultisigOwners(aptos, VAULT_A);
    expect(owners?.map((o) => o.toStringLong())).toEqual([
      addr(0x100),
      addr(0x200)
    ]);
  });

  it('returns null when the address has no multisig resource', async () => {
    const aptos = clientWithResource(async () => {
      throw notFound();
    });
    await expect(fetchMultisigOwners(aptos, VAULT_A)).resolves.toBeNull();

    const noAccount = clientWithResource(async () => {
      throw new FakeApiError(404, { error_code: 'account_not_found' });
    });
    await expect(fetchMultisigOwners(noAccount, VAULT_A)).resolves.toBeNull();
  });

  it('rethrows request failures instead of reporting "not a multisig"', async () => {
    for (const error of [
      new FakeApiError(429, { error_code: 'rate_limited' }),
      new FakeApiError(500),
      new FakeApiError(404), // 404 without a resource_not_found code (bad endpoint)
      new Error('fetch failed')
    ]) {
      const aptos = clientWithResource(async () => {
        throw error;
      });
      await expect(fetchMultisigOwners(aptos, VAULT_A)).rejects.toBe(error);
    }
  });

  it('rejects a malformed resource', async () => {
    const aptos = clientWithResource(async () => ({}));
    await expect(fetchMultisigOwners(aptos, VAULT_A)).rejects.toThrow(
      /missing owners/
    );
  });

  it('classifies owner, non-owner and non-multisig addresses', async () => {
    const aptos = clientWithResource(async (args) => {
      const { accountAddress } = args as { accountAddress: AccountAddress };
      if (accountAddress.equals(VAULT_A)) return { owners: [addr(0x100)] };
      if (accountAddress.equals(VAULT_B)) return { owners: [addr(0x200)] };
      throw notFound();
    });

    expect(await verifyMultisigOwnership(aptos, VAULT_A, OWNER)).toMatchObject({
      status: 'owner'
    });
    expect(await verifyMultisigOwnership(aptos, VAULT_B, OWNER)).toMatchObject({
      status: 'not-owner'
    });
    expect(await verifyMultisigOwnership(aptos, VAULT_C, OWNER)).toEqual({
      status: 'not-multisig'
    });
  });
});

describe('discoverMultisigAccounts', () => {
  interface Setup {
    /** Transactions by version, newest first. A function value simulates a failure. */
    transactions: Record<string, TransactionResponse | Error>;
    /** Owners by vault (long address). Missing = not a multisig. An Error = lookup failure. */
    vaults: Record<string, string[] | Error>;
    queryIndexer?: DiscoveryClient['queryIndexer'];
  }

  const setup = ({ transactions, vaults, queryIndexer }: Setup) => {
    // Integer-like keys iterate ascending; the indexer returns newest first.
    const versions = Object.keys(transactions).sort(
      (a, b) => Number(b) - Number(a)
    );
    const indexer = vi.fn(async (args: unknown) => {
      const { variables } = (
        args as {
          query: { variables: { limit: number; offset: number } };
        }
      ).query;
      return {
        account_transactions: versions
          .slice(variables.offset, variables.offset + variables.limit)
          .map((v) => ({ transaction_version: Number(v) }))
      };
    });
    const getTransactionByVersion = vi.fn(
      async ({ ledgerVersion }: { ledgerVersion: number | string }) => {
        const result = transactions[String(ledgerVersion)];
        if (result instanceof Error) throw result;
        return result;
      }
    );
    const getAccountResource = vi.fn(
      async ({ accountAddress }: { accountAddress: AccountAddress }) => {
        const vault = vaults[accountAddress.toStringLong()];
        if (!vault) throw notFound();
        if (vault instanceof Error) throw vault;
        return { owners: vault };
      }
    );
    const aptos = {
      queryIndexer: queryIndexer ?? indexer,
      getTransactionByVersion,
      getAccountResource
    } as unknown as DiscoveryClient;
    return { aptos, indexer, getTransactionByVersion, getAccountResource };
  };

  const approve = (vault: string) =>
    userTransaction(
      entryFunction('0x1::multisig_account::approve_transaction', [vault, '1'])
    );

  it('returns verified vaults, newest activity first, without duplicates', async () => {
    const { aptos } = setup({
      transactions: {
        '400': approve(addr(0xb2)),
        '300': approve(addr(0xa1)),
        '200': approve(addr(0xb2)),
        '100': userTransaction(
          entryFunction('0x1::multisig_account::create_with_owners', [
            [addr(0x200)],
            '1',
            [],
            []
          ]),
          [multisigResourceWrite(addr(0xc3))]
        )
      },
      vaults: {
        [addr(0xa1)]: [addr(0x100), addr(0x200)],
        [addr(0xb2)]: [addr(0x100)],
        [addr(0xc3)]: [addr(0x100)]
      }
    });

    const result = await discoverMultisigAccounts({ aptos, owner: OWNER });

    expect(result.accounts.map((a) => a.toStringLong())).toEqual([
      addr(0xb2),
      addr(0xa1),
      addr(0xc3)
    ]);
    expect(result.truncated).toBe(false);
    expect(result.failedLookups).toBe(0);
  });

  it('excludes vaults the account no longer owns and non-multisig candidates', async () => {
    const { aptos } = setup({
      transactions: {
        '300': approve(addr(0xa1)), // owner was removed since voting
        '200': approve(addr(0xb2)), // still an owner
        '100': approve(addr(0xc3)) // not a multisig (no resource)
      },
      vaults: {
        [addr(0xa1)]: [addr(0x200)],
        [addr(0xb2)]: [addr(0x100)]
      }
    });

    const result = await discoverMultisigAccounts({ aptos, owner: OWNER });

    expect(result.accounts.map((a) => a.toStringLong())).toEqual([addr(0xb2)]);
    expect(result.failedLookups).toBe(0);
  });

  it('returns an empty verified result when the account has no multisig activity', async () => {
    const { aptos, getTransactionByVersion } = setup({
      transactions: {},
      vaults: {}
    });

    const result = await discoverMultisigAccounts({ aptos, owner: OWNER });

    expect(result).toEqual({
      accounts: [],
      truncated: false,
      failedLookups: 0
    });
    expect(getTransactionByVersion).not.toHaveBeenCalled();
  });

  it('queries the indexer with the long address form', async () => {
    const shortOwner = AccountAddress.from('0x1');
    const { aptos, indexer } = setup({ transactions: {}, vaults: {} });

    await discoverMultisigAccounts({ aptos, owner: shortOwner });

    expect(indexer).toHaveBeenCalledTimes(1);
    const [firstCall] = indexer.mock.calls;
    const { query } = firstCall?.[0] as {
      query: { variables: { address: string } };
    };
    expect(query.variables.address).toBe(shortOwner.toStringLong());
  });

  it('flags truncation when the owner has more activity than the scan window', async () => {
    const total = DISCOVERY_PAGE_SIZE * DISCOVERY_MAX_PAGES + 1;
    const transactions: Record<string, TransactionResponse> = {};
    for (let v = total; v >= 1; v -= 1) {
      transactions[String(v)] = approve(addr(0xa1));
    }
    const { aptos, indexer, getTransactionByVersion } = setup({
      transactions,
      vaults: { [addr(0xa1)]: [addr(0x100)] }
    });

    const result = await discoverMultisigAccounts({ aptos, owner: OWNER });

    expect(indexer).toHaveBeenCalledTimes(DISCOVERY_MAX_PAGES);
    expect(getTransactionByVersion).toHaveBeenCalledTimes(
      DISCOVERY_PAGE_SIZE * DISCOVERY_MAX_PAGES
    );
    expect(result.truncated).toBe(true);
    expect(result.accounts).toHaveLength(1);
  });

  it('does not flag truncation when the last page is exactly the scan window', async () => {
    const total = DISCOVERY_PAGE_SIZE;
    const transactions: Record<string, TransactionResponse> = {};
    for (let v = total; v >= 1; v -= 1) {
      transactions[String(v)] = approve(addr(0xa1));
    }
    const { aptos } = setup({
      transactions,
      vaults: { [addr(0xa1)]: [addr(0x100)] }
    });

    const result = await discoverMultisigAccounts({ aptos, owner: OWNER });

    expect(result.truncated).toBe(false);
  });

  it('rejects when the indexer query fails instead of returning an empty list', async () => {
    const { aptos } = setup({
      transactions: {},
      vaults: {},
      queryIndexer: vi.fn(async () => {
        throw new Error('Per anonymous IP rate limit exceeded');
      }) as unknown as DiscoveryClient['queryIndexer']
    });

    await expect(
      discoverMultisigAccounts({ aptos, owner: OWNER })
    ).rejects.toThrow(/Aptos indexer.*rate limit/);
  });

  it('rejects when every transaction lookup fails', async () => {
    const { aptos } = setup({
      transactions: {
        '200': new Error('timeout'),
        '100': new Error('timeout')
      },
      vaults: {}
    });

    await expect(
      discoverMultisigAccounts({ aptos, owner: OWNER })
    ).rejects.toThrow(/Could not load your multisig transactions.*timeout/);
  });

  it('rejects when every ownership verification fails', async () => {
    const { aptos } = setup({
      transactions: { '200': approve(addr(0xa1)), '100': approve(addr(0xb2)) },
      vaults: {
        [addr(0xa1)]: new Error('503'),
        [addr(0xb2)]: new Error('503')
      }
    });

    await expect(
      discoverMultisigAccounts({ aptos, owner: OWNER })
    ).rejects.toThrow(/Could not verify vault ownership.*503/);
  });

  it('reports partial failures so the list is not presented as complete', async () => {
    const { aptos } = setup({
      transactions: {
        '300': approve(addr(0xa1)),
        '200': new Error('429'),
        '100': approve(addr(0xb2))
      },
      vaults: {
        [addr(0xa1)]: [addr(0x100)],
        [addr(0xb2)]: new Error('503')
      }
    });

    const result = await discoverMultisigAccounts({ aptos, owner: OWNER });

    expect(result.accounts.map((a) => a.toStringLong())).toEqual([addr(0xa1)]);
    expect(result.failedLookups).toBe(2);
  });

  it('stops when the signal is aborted', async () => {
    const { aptos } = setup({
      transactions: { '100': approve(addr(0xa1)) },
      vaults: { [addr(0xa1)]: [addr(0x100)] }
    });
    const controller = new AbortController();
    controller.abort();

    await expect(
      discoverMultisigAccounts({
        aptos,
        owner: OWNER,
        signal: controller.signal
      })
    ).rejects.toThrow();
  });
});
