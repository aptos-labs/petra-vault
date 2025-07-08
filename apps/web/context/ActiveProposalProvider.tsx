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
  Deserializer,
  Hex,
  MultiSig,
  MultiSigTransactionPayload,
  TransactionPayloadEntryFunction,
  TransactionPayloadMultiSig
} from '@aptos-labs/ts-sdk';
import useMultisigSequenceNumber from '@/hooks/useMultisigSequenceNumber';
import useMultisigPendingTransactions from '@/hooks/useMultisigPendingTransactions';
import { getSimulationQueryErrors } from '@/lib/transactions';

export const [ActiveProposalProvider, useActiveProposal] = constate(
  ({ sequenceNumber }: { sequenceNumber: number }) => {
    const { vaultAddress, network } = useActiveVault();
    const account = useAccount();
    const { aptos } = useClients();

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

        return await buildTransaction({
          aptosConfig: aptos.config,
          sender: vaultAddress,
          payload: new TransactionPayloadEntryFunction(
            multisigPayload.transaction_payload
          ),
          feePayerAddress: AccountAddress.from(account.address)
        });
      },
      refetchInterval: 20 * 1000,
      staleTime: 0
    });

    const simulation = useSimulateTransaction({
      transaction: simulationPayload.data ?? undefined,
      network: { network },
      sender: AccountAddress.from(vaultAddress),
      withFeePayer: true
    });

    const transactionPayload = useQuery({
      queryKey: ['proposal-transaction-payload', simulation.data?.hash],
      queryFn: async () => {
        if (!transaction.data?.payload || !account?.address || !simulation.data)
          throw new Error('Missing required transaction payload');

        const multisigPayload = MultiSigTransactionPayload.deserialize(
          new Deserializer(
            Hex.fromHexInput(transaction.data?.payload).toUint8Array()
          )
        );

        return await buildTransaction({
          aptosConfig: aptos.config,
          sender: account?.address,
          payload: new TransactionPayloadMultiSig(
            new MultiSig(AccountAddress.from(vaultAddress), multisigPayload)
          ),
          options: {
            maxGasAmount: Number(simulation.data.gas_used) * 10,
            gasUnitPrice: Number(simulation.data.gas_unit_price),
            expireTimestamp: Number(simulation.data.expiration_timestamp_secs)
          }
        });
      },
      enabled: !!simulationPayload.data
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

    const hasEnoughApprovals =
      (transaction.data?.votes.approvals.length ?? 0) >=
      Number(signaturesRequired.data);

    const hasEnoughRejections =
      (transaction.data?.votes.rejections.length ?? 0) >=
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
