import {
  AccountAddress,
  Aptos,
  TransactionResponse,
  TransactionResponseType
} from '@aptos-labs/ts-sdk';
import { isWriteSetChangeWriteResource } from '@/lib/transactions';

/**
 * Multisig ("vault") discovery built exclusively on standard Aptos APIs:
 *
 * 1. The Aptos indexer lists the transactions an account *sent* that called
 *    `0x1::multisig_account::*` (creating a vault, proposing, approving, ...).
 * 2. The fullnode returns each of those transactions so we can read which
 *    multisig address it targeted.
 * 3. The fullnode returns the `MultisigAccount` resource of every candidate so
 *    we can verify that it really is a multisig and that the account is
 *    currently one of its owners.
 *
 * Limitations (surfaced to users by the onboarding UI):
 * - An owner who has never sent a multisig transaction (e.g. was only just
 *   added by a co-owner) leaves no trace that standard APIs can query, so those
 *   vaults can only be imported manually by address.
 * - Only the most recent `DISCOVERY_MAX_PAGES * DISCOVERY_PAGE_SIZE` multisig
 *   transactions are scanned.
 */

export const MULTISIG_ACCOUNT_RESOURCE_TYPE =
  '0x1::multisig_account::MultisigAccount';

const MULTISIG_FUNCTION_PREFIX = '0x1::multisig_account::';

/**
 * Entry functions that create a multisig. Their first argument is not the
 * multisig address (or, for `create_with_existing_account*`, the address is
 * already reported through the `MultisigAccount` resource write), so they are
 * resolved from the transaction's write set instead.
 */
const MULTISIG_CREATION_FUNCTIONS = new Set([
  'create',
  'create_with_owners',
  'create_with_existing_account',
  'create_with_existing_account_and_revoke_auth_key',
  'create_with_owners_then_remove_bootstrapper'
]);

export const DISCOVERY_PAGE_SIZE = 100;
export const DISCOVERY_MAX_PAGES = 3;
export const DISCOVERY_CONCURRENCY = 8;

export type DiscoveryClient = Pick<
  Aptos,
  'queryIndexer' | 'getTransactionByVersion' | 'getAccountResource'
>;

export interface MultisigDiscoveryResult {
  /** Multisig accounts that are verified on-chain to currently list the owner. */
  accounts: AccountAddress[];
  /** True when the owner has more multisig activity than was scanned. */
  truncated: boolean;
  /** Number of lookups (transactions or candidates) that failed and were skipped. */
  failedLookups: number;
}

export type MultisigOwnershipResult =
  | { status: 'owner'; owners: AccountAddress[] }
  | { status: 'not-owner'; owners: AccountAddress[] }
  | { status: 'not-multisig' };

/**
 * Parses user-entered vault address text. Returns `undefined` for anything that
 * is not a valid account address.
 */
