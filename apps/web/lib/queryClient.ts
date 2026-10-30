import { MutationCache, QueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/nextjs';
import { storageOptionsSerializers } from './storage';
import { hasWindow } from './utils';

export function createQueryClient() {
  return new QueryClient({
    // Cache callbacks still run when a mutation defines its own onError.
    mutationCache: new MutationCache({
      onError(error) {
        const exception =
          error instanceof Error
            ? error
            : new Error(
                typeof error === 'string'
                  ? error
                  : 'Mutation failed with an unknown error'
              );

        if (exception.message === 'User has rejected the request') return;

        Sentry.captureException(exception, {
          tags: { 'petra.source': 'mutation' }
        });
      }
    }),
    defaultOptions: {
      queries: {
        gcTime: 1000 * 60 * 60 * 24, // 24 hours
        enabled: hasWindow(),
        queryKeyHashFn: (queryKey) =>
          JSON.stringify(queryKey, storageOptionsSerializers.replacer)
      }
    }
  });
}
