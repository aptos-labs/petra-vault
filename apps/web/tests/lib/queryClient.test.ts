import { afterEach, describe, expect, it, vi } from 'vitest';
import * as Sentry from '@sentry/nextjs';
import { createQueryClient } from '../../lib/queryClient';

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));

afterEach(() => vi.clearAllMocks());

describe('mutation error reporting', () => {
  it.each([false, true])(
    'reports string wallet errors (local onError: %s)',
    async (localHandler) => {
      const message =
        "Cannot read properties of undefined (reading 'deserialize')";
      const onError = vi.fn();

      await rejectMutation(message, localHandler ? onError : undefined);

      expect(onError).toHaveBeenCalledTimes(localHandler ? 1 : 0);
      expect(Sentry.captureException).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ message }),
        { tags: { 'petra.source': 'mutation' } }
      );
      expect(
        vi.mocked(Sentry.captureException).mock.calls[0]?.[0]
      ).toBeInstanceOf(Error);
    }
  );

  it('preserves the original Error and stack', async () => {
    const error = new TypeError('Transaction could not be decoded');
    const stack = error.stack;

    await rejectMutation(error, vi.fn());

    expect(Sentry.captureException).toHaveBeenCalledExactlyOnceWith(error, {
      tags: { 'petra.source': 'mutation' }
    });
    expect(error.stack).toBe(stack);
  });

  it.each([
    'User has rejected the request',
    new Error('User has rejected the request')
  ])('does not report a normal wallet cancellation: %s', async (error) => {
    await rejectMutation(error);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('does not attach unknown error data or mutation arguments', async () => {
    await rejectMutation({ transaction: 'private transaction data' });

    expect(Sentry.captureException).toHaveBeenCalledExactlyOnceWith(
      new Error('Mutation failed with an unknown error'),
      { tags: { 'petra.source': 'mutation' } }
    );
  });
});

async function rejectMutation(error: unknown, onError?: () => void) {
  const client = createQueryClient();
  const mutation = client.getMutationCache().build(client, {
    mutationFn: async (_variables: { transaction: string }) => {
      throw error;
    },
    ...(onError && { onError })
  });

  try {
    await expect(
      mutation.execute({ transaction: 'private transaction data' })
    ).rejects.toBe(error);
  } finally {
    client.clear();
  }
}
