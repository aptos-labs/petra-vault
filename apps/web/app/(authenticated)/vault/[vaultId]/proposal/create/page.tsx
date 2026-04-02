'use client';

import { useActiveVault } from '@/context/ActiveVaultProvider';
import { Button } from '@/components/ui/button';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useSignAndSubmitTransaction,
  useSimulateTransaction,
  useWaitForTransaction
} from '@aptos-labs/react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateProposalForm } from '@/context/CreateProposalFormProvider';
import PageVaultHeader from '@/components/PageVaultHeader';
import { useRouter } from 'next/navigation';
import { MemoizedCreateProposalEntryFunctionForm } from '@/components/forms/CreateProposalEntryFunctionForm';
import { MemoizedCreateProposalArgumentsForm } from '@/components/forms/CreateProposalArgumentsForm';
import React from 'react';
import {
  AccountAddress,
  InputGenerateTransactionPayloadData
} from '@aptos-labs/ts-sdk';
import { createMultisigTransactionPayloadData } from '@/lib/payloads';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import CodeBlock from '@/components/CodeBlock';
import ExpandingContainer from '@/components/ExpandingContainer';
import { LoadingSpinner } from '@/components/LoaderSpinner';
import { AnimatePresence, motion } from 'motion/react';
import SimulationCoinRow from '@/components/SimulationCoinRow';
import { cn } from '@/lib/utils';
import { jsonStringify } from '@/lib/storage';
import useAnalytics from '@/hooks/useAnalytics';
import {
  EntryFunctionFormFunctionArguments,
  EntryFunctionFormTypeArguments
} from '@/lib/types/forms';
import CreateProposalConfirmationActions from '@/components/CreateProposalConfirmationActions';
import { padEstimatedGas } from '@/lib/gas';
import { TransactionParser } from '@aptos-labs/js-pro';
import { getSimulationQueryErrors, explainError } from '@/lib/transactions';
import { preprocessArgs } from '@/lib/abis';

