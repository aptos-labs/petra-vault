import CodeBlock from '@/components/CodeBlock';
import { LoadingSpinner } from '@/components/LoaderSpinner';
import SimulationCoinRow from '@/components/SimulationCoinRow';
import { Button } from '@/components/ui/button';
import { DialogClose, DialogFooter } from '@/components/ui/dialog';
import { useActiveVault } from '@/context/ActiveVaultProvider';
import useEntryFunctionAbi from '@/hooks/useEntryFunctionAbi';
import { createMultisigTransactionPayloadData } from '@/lib/payloads';
import { jsonStringify } from '@/lib/storage';
import { useSimulateTransaction } from '@aptos-labs/react';
import { TransactionParser } from '@aptos-labs/js-pro';
import {
  AccountAddress,
  InputGenerateTransactionPayloadData,
  TransactionPayloadEntryFunction
} from '@aptos-labs/ts-sdk';
import {
  SignAndSubmitTransactionWithPayloadRequestArgs,
  TransactionOptions
} from '@aptos-labs/wallet-api';
import { useMemo } from 'react';

interface SignAndSubmitTransactionWithPayloadBodyProps {
  args: SignAndSubmitTransactionWithPayloadRequestArgs;
  onApprove: (transactionPayload: {
    data: InputGenerateTransactionPayloadData;
    options?: TransactionOptions;
  }) => void;
  onReject: () => void;
  isApproving?: boolean;
}

export default function SignAndSubmitTransactionWithPayloadBody({
  args,
  isApproving = false,
  onApprove,
  onReject
}: SignAndSubmitTransactionWithPayloadBodyProps) {
  const { vaultAddress, network } = useActiveVault();

  const entryFunction = useMemo(() => {
    if ('payload' in args) {
      if ('type' in args.payload) {
        if (args.payload.type === 'entry_function_payload') {
          return args.payload.function;
        }
      }
      if (args.payload instanceof TransactionPayloadEntryFunction) {
        const entryFunction = args.payload.entryFunction;
        return `${entryFunction.module_name.address}::${entryFunction.module_name.name.identifier}::${entryFunction.function_name.identifier}`;
      }
    }
    return undefined;
  }, [args]);

  const { data: abi } = useEntryFunctionAbi({ entryFunction });

  const { innerPayload, transactionPayload } = useMemo(() => {
    const unsupportedPayload = {
      entryFunction: undefined,
      innerPayload: undefined,
      transactionPayload: undefined
    };

    if (!abi) return unsupportedPayload;

    if ('payload' in args) {
      if ('type' in args.payload) {
        if (args.payload.type === 'entry_function_payload') {
          const innerPayload = {
            function: args.payload.function,
            typeArguments: args.payload.type_arguments,
            functionArguments: args.payload.arguments
          } satisfies InputGenerateTransactionPayloadData;

          return {
            innerPayload,
            transactionPayload: createMultisigTransactionPayloadData({
              vaultAddress: vaultAddress,
              payload: { ...innerPayload, abi }
            })
          };
        } else if (args.payload.type === 'multisig_payload') {
          console.warn('Multisig payload not supported by Petra Vault.');
          return unsupportedPayload;
        }
      } else if (args.payload instanceof TransactionPayloadEntryFunction) {
        // TODO: Add support for entry function payloads
      }
    }

    return unsupportedPayload;
  }, [args, abi, vaultAddress]);

  const simulation = useSimulateTransaction({
    sender: AccountAddress.from(vaultAddress),
    data: innerPayload,
    network: { network }
  });

  const balanceChanges = simulation.data
    ? TransactionParser.getBalanceChanges(
        TransactionParser.create().parseTransaction(simulation.data)
      )[vaultAddress]
    : undefined;

  const onHandleReject = () => {
    onReject();
  };

  const onHandleApprove = () => {
    if (!transactionPayload) return;
    onApprove({
      data: transactionPayload,
      options: {
        ...args.options,
        // TODO: This is a temporary fix to patch 0 gas amount issues.
        maxGasAmount:
          args.options?.maxGasAmount === 0
            ? undefined
            : args.options?.maxGasAmount
      }
    });
  };

  return (
    <div className="flex flex-col">
      <div className="mt-2">
        <p className="font-display font-semibold mb-2">Balances Changes</p>
        {balanceChanges ? (
          <div className="pb-4 pt-2 flex flex-col gap-2">
            {Object.entries(balanceChanges).map(([asset, change]) => (
              <SimulationCoinRow
                key={`${vaultAddress}-${asset}`}
                asset={asset}
                delta={change.delta}
              />
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground border border-dashed rounded-lg w-full bg-secondary text-center text-sm py-8">
            {simulation.isLoading ? (
              <LoadingSpinner className="mx-auto" />
            ) : (
              'No balance changes'
            )}
          </div>
        )}
      </div>

      <div className="mt-2">
        {innerPayload && (
          <>
            <p className="font-display font-semibold mb-2">Payload</p>
            <div className="max-h-64 overflow-auto w-full p-2 border rounded-md text-xs bg-secondary">
              <CodeBlock
                value={jsonStringify(innerPayload)}
                className="[&>pre]:!bg-transparent"
              />
            </div>
          </>
        )}
      </div>

      <br />

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="secondary" onClick={onHandleReject}>
            Reject
          </Button>
        </DialogClose>
        <Button onClick={onHandleApprove} isLoading={isApproving}>
          Approve
        </Button>
      </DialogFooter>
    </div>
  );
}
