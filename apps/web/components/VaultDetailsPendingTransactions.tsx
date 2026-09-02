'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from './ui/card';
import { isAddress } from '@/lib/address';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import Link from 'next/link';
import useMultisigPendingTransactions from '@/hooks/useMultisigPendingTransactions';
import useMultisigSequenceNumber from '@/hooks/useMultisigSequenceNumber';
import useBulkVoteProposals from '@/hooks/useBulkVoteProposals';
import { useResourceType } from '@aptos-labs/react';
import { useActiveVault } from '@/context/ActiveVaultProvider';
import { PendingTransactionRow } from './PendingTransactionRow';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useMemo, useState } from 'react';

export default function VaultDetailsPendingTransactions() {
  const { vaultAddress, network, id, isOwner } = useActiveVault();

  const [selected, setSelected] = useState<Set<number>>(new Set());

  const { isError } = useResourceType({
    accountAddress: vaultAddress,
    resourceType: '0x1::multisig_account::MultisigAccount',
    network: { network },
    retry: 0
  });

  const { data: pendingTransactions, isLoading: isPendingTransactionsLoading } =
    useMultisigPendingTransactions({
      address: vaultAddress,
      network: { network },
      refetchInterval: 10 * 1000
    });

  const { data: sequenceNumber, isLoading: isSequenceNumberLoading } =
    useMultisigSequenceNumber({
      address: vaultAddress,
      network: { network }
    });

  const isLoading = isPendingTransactionsLoading || isSequenceNumberLoading;

  const isEmpty =
    !pendingTransactions?.[0] ||
    sequenceNumber === undefined ||
    pendingTransactions?.length === 0;

  const { bulkVote, isPending: isBulkVotePending } = useBulkVoteProposals({
    vaultAddress,
    network,
    onVoted: (voted) =>
      setSelected((prev) => {
        const next = new Set(prev);
        voted.forEach((n) => next.delete(n));
        return next;
      })
  });

  const allSequenceNumbers = useMemo(
    () =>
      sequenceNumber !== undefined && pendingTransactions
        ? pendingTransactions.map((_, index) => sequenceNumber + 1 + index)
        : [],
    [pendingTransactions, sequenceNumber]
  );

  const toggle = useCallback((proposalSequenceNumber: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(proposalSequenceNumber)) {
        next.delete(proposalSequenceNumber);
      } else {
        next.add(proposalSequenceNumber);
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  const selectAll = useCallback(
    () => setSelected(new Set(allSequenceNumbers)),
    [allSequenceNumbers]
  );

  const allSelected =
    allSequenceNumbers.length > 0 &&
    allSequenceNumbers.every((n) => selected.has(n));

  const showBulkActions = isOwner && selected.size > 0;

  return (
    <AnimatePresence mode="wait" initial={false}>
      {isError ? (
        <motion.div
          key="error"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.3 }}
        >
          <div>Multisig account not found</div>
        </motion.div>
      ) : !isAddress(vaultAddress) ? (
        <motion.div
          key="invalid"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.3 }}
        >
          <div>Invalid vault address</div>
        </motion.div>
      ) : isLoading ? null : isEmpty ? (
        <motion.div
          key="empty"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader className="text-center py-2 md:text-left md:py-0">
              <CardTitle>Pending Transactions</CardTitle>
              <CardDescription data-testid="pending-transactions-empty">
                No pending transactions found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full md:w-auto">
                <Link href={`/vault/${id}/proposal/create`}>
                  Create Proposal
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          key="loaded"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 w-full gap-2">
              <div>
                <CardTitle>Pending Transactions</CardTitle>
                <CardDescription>
                  {pendingTransactions?.length} transaction
                  {pendingTransactions?.length !== 1 ? 's' : ''} pending
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {showBulkActions && (
                  <>
                    <span className="hidden text-sm text-muted-foreground md:inline">
                      {selected.size} selected
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      isLoading={isBulkVotePending}
                      onClick={() => bulkVote(true, [...selected])}
                      data-testid="bulk-approve-button"
                    >
                      Approve ({selected.size})
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      isLoading={isBulkVotePending}
                      onClick={() => bulkVote(false, [...selected])}
                      data-testid="bulk-reject-button"
                    >
                      Reject ({selected.size})
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isBulkVotePending}
                      onClick={clear}
                      data-testid="bulk-selection-clear"
                    >
                      Clear
                    </Button>
                  </>
                )}
                <Button asChild size="sm">
                  <Link href={`/vault/${id}/proposal/create`}>
                    Create Proposal
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="w-full p-0 px-0 md:px-2">
              {isOwner && (
                <div className="flex items-center gap-2 pb-2">
                  <Checkbox
                    className="ml-2 shrink-0 md:ml-4"
                    checked={
                      allSelected
                        ? true
                        : selected.size > 0
                          ? 'indeterminate'
                          : false
                    }
                    disabled={isBulkVotePending}
                    onCheckedChange={(checked) =>
                      checked ? selectAll() : clear()
                    }
                    data-testid="pending-transactions-select-all"
                    aria-label="Select all pending transactions"
                  />
                  <span className="text-xs text-muted-foreground">
                    Select all
                  </span>
                </div>
              )}
              <div className="space-y-4 w-full">
                {pendingTransactions.map((tx, index) => {
                  const proposalSequenceNumber = sequenceNumber + 1 + index;
                  return (
                    <motion.div
                      key={proposalSequenceNumber}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.2,
                        delay: index * 0.1
                      }}
                      data-testid={`pending-transaction-${proposalSequenceNumber}`}
                      className="flex items-center gap-2"
                    >
                      {isOwner && (
                        <Checkbox
                          className="ml-2 shrink-0 md:ml-4"
                          checked={selected.has(proposalSequenceNumber)}
                          disabled={isBulkVotePending}
                          onCheckedChange={() => toggle(proposalSequenceNumber)}
                          data-testid={`pending-transaction-checkbox-${proposalSequenceNumber}`}
                          aria-label={`Select proposal ${proposalSequenceNumber}`}
                        />
                      )}
                      <Link
                        className="flex-1"
                        href={`/vault/${id}/proposal/pending/${proposalSequenceNumber}`}
                      >
                        <PendingTransactionRow
                          transaction={tx}
                          sequenceNumber={proposalSequenceNumber}
                          isNext={sequenceNumber + 1 === proposalSequenceNumber}
                        />
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
