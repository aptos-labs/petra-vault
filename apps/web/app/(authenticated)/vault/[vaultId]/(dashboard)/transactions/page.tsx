'use client';

import TransactionRow from '@/components/TransactionRow';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import VaultDetailsPendingTransactions from '@/components/VaultDetailsPendingTransactions';
import { useActiveVault } from '@/context/ActiveVaultProvider';
import useMultisigExecutionEvents, {
  ExecutionEvent
} from '@/hooks/useMultisigExecutionEvents';
import { motion, AnimatePresence } from 'motion/react';
import { useMemo } from 'react';
import { Network } from '@aptos-labs/ts-sdk';
import { useAccount } from '@aptos-labs/react';
import { useSearchParams } from 'next/navigation';
import { isDevelopment } from '@/lib/development';
import { getHistoryViewState } from '@/lib/historyViewState';

export default function VaultTransactionsPage() {
  const account = useAccount();
  const searchParams = useSearchParams();

  const { vaultAddress, network, isOwner } = useActiveVault();
  const {
    data: executionEvents,
    isLoading,
    error,
    refetch,
    isRefetching,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError
  } = useMultisigExecutionEvents({
    address: vaultAddress,
    network: { network }
  });

  const groupedTransactions = useMemo(() => {
    if (!executionEvents) return undefined;

    // Pages are ordered by descending version (newest first), and each version
    // appears in exactly one page since paging uses a version cursor.
    const sortedEvents = executionEvents.pages.flatMap((page) => page.events);

    // Group by month
    const groupedByMonth: Record<string, ExecutionEvent[]> = {};

    sortedEvents.forEach((event) => {
      if (!event.transaction?.timestamp) return;

      const date = new Date(
        Math.floor(Number(event.transaction.timestamp) / 1000)
      );
      const monthYear = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;

      if (!groupedByMonth[monthYear]) {
        groupedByMonth[monthYear] = [];
      }

      groupedByMonth[monthYear].push(event);
    });

    return groupedByMonth;
  }, [executionEvents]);

  const asOwnerFlag = searchParams.get('as_owner') === '1';
  const hasCachedEvents = (executionEvents?.pages ?? []).some(
    (page) => page.events.length > 0
  );
  const viewState = getHistoryViewState({
    hasData: Boolean(executionEvents),
    eventCount: executionEvents?.pages.flatMap((p) => p.events).length ?? 0,
    hasNextPage,
    isError,
    isFetchNextPageError
  });

  return (
    <div className="h-full flex flex-col pb-12">
      {(isOwner || isDevelopment || asOwnerFlag) && (
        <>
          <br />
          <VaultDetailsPendingTransactions />
        </>
      )}

      <br />

      <AnimatePresence initial={false} mode="wait">
        {isLoading || !account ? (
          <motion.div
            key="skeleton-loader"
            className="flex flex-col gap-4"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
              >
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="text-right space-y-2">
                  <Skeleton className="h-4 w-20 ml-auto" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : network === Network.DEVNET ? (
          <div className="text-center py-16 font-display text-muted-foreground bg-secondary rounded-sm">
            Historical transactions are not available on Devnet.
          </div>
        ) : viewState === 'error' ? (
          <div className="flex flex-col items-center gap-4 text-center py-16 font-display text-muted-foreground bg-secondary rounded-sm">
            <span>
              Failed to load transaction history:{' '}
              {error instanceof Error ? error.message : 'Unknown error'}
            </span>
            <Button variant="secondary" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : viewState === 'empty' ? (
          <motion.div
            key="no-transactions"
            className="text-center py-16 font-display text-muted-foreground bg-secondary rounded-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            No transactions found
          </motion.div>
        ) : (
          <motion.div
            key="transactions-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {viewState === 'stale' && (
              <div
                role="alert"
                className="flex flex-wrap items-center justify-between gap-4 mb-6 px-4 py-3 rounded-sm bg-secondary font-display text-destructive-foreground"
              >
                <span>
                  Failed to refresh transaction history
                  {executionEvents && !hasCachedEvents
                    ? ', so it is unknown whether there are any transactions'
                    : '; showing previously loaded transactions'}
                  : {error instanceof Error ? error.message : 'Unknown error'}
                </span>
                <Button
                  variant="secondary"
                  onClick={() => refetch()}
                  isLoading={isRefetching}
                >
                  Retry
                </Button>
              </div>
            )}
            {groupedTransactions &&
              Object.entries(groupedTransactions).map(([monthYear, events]) => (
                <div key={monthYear} className="mb-8">
                  <h3 className="text-lg font-semibold mb-4 font-display">
                    {monthYear}
                  </h3>
                  <div className="flex flex-col gap-4 -translate-x-4">
                    {events.map((event, index) => {
                      return (
                        <motion.div
                          key={`${event.version}:${event.sequenceNumber}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="w-full"
                          transition={{
                            duration: 0.3,
                            delay: Math.min(index * 0.05, 0.6),
                            ease: 'easeOut'
                          }}
                        >
                          <TransactionRow
                            transaction={event.transaction}
                            executionEvent={event}
                            network={network}
                          />
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            {isFetchNextPageError && (
              <div className="text-center pb-4 font-display text-destructive-foreground">
                Failed to load more transactions:{' '}
                {error instanceof Error ? error.message : 'Unknown error'}
              </div>
            )}
            {(hasNextPage || hasCachedEvents || viewState !== 'stale') && (
              <motion.div
                className="flex justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (hasNextPage) fetchNextPage();
                  }}
                  disabled={!hasNextPage}
                  isLoading={isFetchingNextPage}
                >
                  {hasNextPage
                    ? 'Load more transactions'
                    : 'No more transactions to load'}
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
