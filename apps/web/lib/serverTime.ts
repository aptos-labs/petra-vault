// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import * as Sentry from '@sentry/nextjs';

export const isProduction = process.env.NODE_ENV === 'production';

// URL for an API that responds with the server-side value of Date.now().
const DATE_NOW_WORKER_URL = 'https://date-now.petra-wallet.workers.dev';

// Maximum allowed delta between server and client time, in milliseconds.
const MAX_DELTA = 24 * 60 * 60 * 1000;

/**
 * Expiration window for vault proposal transactions (votes, executes, and
 * removals), in seconds.
 *
 * A multisig action needs a human to review and sign in their wallet, and the
 * execute path adds a build + simulate round-trip on top, so the SDK / js-pro
 * default of 20s (`DEFAULT_TXN_EXP_SEC_FROM_NOW`) expires far too eagerly and
 * surfaces as `TRANSACTION_EXPIRED`. A wider window is safe: the on-chain
 * proposal itself never expires — only the wrapper transaction that resolves
 * it — so the cost of a longer window is at worst a slightly staler gas
 * estimate, well within any mempool time-to-live limit.
 */
export const VAULT_TXN_EXP_SEC_FROM_NOW = 120;

// The difference between the server time and the client time, in milliseconds.
let serverTimeDelta: number | undefined;

async function getServerTimeDelta() {
  // The request cannot be cached (otherwise we would receive a stale timestamp).
  const requestTime = Date.now();
  const response = await fetch(`${DATE_NOW_WORKER_URL}?${requestTime}`);
  const responseTime = Date.now();

  if (!response.ok) {
    throw new Error('Failed to fetch server time');
  }

  const data = await response.json();

  if (!/^\d{13}$/.test(data)) {
    throw new Error('Server did not respond with a timestamp');
  }

  // Assume that the server generated its time halfway between request sent
  // and response received.
  const serverTime = Number(data);
  const clientTime = (requestTime + responseTime) / 2;
  const newDelta = serverTime - clientTime;

  if (Number.isNaN(newDelta)) {
    throw new Error('newDelta is NaN');
  } else if (Math.abs(newDelta) > MAX_DELTA) {
    throw new Error('MAX_DELTA exceeded');
  }

  return newDelta;
}

/**
 * Whether the server time has been synchronized at least once. Until it has,
 * {@link getServerTime} falls back to the local clock, which may be skewed —
 * the exact condition that makes transactions build already-expired.
 */
export function isTimeSynchronized() {
  return serverTimeDelta !== undefined;
}

/**
 * Synchronize local time with server time, retrying a few times before giving
 * up.
 *
 * The server time delta required to compute the current server time is stored
 * as a module variable. On persistent failure we keep the last known delta (or
 * the local clock if we never synced) and report to Sentry instead of failing
 * silently — an unsynced, skewed clock is what causes spurious
 * `TRANSACTION_EXPIRED` errors, so it must be observable.
 *
 * @param attempts - Number of tries before giving up.
 * @returns The synchronized delta in ms, or `undefined` if never synced.
 */
export async function synchronizeTime(attempts = 3) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      serverTimeDelta = await getServerTimeDelta();
      return serverTimeDelta;
    } catch (error) {
      if (attempt < attempts - 1) {
        // Back off briefly before retrying.
        await new Promise((resolve) =>
          setTimeout(resolve, 500 * (attempt + 1))
        );
        continue;
      }

      Sentry.captureException(error, {
        tags: { feature: 'server-time-sync' },
        extra: { synchronized: isTimeSynchronized(), attempts }
      });

      if (!isProduction) {
        throw error;
      }
    }
  }

  return serverTimeDelta;
}

/**
 * Returns the current server time in milliseconds.
 *
 * A previous call to {@link synchronizeTime} will ensure the time is
 * synchronized with the server.
 */
export function getServerTime() {
  return Date.now() + (serverTimeDelta ?? 0);
}

/**
 * Get a `Date` object for the current server time
 */
export function getServerDate() {
  return new Date(getServerTime());
}

/**
 * Absolute expiration timestamp (unix seconds) for a vault proposal
 * transaction, based on the synchronized server time. Pass this as
 * `options.expireTimestamp` when building or submitting votes, executes, and
 * removals so every path shares the same generous, clock-safe window.
 */
export function getVaultExpirationTimestamp() {
  return Math.floor(getServerTime() / 1000) + VAULT_TXN_EXP_SEC_FROM_NOW;
}
