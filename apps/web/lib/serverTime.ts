// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

export const isProduction = process.env.NODE_ENV === 'production';

// URL for an API that responds with the server-side value of Date.now().
const DATE_NOW_WORKER_URL = 'https://date-now.petra-wallet.workers.dev';

// Maximum allowed delta between server and client time, in milliseconds.
const MAX_DELTA = 24 * 60 * 60 * 1000;

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
 * Synchronize local time with server time.
 *
 * The server time delta required to compute the current server time
 * is stored as a module variable.
 */
export async function synchronizeTime() {
  try {
    serverTimeDelta = await getServerTimeDelta();
  } catch (error) {
    if (!isProduction) {
      throw error;
    }
  }
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
