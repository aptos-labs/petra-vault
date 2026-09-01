import { useCallback, useState } from 'react';
import { Network } from '@aptos-labs/ts-sdk';
import { useClients, useSignAndSubmitTransaction } from '@aptos-labs/react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createRangeVoteTransactionPayloadData,
  getContiguousRanges
} from '@/lib/payloads';
import useMultisigPendingTransactions from './useMultisigPendingTransactions';
import useMultisigSequenceNumber from './useMultisigSequenceNumber';
import useAnalytics from './useAnalytics';

export interface UseBulkVoteProposalsOptions {
  vaultAddress: string;
  network: Network;
  /**
   * Called with the sequence numbers that were successfully voted on. Fires on
   * full success and on partial success (some runs committed before a later one
   * failed), so callers can drop just those from the selection and leave the
   * rest for a retry.
   */
  onVoted?: (votedSequenceNumbers: number[]) => void;
}

/**
 * Approve or reject multiple pending proposals in a single flow. Selected
 * sequence numbers are collapsed into contiguous runs (see
 * {@link createRangeVoteTransactionPayloadData}) and submitted sequentially so
 * the owner account's sequence number advances correctly between transactions.
 *
 * Runs commit independently: if a later run fails, the earlier runs have already
 * voted on-chain, so we report exactly how many proposals succeeded rather than
 * treating the whole batch as a failure.
 */
export default function useBulkVoteProposals({
  vaultAddress,
  network,
  onVoted
}: UseBulkVoteProposalsOptions) {
  const trackEvent = useAnalytics();
  const queryClient = useQueryClient();
  const { aptos } = useClients();
  const { signAndSubmitTransactionAsync } = useSignAndSubmitTransaction();

  const [isPending, setIsPending] = useState(false);

  const { data: sequenceNumber } = useMultisigSequenceNumber({
    address: vaultAddress,
    network: { network }
  });

  const { data: pendingTransactions } = useMultisigPendingTransactions({
    address: vaultAddress,
    network: { network }
  });

  const bulkVote = useCallback(
    async (approve: boolean, requestedSequenceNumbers: number[]) => {
      if (sequenceNumber === undefined || !pendingTransactions) return;

      // The sequence numbers that are actually pending right now. Guards against
      // a proposal being executed or removed between selection and submission.
      const validSequenceNumbers = new Set(
        pendingTransactions.map((_, index) => sequenceNumber + 1 + index)
      );

      const sequenceNumbers = requestedSequenceNumbers
        .filter((n) => validSequenceNumbers.has(n))
        .sort((a, b) => a - b);

      if (sequenceNumbers.length === 0) return;

      const ranges = getContiguousRanges(sequenceNumbers);

      setIsPending(true);

      const voted: number[] = [];
      let runsSubmitted = 0;
      let failed = false;

      try {
        for (const [start, end] of ranges) {
          const { hash } = await signAndSubmitTransactionAsync({
            data: createRangeVoteTransactionPayloadData({
              vaultAddress,
              startSequenceNumber: start,
              endSequenceNumber: end,
              approve
            })
          });
          await aptos.waitForTransaction({ transactionHash: hash });

          for (let n = start; n <= end; n += 1) voted.push(n);
          runsSubmitted += 1;
        }
      } catch {
        failed = true;
      }

      const action = approve ? 'approve' : 'reject';

      if (voted.length > 0) {
        trackEvent('bulk_vote_proposals', {
          action,
          count: voted.length,
          transactions: runsSubmitted
        });
      }

      if (!failed) {
        toast.success(
          `${approve ? 'Approved' : 'Rejected'} ${voted.length} proposal${
            voted.length === 1 ? '' : 's'
          }!`
        );
      } else if (voted.length > 0) {
        toast.warning(
          `${approve ? 'Approved' : 'Rejected'} ${voted.length} of ${
            sequenceNumbers.length
          } proposals. The rest failed — please try again.`
        );
      } else {
        toast.error(
          `There was an issue ${
            approve ? 'approving' : 'rejecting'
          } the selected proposals. Please try again.`
        );
      }

      if (voted.length > 0) onVoted?.(voted);

      await queryClient.invalidateQueries();
      setIsPending(false);
    },
    [
      aptos,
      onVoted,
      pendingTransactions,
      queryClient,
      sequenceNumber,
      signAndSubmitTransactionAsync,
      trackEvent,
      vaultAddress
    ]
  );

  return { bulkVote, isPending };
}