export default function CreateProposalPage() {
  const trackEvent = useAnalytics();

  const queryClient = useQueryClient();
  const router = useRouter();

  const [page, setPage] = useState<'set-details' | 'confirm'>('set-details');

  const { vaultAddress, id, network, isOwner } = useActiveVault();

  const { entryFunction, abi, functionArguments, typeArguments, isFormValid } =
    useCreateProposalForm();

  const {
    hash,
    signAndSubmitTransaction,
    isPending: isSigningAndSubmitting
  } = useSignAndSubmitTransaction({
    onSuccess: (data) => {
      trackEvent('create_proposal', {
        entry_function_id: entryFunction.value,
        hash: data.hash
      });
    }
  });

  const {
    isSuccess,
    isError,
    isLoading: isWaitingForTransaction
  } = useWaitForTransaction({ hash });

  const { transactionPayload, innerPayload } = useMemo(() => {
    if (!abi.value || !isFormValid.value) {
      return { transactionPayload: undefined, innerPayload: undefined };
    }

    try {
      const innerPayload = {
        function: entryFunction.value as `${string}::${string}::${string}`,
        typeArguments: typeArguments.value,
        functionArguments: preprocessArgs(functionArguments.value, abi.value)
      } satisfies InputGenerateTransactionPayloadData;

      return {
        innerPayload,
        transactionPayload: createMultisigTransactionPayloadData({
          vaultAddress,
          payload: { ...innerPayload, abi: abi.value }
        })
      };
    } catch (error) {
      console.warn(error);
      return { transactionPayload: undefined, innerPayload: undefined };
    }
  }, [
    abi.value,
    entryFunction.value,
    functionArguments.value,
    isFormValid.value,
    typeArguments.value,
    vaultAddress
  ]);

  const simulation = useSimulateTransaction({
    data: innerPayload,
    network: { network },
    sender: AccountAddress.from(vaultAddress),
    withFeePayer: true,
    enabled: isFormValid.value
  });

  const createProposal = useCallback(() => {
    if (!transactionPayload || !entryFunction.value) {
      toast.error(`There was an error creating your proposal`);
      return;
    }

    signAndSubmitTransaction({ data: transactionPayload });
  }, [signAndSubmitTransaction, transactionPayload, entryFunction.value]);

  useEffect(() => {
    if (isSuccess) {
      queryClient.invalidateQueries();
      toast.success('Proposal created');
      router.push(`/vault/${id}/transactions`);
    } else if (isError) {
      toast.error('Proposal creation failed');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, isError]);

  const balanceChanges =
    simulation.data &&
    TransactionParser.getBalanceChanges(
      TransactionParser.create().parseTransaction(simulation.data)
    )[vaultAddress];

  const [isSimulationError, simulationError] =
    getSimulationQueryErrors(simulation);

  const isSimulationSuccess =
    innerPayload && simulation.isSuccess && simulation.data.success;

  const isCreatingProposal = isSigningAndSubmitting || isWaitingForTransaction;

  const renderConfirmationActions = useMemo(
    // eslint-disable-next-line react/display-name
    () => () => {
      return (
        <CreateProposalConfirmationActions
          onBack={() => setPage('set-details')}
          onCreateProposal={createProposal}
          isLoading={isCreatingProposal}
        />
      );
    },
    [createProposal, isCreatingProposal]
  );

  return (
    <div className="p-4 md:p-8 flex flex-col h-full">
      <PageVaultHeader title="Create Proposal" />

      <br />

      <div className="grid grid-cols-2 gap-4 pb-12">
        {page === 'set-details' && (
          <div className="col-span-2 xl:col-span-1">
            <ExpandingContainer>
              <AnimatePresence mode="popLayout">
                <MemoizedCreateProposalEntryFunctionForm
                  key="entry-function-form"
                  onAbiChange={abi.set}
                  onEntryFunctionChange={(e) => {
                    entryFunction.set(e);
                    functionArguments.set([]);
                    typeArguments.set([]);
                  }}
                  defaultValues={{
                    entryFunction: entryFunction.value
                  }}
                  disabled={!isOwner}
                />

                {abi.value && (
                  <motion.div
                    initial={{ opacity: 0, x: -10, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, x: 10, filter: 'blur(8px)' }}
                    transition={{ duration: 0.3 }}
                  >
                    <br />
                    <MemoizedCreateProposalArgumentsForm
                      abi={abi.value}
                      disabled={!isOwner}
                      onFunctionArgumentsChange={(e) =>
                        functionArguments.set(e.map((arg) => arg.value))
                      }
                      onTypeArgumentsChange={(e) =>
                        typeArguments.set(e.map((arg) => arg.value))
                      }
                      onIsFormValidChange={isFormValid.set}
                      defaultValues={{
                        functionArguments:
                          functionArguments.value.length > 0
                            ? (functionArguments.value.map((arg) => ({
                                value: arg
                              })) as EntryFunctionFormFunctionArguments)
                            : undefined,
                        typeArguments:
                          typeArguments.value.length > 0
                            ? (typeArguments.value.map((arg) => ({
                                value: arg
                              })) as EntryFunctionFormTypeArguments)
                            : undefined
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </ExpandingContainer>
          </div>
        )}

        <Card
          className={cn(
            'w-full h-fit',
            page === 'set-details'
              ? isSimulationError || isSimulationSuccess
                ? 'flex col-span-2 xl:col-span-1'
                : 'hidden xl:flex col-span-2 xl:col-span-1'
              : undefined,
            page === 'confirm' && 'flex col-span-2'
          )}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Transaction Simulation</CardTitle>
              {isSimulationSuccess ? (
                <Badge variant="success">Success</Badge>
              ) : isSimulationError ? (
                <Badge variant="destructive">Error</Badge>
              ) : null}
            </div>
            <CardDescription>
              Preview of transaction execution results
            </CardDescription>
          </CardHeader>
          <ExpandingContainer>
            <AnimatePresence mode="popLayout">
              {!isFormValid.value || !innerPayload ? (
                <motion.div
                  key="simulation-idle"
                  initial={{ opacity: 0, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, filter: 'blur(10px)' }}
                  transition={{ duration: 0.3 }}
                >
                  <CardContent>
                    <div className="text-center py-16 font-display text-muted-foreground bg-secondary border border-dashed rounded-lg text-sm">
                      Please fill out the proposal details to preview a
                      simulation.
                    </div>
                  </CardContent>
                </motion.div>
              ) : simulation.isLoading ? (
                <motion.div
                  key="simulation-loading"
                  initial={{ opacity: 0, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, filter: 'blur(10px)' }}
                  transition={{ duration: 0.3 }}
                >
                  <CardContent className="w-full flex justify-center items-center py-8">
                    <LoadingSpinner />
                  </CardContent>
                </motion.div>
              ) : isSimulationError ? (
                <motion.div
                  key="simulation-error"
                  initial={{ opacity: 0, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, filter: 'blur(10px)' }}
                  transition={{ duration: 0.3 }}
                >
                  <CardContent className="w-full flex justify-center items-center">
                    <div className="text-destructive bg-destructive/10 p-4 rounded-lg text-sm border border-destructive border-dashed">
                      {explainError(simulationError)}
                    </div>
                  </CardContent>
                </motion.div>
              ) : isSimulationSuccess ? (
                <motion.div
                  key="simulation-success"
                  initial={{ opacity: 0, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, filter: 'blur(10px)' }}
                  transition={{ duration: 0.3 }}
                >
                  <CardContent
                    className={'grid grid-cols-2 gap-6 xl:divide-x xl:gap-0'}
                  >
                    <div
                      className={cn(
                        'flex flex-col gap-6',
                        page === 'set-details' ? 'col-span-2' : 'xl:pr-12',
                        page === 'confirm' && 'col-span-2 xl:col-span-1'
                      )}
                    >
                      <div>
                        <h3 className="font-display text-lg font-semibold tracking-wide">
                          Balance Changes
                        </h3>
                        <div className="py-4">
                          {balanceChanges ? (
                            <div className="flex flex-col gap-2">
                              {Object.entries(balanceChanges).map(
                                ([asset, change]) => (
                                  <SimulationCoinRow
                                    key={`${vaultAddress}-${asset}`}
                                    asset={asset}
                                    delta={change.delta}
                                  />
                                )
                              )}
                            </div>
                          ) : (
                            <div className="text-muted-foreground">
                              No balance changes
                            </div>
                          )}
                        </div>

                        <h3 className="font-display text-lg font-semibold tracking-wide">
                          Payload
                        </h3>
                        <CodeBlock
                          value={jsonStringify(simulation.data.payload)}
                          className="[&>pre]:!bg-transparent [&>pre]:p-2 max-h-96 overflow-auto w-full border rounded-md text-xs mt-4 bg-secondary"
                        />
                      </div>

                      <div>
                        <h3 className="font-display text-lg font-semibold tracking-wide">
                          Details
                        </h3>
                        <div className="grid grid-cols-2 pt-4 gap-2 text-sm text-muted-foreground font-display">
                          <span>Max Gas Amount:</span>
                          <span>
                            {padEstimatedGas(Number(simulation.data.gas_used))}
                          </span>
                          <span>Gas Unit Price:</span>
                          <span>{simulation.data.gas_unit_price}</span>
                          <span>Expiration Timestamp:</span>
                          <span>
                            {new Date(
                              Number(
                                simulation.data.expiration_timestamp_secs
                              ) * 1000
                            ).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {page === 'confirm' && (
                        <div className="hidden xl:grid">
                          {renderConfirmationActions()}
                        </div>
                      )}
                    </div>

                    {page === 'confirm' && (
                      <div className="flex flex-col col-span-2 xl:col-span-1 gap-4 xl:pl-12">
                        <h3 className="font-display text-lg font-semibold tracking-wide">
                          Writesets
                        </h3>
                        <CodeBlock
                          value={jsonStringify(simulation.data.changes)}
                          className="[&>pre]:!bg-transparent [&>pre]:p-2 max-h-96 overflow-auto w-full border rounded-md text-xs bg-secondary"
                        />

                        <h3 className="font-display text-lg font-semibold tracking-wide">
                          Events
                        </h3>
                        <CodeBlock
                          value={jsonStringify(simulation.data.events)}
                          className="[&>pre]:!bg-transparent [&>pre]:p-2 max-h-96 overflow-auto w-full border rounded-md text-xs bg-secondary"
                        />
                      </div>
                    )}

                    {page === 'confirm' && (
                      <div className="col-span-2 xl:hidden">
                        {renderConfirmationActions()}
                      </div>
                    )}
                  </CardContent>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </ExpandingContainer>
        </Card>

        <Button
          disabled={!simulation.data?.success || !isFormValid.value}
          onClick={() => setPage('confirm')}
          data-testid="create-proposal-confirm-draft-button"
          className={cn('w-fit', page === 'confirm' && 'hidden')}
        >
          {!isSimulationError ? 'Confirm Draft' : 'Simulation Errors Found'}
        </Button>
      </div>
    </div>
  );
}
