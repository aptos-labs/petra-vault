import { useCallback, useState } from 'react';
import {
  AccountAddress,
  buildTransaction,
  DEFAULT_TXN_EXP_SEC_FROM_NOW,
  Deserializer,
  Hex,
  MultiSig,
  MultiSigTransactionPayload,
  Network,
  TransactionPayloadEntryFunction,
  TransactionPayloadMultiSig
} from '@aptos-labs/ts-sdk';
import {
  useAccount,
  useClients,
  useSignAndSubmitTransaction
} from '@aptos-labs/react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createRemoveRejectedTransactionPayloadData } from '@/lib/payloads';
import useAnalytics from './useAnalytics';

export interface BulkExecutableProposal {
  sequenceNumber: number;
  payload: string;
}

export interface UseBulkResolveProposalsOptions {
  vaultAddress: string;
  network: Network;
  /** Called after at least one proposal was executed or removed. */
  onResolved?: () => void;
}

/**
 * Bulk-resolve the front of the multisig queue: execute the ready-to-execute
 * prefix or remove the fully-rejected prefix.
 *
 * Approved transactions can only be executed one at a time and strictly in
 * order — there is no batch-execute entry function, and each execution advances
 * `last_resolved_sequence_number` to unblock the next — so `executeReady`
 * simulates and submits them sequentially, stopping (and reporting partial
 * progress) on the first failure.
 *
 * Rejected transactions do have a batch entry function, so `removeRejected`
 * clears the whole rejected prefix in a single transaction.
 */
export default function useBulkResolveProposals({
  vaultAddress,
  network,
  onResolved
}: UseBulkResolveProposalsOptions) {
  const account = useAccount();
  const trackEvent = useAnalytics();
  const queryClient = useQueryClient();
  const { aptos, client } = useClients();
  const { signAndSubmitTransactionAsync } = useSignAndSubmitTransaction();

  const [isPending, setIsPending] = useState(false);

  const executeReady = useCallback(
    async (proposals: BulkExecutableProposal[]) => {
      if (!account || proposals.length === 0) return;

      setIsPending(true);

      const executed: number[] = [];
      let failed = false;

      try {
        for (const { sequenceNumber, payload } of proposals) {
          const multisigPayload = MultiSigTransactionPayload.deserialize(
            new Deserializer(Hex.fromHexInput(payload).toUint8Array())
          );

          const expireTimestamp =
            Math.floor(client.getServerTime() / 1000) +
            DEFAULT_TXN_EXP_SEC_FROM_NOW;

          // Estimate gas by simulating the inner payload as the vault, mirroring
          // the single-proposal execute flow in ActiveProposalProvider.
          const simulationTransaction = await buildTransaction({
            aptosConfig: aptos.config,
            sender: vaultAddress,
            payload: new TransactionPayloadEntryFunction(
              multisigPayload.transaction_payload
            ),
            options: { expireTimestamp }
          });

          const simulation = await client.simulateTransaction({
            network: { network },
            transaction: simulationTransaction,
            options: {
              estimateGasUnitPrice: true,
              estimateMaxGasAmount: true
            }
          });

          const transaction = await buildTransaction({
            aptosConfig: aptos.config,
            sender: account.address,
            payload: new TransactionPayloadMultiSig(
              new MultiSig(AccountAddress.from(vaultAddress), multisigPayload)
            ),
            options: {
              gasUnitPrice: Number(simulation.gas_unit_price),
              expireTimestamp: Number(simulation.expiration_timestamp_secs)
            }
          });

          const { hash } = await signAndSubmitTransactionAsync({ transaction });
          await aptos.waitForTransaction({ transactionHash: hash });

          executed.push(sequenceNumber);
        }
      } catch {
        failed = true;
      }

      if (executed.length > 0) {
        trackEvent('bulk_execute_proposals', { count: executed.length });
      }

      if (!failed) {
        toast.success(
          `Executed ${executed.length} proposal${
            executed.length === 1 ? '' : 's'
          }!`
        );
      } else if (executed.length > 0) {
        toast.warning(
          `Executed ${executed.length} of ${proposals.length} proposals. The rest failed — please try again.`
        );
      } else {
        toast.error(
          'There was an issue executing the proposals. Please try again.'
        );
      }

      if (executed.length > 0) onResolved?.();

      await queryClient.invalidateQueries();
      setIsPending(false);
    },
    [
      account,
      aptos,
      client,
      network,
      onResolved,
      queryClient,
      signAndSubmitTransactionAsync,
      trackEvent,
      vaultAddress
    ]
  );

  const removeRejected = useCallback(
    async (finalSequenceNumber: number, count: number) => {
      if (count <= 0) return;

      setIsPending(true);

      try {
        const { hash } = await signAndSubmitTransactionAsync({
          data: createRemoveRejectedTransactionPayloadData({
            vaultAddress,
            finalSequenceNumber,
            count
          })
        });
        await aptos.waitForTransaction({ transactionHash: hash });

        trackEvent('bulk_remove_proposals', { count });
        toast.success(
          `Removed ${count} rejected proposal${count === 1 ? '' : 's'}!`
        );

        onResolved?.();
      } catch {
        toast.error(
          'There was an issue removing the rejected proposals. Please try again.'
        );
      } finally {
        await queryClient.invalidateQueries();
        setIsPending(false);
      }
    },
    [
      aptos,
      onResolved,
      queryClient,
      signAndSubmitTransactionAsync,
      trackEvent,
      vaultAddress
    ]
  );

  return { executeReady, removeRejected, isPending };
}
