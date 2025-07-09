'use client';

import TransactionRow from '@/components/TransactionRow';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import VaultDetailsPendingTransactions from '@/components/VaultDetailsPendingTransactions';
import { useActiveVault } from '@/context/ActiveVaultProvider';
import useMultisigExecutionEvents, {
  ExecutionEvent
} from '@/hooks/useMultisigExecutionEvents';
import { hasWindow } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useMemo } from 'react';
import { Network } from '@aptos-labs/ts-sdk';

export default function VaultTransactionsPage() {
  const { vaultAddress, network, isOwner } = useActiveVault();
  const {
    data: executionEvents,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useMultisigExecutionEvents({
    address: vaultAddress,
    network: { network },
    refetchInterval: 10000
  });

  const groupedTransactions = useMemo(() => {
    if (!executionEvents) return undefined;

    // Sort transactions by timestamp in descending order (newest first)
    const sortedEvents = executionEvents.pages.flat().sort((a, b) => {
      const timestampA = a.transaction?.timestamp
        ? Number(a.transaction.timestamp) / 1000
        : 0;
      const timestampB = b.transaction?.timestamp
        ? Number(b.transaction.timestamp) / 1000
        : 0;
      return timestampB - timestampA;
    });

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

  return (
    <div className="h-full flex flex-col pb-12">
      {isOwner && (
        <>
          <br />
          <VaultDetailsPendingTransactions />
        </>
      )}

      <br />

      <AnimatePresence initial={false} mode="wait">
        {isLoading || !hasWindow() ? (
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
          <div className="text-center py-16 font-display text-muted-foreground bg-secondary border border-dashed rounded-lg">
            Historical transactions are not available on Devnet.
          </div>
        ) : groupedTransactions &&
          Object.entries(groupedTransactions).length === 0 ? (
          <motion.div
            key="no-transactions"
            className="text-center py-16 font-display text-muted-foreground bg-secondary border border-dashed rounded-lg"
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
                          key={event.version}
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
