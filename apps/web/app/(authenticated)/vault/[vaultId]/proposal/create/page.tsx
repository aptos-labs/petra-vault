"use client";

import { useActiveVault } from "@/context/ActiveVaultProvider";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useSignAndSubmitTransaction,
  useSimulateTransaction,
  useWaitForTransaction,
} from "@aptos-labs/react";
import { toast } from "sonner";
import { useCreateProposalForm } from "@/context/CreateProposalFormProvider";
import PageVaultHeader from "@/components/PageVaultHeader";
import { useRouter } from "next/navigation";
import { MemoizedCreateProposalEntryFunctionForm } from "@/components/forms/CreateProposalEntryFunctionForm";
import { MemoizedCreateProposalArgumentsForm } from "@/components/forms/CreateProposalArgumentsForm";
import React from "react";
import {
  AccountAddress,
  InputGenerateTransactionPayloadData,
} from "@aptos-labs/ts-sdk";
import { createMultisigTransactionPayloadData } from "@/lib/payloads";
import SimulationParser from "@/lib/simulations/parsers/SimulationParser";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CodeBlock from "@/components/CodeBlock";
import ExpandingContainer from "@/components/ExpandingContainer";
import { LoadingSpinner } from "@/components/LoaderSpinner";
import { AnimatePresence, motion } from "motion/react";
import SimulationCoinRow from "@/components/SimulationCoinRow";
import { cn } from "@/lib/utils";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { Separator } from "@/components/ui/separator";
import Callout from "@/components/Callout";
import { getSimulationQueryErrors } from "@/lib/simulations/shared";
import { jsonStringify } from "@/lib/storage";