export function parseVaultAddress(input: string): AccountAddress | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  const prefixed = trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`;
  try {
    return AccountAddress.from(prefixed);
  } catch {
    return undefined;
  }
}

const isValidAddress = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.startsWith('0x') &&
  AccountAddress.isValid({ input: value }).valid;

/**
 * Extracts every address that a transaction identifies as a multisig account:
 * - `MultisigAccount` resources written (vault creation),
 * - the first argument of `0x1::multisig_account::*` calls (propose / vote / ...),
 * - the `multisig_address` of multisig payloads (execution).
 *
 * The result is only a set of *candidates*; they must still be verified.
 */
export function getMultisigAddressesFromTransaction(
  transaction: TransactionResponse
): string[] {
  if (transaction.type !== TransactionResponseType.User) return [];

  const addresses = new Set<string>();

  const { payload } = transaction;
  if (
    'multisig_address' in payload &&
    isValidAddress(payload.multisig_address)
  ) {
    addresses.add(AccountAddress.from(payload.multisig_address).toStringLong());
  } else if (
    'function' in payload &&
    typeof payload.function === 'string' &&
    payload.function.startsWith(MULTISIG_FUNCTION_PREFIX)
  ) {
    const functionName = payload.function.slice(
      MULTISIG_FUNCTION_PREFIX.length
    );
    const firstArgument = payload.arguments?.[0];
    if (
      !MULTISIG_CREATION_FUNCTIONS.has(functionName) &&
      isValidAddress(firstArgument)
    ) {
      addresses.add(AccountAddress.from(firstArgument).toStringLong());
    }
  }

  for (const change of transaction.changes) {
    if (
      isWriteSetChangeWriteResource(change) &&
      change.data.type === MULTISIG_ACCOUNT_RESOURCE_TYPE &&
      isValidAddress(change.address)
    ) {
      addresses.add(AccountAddress.from(change.address).toStringLong());
    }
  }

  return [...addresses];
}

const NOT_FOUND_ERROR_CODES = ['resource_not_found', 'account_not_found'];

/** Matches the fullnode's 404 for a missing resource (`AptosApiError`). */
const isResourceNotFoundError = (error: unknown) => {
  if (
    typeof error !== 'object' ||
    error === null ||
    !('status' in error) ||
    error.status !== 404 ||
    !('data' in error) ||
    typeof error.data !== 'object' ||
    error.data === null ||
    !('error_code' in error.data)
  ) {
    return false;
  }
  return NOT_FOUND_ERROR_CODES.includes(String(error.data.error_code));
};

/**
 * Reads the current owners of a multisig account from the fullnode. Returns
 * `null` when the address has no multisig resource. Any other failure (network,
 * rate limit, server error) is thrown so it is never mistaken for "not a vault".
 */
export async function fetchMultisigOwners(
  aptos: Pick<Aptos, 'getAccountResource'>,
  address: AccountAddress
): Promise<AccountAddress[] | null> {
  try {
    const resource = await aptos.getAccountResource<{ owners?: string[] }>({
      accountAddress: address,
      resourceType: MULTISIG_ACCOUNT_RESOURCE_TYPE
    });
    if (!Array.isArray(resource.owners)) {
      throw new Error(
        `Unexpected ${MULTISIG_ACCOUNT_RESOURCE_TYPE} resource at ${address.toString()}: missing owners`
      );
    }
    return resource.owners.map((owner) => AccountAddress.from(owner));
  } catch (error) {
    if (isResourceNotFoundError(error)) return null;
    throw error;
  }
}

/**
 * Verifies on-chain that `vault` is a multisig account and whether `account` is
 * one of its current owners. Throws when the lookup itself fails.
 */
export async function verifyMultisigOwnership(
  aptos: Pick<Aptos, 'getAccountResource'>,
  vault: AccountAddress,
  account: AccountAddress
): Promise<MultisigOwnershipResult> {
  const owners = await fetchMultisigOwners(aptos, vault);
  if (!owners) return { status: 'not-multisig' };
  return owners.some((owner) => owner.equals(account))
    ? { status: 'owner', owners }
    : { status: 'not-owner', owners };
}

const OWNER_MULTISIG_TRANSACTIONS_QUERY = `
  query OwnerMultisigTransactions($address: String!, $limit: Int!, $offset: Int!) {
    account_transactions(
      where: {
        account_address: { _eq: $address }
        user_transaction: {
          entry_function_id_str: { _like: "${MULTISIG_FUNCTION_PREFIX}%" }
        }
      }
      order_by: { transaction_version: desc }
      limit: $limit
      offset: $offset
    ) {
      transaction_version
    }
  }
