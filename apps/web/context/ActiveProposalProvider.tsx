import constate from 'constate';
import useMultisigTransaction from '@/hooks/useMultisigTransaction';
import { useActiveVault } from './ActiveVaultProvider';
import useMultisigCanExecute from '@/hooks/useMultisigCanExecute';
import useMultisigSignaturesRequired from '@/hooks/useMultisigSignaturesRequired';
import useEntryFunctionAbi from '@/hooks/useEntryFunctionAbi';
import { deserializeMultisigTransactionPayload } from '@/lib/payloads';
import useMultisigOwners from '@/hooks/useMultisigOwners';
import {
  useAccount,
  useClients,
  useSimulateTransaction
} from '@aptos-labs/react';
import { useQuery } from '@tanstack/react-query';
import {
  AccountAddress,
  buildTransaction,
  DEFAULT_TXN_EXP_SEC_FROM_NOW,
  Deserializer,
  EntryFunction,
  Hex,
  MultiSig,
  MultiSigTransactionPayload,
  TransactionPayloadEntryFunction,
  TransactionPayloadMultiSig
} from '@aptos-labs/ts-sdk';
import useMultisigSequenceNumber from '@/hooks/useMultisigSequenceNumber';
import useMultisigPendingTransactions from '@/hooks/useMultisigPendingTransactions';
import { getSimulationQueryErrors } from '@/lib/transactions';
import { bufferEstimatedGas, padEstimatedGas } from '@/lib/gas';
import { useMemo } from 'react';