export default function CreateProposalPage() {
  const router = useRouter();

  const [page, setPage] = useState<"set-details" | "confirm">("set-details");

  const { vaultAddress, id, network, isOwner } = useActiveVault();

  const { entryFunction, abi, functionArguments, typeArguments, isFormValid } =
    useCreateProposalForm();

  const {
    hash,
    signAndSubmitTransaction,
    isPending: isSigningAndSubmitting,
  } = useSignAndSubmitTransaction();

  const { isSuccess, isLoading: isWaitingForTransaction } =
    useWaitForTransaction({ hash });

  const { transactionPayload, innerPayload } = useMemo(() => {
    if (!abi.value || !isFormValid.value) {
      return { transactionPayload: undefined, innerPayload: undefined };
    }

    try {
      const innerPayload = {
        function: entryFunction.value as `${string}::${string}::${string}`,
        typeArguments: typeArguments.value,
        functionArguments: functionArguments.value,
      } satisfies InputGenerateTransactionPayloadData;

      return {
        innerPayload,
        transactionPayload: createMultisigTransactionPayloadData({
          vaultAddress,
          payload: { ...innerPayload, abi: abi.value },
        }),
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
    vaultAddress,
  ]);

  const simulation = useSimulateTransaction({
    data: innerPayload,
    network: { network },
    sender: AccountAddress.from(vaultAddress),
    options: {
      estimateMaxGasAmount: true,
      estimateGasUnitPrice: true,
      estimatePrioritizedGasUnitPrice: true,
    },
    enabled: isFormValid.value,
  });

  const createProposal = useCallback(() => {
    if (!transactionPayload) {
      toast.error(`There was an error creating your proposal`);
      return;
    }

    signAndSubmitTransaction({ data: transactionPayload });
  }, [signAndSubmitTransaction, transactionPayload]);

  useEffect(() => {
    if (isSuccess) {
      toast.success("Proposal created");
      router.push(`/vault/${id}/transactions`);
    }
  }, [isSuccess, router, vaultAddress, hash, id]);

  const balanceChanges =
    simulation.data &&
    SimulationParser.parseTransaction(simulation.data)?.getBalanceChanges()[
      vaultAddress
    ];

  const [isSimulationError, simulationError] =
    getSimulationQueryErrors(simulation);

  const isSimulationSuccess =
    innerPayload && simulation.isSuccess && simulation.data.success;

  const isCreatingProposal = isSigningAndSubmitting || isWaitingForTransaction;

  return (
    <div className="p-8 ">
      <PageVaultHeader title="Create Proposal" />

      <br />

      <div className="grid grid-cols-2 gap-4 h-full">
        {page === "set-details" && (
          <div>
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
                  defaultValues={{ entryFunction: entryFunction.value }}
                  disabled={!isOwner}
                />

                {abi.value && (
                  <motion.div
                    initial={{ opacity: 0, x: -10, filter: "blur(8px)" }}
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, x: 10, filter: "blur(8px)" }}
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
                                value: arg,
                              })) as [
                                { value: string },
                                ...{ value: string }[],
                              ])
                            : undefined,
                        typeArguments:
                          typeArguments.value.length > 0
                            ? (typeArguments.value.map((arg) => ({
                                value: arg,
                              })) as [
                                { value: string },
                                ...{ value: string }[],
                              ])
                            : undefined,
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </ExpandingContainer>
            <br />
            <Button
              disabled={!simulation.data?.success || !isFormValid.value}
              onClick={() => setPage("confirm")}
              data-testid="create-proposal-confirm-draft-button"
            >
              {!isSimulationError ? "Confirm Draft" : "Simulation Errors Found"}
            </Button>
          </div>
        )}

        <Card
          className={cn("w-full h-fit", page === "confirm" && "col-span-2")}
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
              {!isFormValid.value ? (
                <motion.div
                  key="simulation-loading"
                  initial={{ opacity: 0, filter: "blur(10px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, filter: "blur(10px)" }}
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
                  initial={{ opacity: 0, filter: "blur(10px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, filter: "blur(10px)" }}
                  transition={{ duration: 0.3 }}
                >
                  <CardContent>
                    <div className="w-full flex justify-center items-center py-8">
                      <LoadingSpinner />
                    </div>
                  </CardContent>
                </motion.div>
              ) : isSimulationError ? (
                <motion.div
                  key="simulation-error"
                  initial={{ opacity: 0, filter: "blur(10px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, filter: "blur(10px)" }}
                  transition={{ duration: 0.3 }}
                >
                  <CardContent>
                    <div className="w-full flex justify-center items-center">
                      <div className="text-destructive bg-destructive/10 p-4 rounded-lg text-sm border border-destructive border-dashed">
                        <>
                          {simulationError ===
                          "MAX_GAS_UNITS_BELOW_MIN_TRANSACTION_GAS_UNITS"
                            ? "The account must have some APT to create a proposal. Please add some APT to the Vault and try again."
                            : simulationError}
                        </>
                      </div>
                    </div>
                  </CardContent>
                </motion.div>
              ) : isSimulationSuccess ? (
                <motion.div
                  key="simulation-success"
                  initial={{ opacity: 0, filter: "blur(10px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, filter: "blur(10px)" }}
                  transition={{ duration: 0.3 }}
                >
                  <CardContent className={"grid grid-cols-2 divide-x"}>
                    <div
                      className={cn(
                        "flex flex-col gap-6",
                        page === "set-details" ? "col-span-2" : "pr-12"
                      )}
                    >
                      <div>
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
                        </div>

                        <h3 className="font-display text-lg font-semibold tracking-wide">
                          Payload
                        </h3>
                        <div className="max-h-96 overflow-auto w-full p-2 border rounded-md text-xs mt-4 bg-secondary">
                          <CodeBlock
                            value={jsonStringify(innerPayload)}
                            className="[&>pre]:!bg-transparent"
                          />
                        </div>
                      </div>

                      <div>
                        <h3 className="font-display text-lg font-semibold tracking-wide">
                          Details
                        </h3>
                        <div className="pt-4">
                          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground font-display">
                            <span>Max Gas Amount:</span>
                            <span>{Number(simulation.data.gas_used) * 2}</span>
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
                      </div>

                      {page === "confirm" && (
                        <>
                          <Callout
                            title="Always Verify"
                            description="Before signing, always verify the transaction details and the transaction payload."
                            status="loading"
                          />
                          <Separator />
                          <div className="flex gap-4">
                            <Button
                              variant="ghost"
                              onClick={() => setPage("set-details")}
                            >
                              <ArrowLeftIcon />
                              Go Back
                            </Button>
                            <Button
                              onClick={createProposal}
                              isLoading={isCreatingProposal}
                              data-testid="create-proposal-create-proposal-button"
                            >
                              Create Proposal
                            </Button>
                          </div>
                        </>
                      )}
                    </div>

                    {page === "confirm" && (
                      <div className="flex flex-col gap-6 pl-12">
                        <div>
                          <h3 className="font-display text-lg font-semibold tracking-wide">
                            Writesets
                          </h3>
                          <div>
                            <div className="max-h-96 overflow-auto w-full p-2 border rounded-md text-xs mt-4 bg-secondary">
                              <CodeBlock
                                value={jsonStringify(simulation.data.changes)}
                                className="[&>pre]:!bg-transparent"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="font-display text-lg font-semibold tracking-wide">
                            Events
                          </h3>
                          <div>
                            <div className="max-h-96 overflow-auto w-full p-2 border rounded-md text-xs mt-4 bg-secondary">
                              <CodeBlock
                                value={jsonStringify(simulation.data.events)}
                                className="[&>pre]:!bg-transparent"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </ExpandingContainer>
        </Card>
      </div>
    </div>
  );
}
