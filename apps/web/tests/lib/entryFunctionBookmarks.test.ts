import { describe, it, expect, beforeEach } from 'vitest';
import { useEntryFunctionBookmarks } from '../../context/useEntryFunctionBookmarks';
import { getEntryFunctionDisplayName } from '../../lib/displayNames';

const store = useEntryFunctionBookmarks;

const VAULT_A = 'devnet:0x1';
const VAULT_B = 'testnet:0x2';
const TRANSFER = '0x1::aptos_account::transfer';
const TRANSFER_COINS = '0x1::aptos_account::transfer_coins';

describe('useEntryFunctionBookmarks', () => {
  beforeEach(() => {
    store.setState({ bookmarks: {} });
  });

  it('adds a bookmark scoped to a vault', () => {
    store.getState().addBookmark(VAULT_A, TRANSFER);

    const bookmarks = store.getState().getBookmarks(VAULT_A);
    expect(bookmarks).toHaveLength(1);
    expect(bookmarks[0]!.entryFunction).toBe(TRANSFER);
    expect(typeof bookmarks[0]!.createdAt).toBe('number');
  });

  it('does not add the same entry function twice', () => {
    store.getState().addBookmark(VAULT_A, TRANSFER);
    store.getState().addBookmark(VAULT_A, TRANSFER);

    expect(store.getState().getBookmarks(VAULT_A)).toHaveLength(1);
  });

  it('removes only the targeted bookmark', () => {
    store.getState().addBookmark(VAULT_A, TRANSFER);
    store.getState().addBookmark(VAULT_A, TRANSFER_COINS);

    store.getState().removeBookmark(VAULT_A, TRANSFER);

    const remaining = store.getState().getBookmarks(VAULT_A);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.entryFunction).toBe(TRANSFER_COINS);
  });

  it('isolates bookmarks between vaults', () => {
    store.getState().addBookmark(VAULT_A, TRANSFER);
    store.getState().addBookmark(VAULT_B, TRANSFER_COINS);

    expect(store.getState().getBookmarks(VAULT_A)).toHaveLength(1);
    expect(store.getState().getBookmarks(VAULT_A)[0]!.entryFunction).toBe(
      TRANSFER
    );
    expect(store.getState().getBookmarks(VAULT_B)[0]!.entryFunction).toBe(
      TRANSFER_COINS
    );
  });

  it('returns an empty list for an unknown vault', () => {
    expect(store.getState().getBookmarks('mainnet:0xdead')).toEqual([]);
  });
});

describe('getEntryFunctionDisplayName (bookmark label)', () => {
  it('uses the known display name when available', () => {
    expect(getEntryFunctionDisplayName(TRANSFER)).toBe('Transfer APT');
  });

  it('falls back to a shortened module::function for unknown functions', () => {
    const label = getEntryFunctionDisplayName(
      '0x867ed1f6bf916171b1de3ee92849b8978b7d1b9e0a8cc982a3d19d535dfd9c0c::my_module::do_thing'
    );
    expect(label).toContain('::my_module::do_thing');
    // The long address is truncated rather than shown in full.
    expect(label).not.toContain(
      '0x867ed1f6bf916171b1de3ee92849b8978b7d1b9e0a8cc982a3d19d535dfd9c0c'
    );
  });
});
