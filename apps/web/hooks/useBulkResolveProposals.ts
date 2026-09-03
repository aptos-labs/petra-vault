import { useCallback, useState } from 'react';
import {
  AccountAddress,
  buildTransaction,
  DEFAULT_TXN_EXP_SEC_FROM_NOW,
  Deserializer,
  EntryFunction,
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
import { bufferEstimatedGas, padEstimatedGas } from '@/lib/gas';
import useAnalytics from './useAnalytics';

export interface BulkExecutableProposal {
  sequenceNumber: number;
  payload: string;
}

export interface UseBulkResolveProposalsOptions {
  vaultAddress: string;
  network: Network;
  /**
   * Called with the sequence numbers that were executed or removed. Fires on
   * partial progress too, so callers can drop exactly those from any selection
   * and leave unresolved ones in place.
   */
  onResolved?: (resolvedSequenceNumbers: number[]) => void;
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

          // In ts-sdk v7 `transaction_payload` is `EntryFunction | Script`, but
          // multisig transaction payloads are always entry functions on-chain.
          // getResolvablePrefix already filters these out; keep this as a guard.
          if (!(multisigPayload.transaction_payload instanceof EntryFunction)) {
            throw new Error(
              'Multisig transaction payload is not an entry function'
            );
          }

          const expireTimestamp =
            Math.floor(client.getServerTime() / 1000) +
            DEFAULT_TXN_EXP_SEC_FROM_NOW;

          const executePayload = new TransactionPayloadMultiSig(
            new MultiSig(AccountAddress.from(vaultAddress), multisigPayload)
          );

          // Simulate the actual multisig execute wrapper as the owner (prologue +
          // inner payload + epilogue) so the gas ceiling reflects the real cost
          // instead of estimating from the inner payload and padding. This
          // proposal is at the front of the queue now that the previous one has
          // been executed and awaited, so the multisig prologue passes.
          const simulation = await client.simulateTransaction({
            network: { network },
            transaction: await buildTransaction({
              aptosConfig: aptos.config,
              sender: account.address,
              payload: executePayload,
              options: { expireTimestamp }
            }),
            options: {
              estimateGasUnitPrice: true,
              estimateMaxGasAmount: true
            }
          });

          // Prefer the exact wrapper gas. But if its prologue aborts (replica
          // lag or a shifted queue), or the inner payload fails on-chain — which
          // still resolves the proposal and advances the queue — `gas_used` only
          // covers work up to the abort. Rather than block resolving the queue
          // or under-fund the tx, fall back to the padded inner-payload estimate
          // (the prologue can't abort that vault-as-sender simulation).
          let maxGasAmount: number;
          if (simulation.success) {
            maxGasAmount = bufferEstimatedGas(Number(simulation.gas_used));
          } else {
            const innerSimulation = await client.simulateTransaction({
              network: { network },
              transaction: await buildTransaction({
                aptosConfig: aptos.config,
                sender: vaultAddress,
                payload: new TransactionPayloadEntryFunction(
                  multisigPayload.transaction_payload
                ),
                options: { expireTimestamp }
              }),
              options: {
                estimateGasUnitPrice: true,
                estimateMaxGasAmount: true
              }
            });
            maxGasAmount = padEstimatedGas(Number(innerSimulation.gas_used));
          }

          const transaction = await buildTransaction({
            aptosConfig: aptos.config,
            sender: account.address,
            payload: executePayload,
            options: {
              maxGasAmount,
              gasUnitPrice: Number(simulation.gas_unit_price),
              expireTimestamp
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

      if (executed.length > 0) onResolved?.(executed);

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

        // execute_rejected_transactions removes the contiguous prefix ending at
        // finalSequenceNumber, i.e. `count` proposals back to its start.
        onResolved?.(
          Array.from(
            { length: count },
            (_, i) => finalSequenceNumber - count + 1 + i
          )
        );
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