export const [ActiveProposalProvider, useActiveProposal] = constate(
  ({ sequenceNumber }: { sequenceNumber: number }) => {
    const { vaultAddress, network } = useActiveVault();
    const account = useAccount();
    const { aptos, client } = useClients();

    const latestSequenceNumber = useMultisigSequenceNumber({
      address: vaultAddress,
      network: { network }
    });

    const pendingTransactions = useMultisigPendingTransactions({
      address: vaultAddress,
      network: { network },
      enabled:
        latestSequenceNumber.data !== undefined &&
        sequenceNumber !== latestSequenceNumber.data + 1
    });

    const transaction = useMultisigTransaction({
      address: vaultAddress,
      sequenceNumber,
      network: { network }
    });

    const owners = useMultisigOwners({
      address: vaultAddress,
      network: { network }
    });

    const canExecute = useMultisigCanExecute({
      address: vaultAddress,
      sequenceNumber,
      network: { network }
    });

    const signaturesRequired = useMultisigSignaturesRequired({
      address: vaultAddress,
      network: { network }
    });

    const innerPayload = transaction.data?.payload
      ? deserializeMultisigTransactionPayload(transaction.data.payload)
      : undefined;

    const entryFunctionAbi = useEntryFunctionAbi({
      entryFunction: innerPayload?.function
    });

    const simulationPayload = useQuery({
      queryKey: [
        'simulation-proposal-transaction-payload',
        network,
        vaultAddress,
        transaction.data?.payload,
        account?.address?.toString()
      ],
      queryFn: async () => {
        if (!transaction.data?.payload || !account?.address)
          throw new Error('Missing required transaction payload');

        const multisigPayload = MultiSigTransactionPayload.deserialize(
          new Deserializer(
            Hex.fromHexInput(transaction.data?.payload).toUint8Array()
          )
        );

        // In ts-sdk v7 `transaction_payload` is `EntryFunction | Script`, but
        // multisig transaction payloads are always entry functions on-chain.
        if (!(multisigPayload.transaction_payload instanceof EntryFunction)) {
          throw new Error(
            'Multisig transaction payload is not an entry function'
          );
        }

        return await buildTransaction({
          aptosConfig: aptos.config,
          options: {
            expireTimestamp:
              Math.floor(client.getServerTime() / 1000) +
              DEFAULT_TXN_EXP_SEC_FROM_NOW
          },
          sender: vaultAddress,
          payload: new TransactionPayloadEntryFunction(
            multisigPayload.transaction_payload
          )
          // TODO: There is an issue with fee payer addresses not respecting gas estimation issues.
          // feePayerAddress: AccountAddress.from(account.address)
        });
      },
      refetchInterval: 20 * 1000,
      staleTime: 0
    });

    const simulation = useSimulateTransaction({
      transaction: simulationPayload.data ?? undefined,
      network: { network },
      sender: AccountAddress.from(vaultAddress),
      // TODO: Revert this when the issue is fixed by the full node providers.
      // withFeePayer: true,
      options: {
        estimateGasUnitPrice: true,
        estimateMaxGasAmount: true
      }
    });

    const transactionPayload = useQuery({
      queryKey: [
        'proposal-transaction-payload',
        network,
        vaultAddress,
        transaction.data?.payload,
        account?.address?.toString()
      ],
      queryFn: async () => {
        if (!transaction.data?.payload || !account?.address)
          throw new Error('Missing required transaction payload');

        const multisigPayload = MultiSigTransactionPayload.deserialize(
          new Deserializer(
            Hex.fromHexInput(transaction.data.payload).toUint8Array()
          )
        );

        const expireTimestamp =
          Math.floor(client.getServerTime() / 1000) +
          DEFAULT_TXN_EXP_SEC_FROM_NOW;

        const payload = new TransactionPayloadMultiSig(
          new MultiSig(AccountAddress.from(vaultAddress), multisigPayload)
        );

        // Simulate the actual multisig execute wrapper as the owner (prologue +
        // inner payload + epilogue) so the gas ceiling reflects what the
        // transaction really spends, instead of estimating from the inner
        // payload and padding. `enabled` restricts this to executable proposals,
        // where the multisig prologue passes.
        const executeSimulation = await client.simulateTransaction({
          network: { network },
          transaction: await buildTransaction({
            aptosConfig: aptos.config,
            sender: account.address,
            payload,
            options: { expireTimestamp }
          }),
          options: {
            estimateGasUnitPrice: true,
            estimateMaxGasAmount: true
          }
        });

        // Prefer the exact wrapper gas. But if its prologue aborts (replica lag
        // or a shifted queue), or the inner payload fails on-chain — which still
        // resolves the proposal and advances the queue — `gas_used` only covers
        // work up to the abort. Rather than block an executable proposal or
        // under-fund it, fall back to the padded inner-payload estimate (the
        // prologue can't abort that vault-as-sender simulation).
        const maxGasAmount = executeSimulation.success
          ? bufferEstimatedGas(Number(executeSimulation.gas_used))
          : padEstimatedGas(
              Number(simulation.data?.gas_used ?? executeSimulation.gas_used)
            );

        return await buildTransaction({
          aptosConfig: aptos.config,
          sender: account.address,
          payload,
          options: {
            maxGasAmount,
            gasUnitPrice: Number(executeSimulation.gas_unit_price),
            expireTimestamp
          }
        });
      },
      enabled: canExecute.data === true && !!account?.address
    });

    const isUserApproved =
      account &&
      transaction.data?.votes.approvals.some((approval) =>
        AccountAddress.from(approval).equals(account?.address)
      );

    const hasUserCastedVote =
      account &&
      (transaction.data?.votes.approvals.some((approval) =>
        AccountAddress.from(approval).equals(account?.address)
      ) ||
        transaction.data?.votes.rejections.some((rejection) =>
          AccountAddress.from(rejection).equals(account?.address)
        ));

    const votesByOwners = useMemo(
      () => ({
        approvals: transaction.data?.votes.approvals.filter((approval) => {
          return owners.data?.some((owner) =>
            AccountAddress.from(owner).equals(AccountAddress.from(approval))
          );
        }),
        rejections: transaction.data?.votes.rejections.filter((rejection) => {
          return owners.data?.some((owner) =>
            AccountAddress.from(owner).equals(AccountAddress.from(rejection))
          );
        })
      }),
      [owners, transaction.data]
    );

    const hasEnoughApprovals =
      (votesByOwners?.approvals?.length ?? 0) >=
      Number(signaturesRequired.data);

    const hasEnoughRejections =
      (votesByOwners?.rejections?.length ?? 0) >=
      Number(signaturesRequired.data);

    const pendingTransactionsAhead = latestSequenceNumber.data
      ? pendingTransactions.data?.filter((_, i) => {
          const txnSequenceNumber = latestSequenceNumber.data! + i + 1;
          return sequenceNumber > txnSequenceNumber;
        })
      : undefined;

    const isNext = (pendingTransactionsAhead?.length ?? 0) === 0;

    const [isSimulationError, simulationError] =
      getSimulationQueryErrors(simulation);

    return {
      simulation: {
        ...simulation,
        isSimulationError,
        simulationError
      },
      sequenceNumber,
      transaction,
      canExecute,
      signaturesRequired,
      innerPayload,
      entryFunctionAbi,
      owners,
      isUserApproved,
      hasUserCastedVote,
      transactionPayload,
      simulationPayload,
      hasEnoughApprovals,
      hasEnoughRejections,
      latestSequenceNumber,
      pendingTransactionsAhead,
      isNext
    };
  }
);