`;

interface OwnerMultisigTransactionsQuery {
  account_transactions: { transaction_version: number | string }[];
}

interface OwnerMultisigTransactionVersions {
  /** Versions of the owner's multisig transactions, newest first. */
  versions: string[];
  /** True when older multisig transactions exist beyond the scanned window. */
  truncated: boolean;
}

async function fetchOwnerMultisigTransactionVersions(
  aptos: Pick<Aptos, 'queryIndexer'>,
  owner: AccountAddress
): Promise<OwnerMultisigTransactionVersions> {
  const versions: string[] = [];
  let truncated = false;

  for (let page = 0; page < DISCOVERY_MAX_PAGES; page += 1) {
    const { account_transactions: rows } =
      await aptos.queryIndexer<OwnerMultisigTransactionsQuery>({
        query: {
          query: OWNER_MULTISIG_TRANSACTIONS_QUERY,
          variables: {
            // The indexer only matches the long, zero-padded address form.
            address: owner.toStringLong(),
            limit: DISCOVERY_PAGE_SIZE,
            offset: page * DISCOVERY_PAGE_SIZE
          }
        }
      });

    versions.push(...rows.map((row) => String(row.transaction_version)));

    if (rows.length < DISCOVERY_PAGE_SIZE) break;
    if (page === DISCOVERY_MAX_PAGES - 1) truncated = true;
  }

  return { versions, truncated };
}

/** Runs `fn` over `items` with bounded concurrency, preserving input order. */
async function mapSettled<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
  signal?: AbortSignal
): Promise<PromiseSettledResult<R>[]> {
  const results = new Array<PromiseSettledResult<R>>(items.length);
  let next = 0;

  const worker = async () => {
    while (next < items.length) {
      signal?.throwIfAborted();
      const index = next;
      next += 1;
      try {
        results[index] = {
          status: 'fulfilled',
          value: await fn(items[index] as T)
        };
      } catch (reason) {
        if (signal?.aborted) throw reason;
        results[index] = { status: 'rejected', reason };
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );
  return results;
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/**
 * Discovers multisig accounts that `owner` is verifiably a current owner of.
 *
 * Throws when discovery cannot produce a trustworthy answer (the indexer query
 * fails, or every lookup fails). Individual failed lookups are counted in
 * `failedLookups` so callers can warn that the list may be incomplete.
 */
export async function discoverMultisigAccounts({
  aptos,
  owner,
  signal
}: {
  aptos: DiscoveryClient;
  owner: AccountAddress;
  signal?: AbortSignal;
}): Promise<MultisigDiscoveryResult> {
  let page: OwnerMultisigTransactionVersions;
  try {
    page = await fetchOwnerMultisigTransactionVersions(aptos, owner);
  } catch (error) {
    throw new Error(
      `Could not query the Aptos indexer for multisig activity: ${errorMessage(error)}`,
      { cause: error }
    );
  }

  let failedLookups = 0;

  const transactionResults = await mapSettled(
    page.versions,
    DISCOVERY_CONCURRENCY,
    (version) =>
      aptos.getTransactionByVersion({ ledgerVersion: BigInt(version) }),
    signal
  );

  const candidates = new Set<string>();
  let firstTransactionFailure: PromiseRejectedResult | undefined;
  for (const result of transactionResults) {
    if (result.status === 'rejected') {
      failedLookups += 1;
      firstTransactionFailure ??= result;
      continue;
    }
    for (const address of getMultisigAddressesFromTransaction(result.value)) {
      candidates.add(address);
    }
  }
  if (firstTransactionFailure && failedLookups === page.versions.length) {
    throw new Error(
      `Could not load your multisig transactions from the Aptos node: ${errorMessage(firstTransactionFailure.reason)}`,
      { cause: firstTransactionFailure.reason }
    );
  }

  const candidateList = [...candidates];
  const verificationResults = await mapSettled(
    candidateList,
    DISCOVERY_CONCURRENCY,
    (address) =>
      verifyMultisigOwnership(aptos, AccountAddress.from(address), owner),
    signal
  );

  const accounts: AccountAddress[] = [];
  let firstVerificationFailure: PromiseRejectedResult | undefined;
  let failedVerifications = 0;
  for (const [index, result] of verificationResults.entries()) {
    if (result.status === 'rejected') {
      failedVerifications += 1;
      firstVerificationFailure ??= result;
    } else if (result.value.status === 'owner') {
      accounts.push(AccountAddress.from(candidateList[index] as string));
    }
  }
  failedLookups += failedVerifications;
  if (
    firstVerificationFailure &&
    failedVerifications === candidateList.length
  ) {
    throw new Error(
      `Could not verify vault ownership with the Aptos node: ${errorMessage(firstVerificationFailure.reason)}`,
      { cause: firstVerificationFailure.reason }
    );
  }

  return { accounts, truncated: page.truncated, failedLookups };
}
