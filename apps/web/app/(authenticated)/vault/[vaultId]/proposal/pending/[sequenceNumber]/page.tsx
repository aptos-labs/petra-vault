'use client';

import PageVaultHeader from '@/components/PageVaultHeader';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { AptosAvatar } from 'aptos-avatars-react';
import { AccountAddress, truncateAddress } from '@aptos-labs/ts-sdk';
import { CheckCircledIcon } from '@radix-ui/react-icons';
import { CrossCircledIcon } from '@radix-ui/react-icons';
import { useActiveProposal } from '@/context/ActiveProposalProvider';
import { QuestionMarkCircledIcon } from '@radix-ui/react-icons';
import CodeBlock from '@/components/CodeBlock';
import {
  createMultisigVoteTransactionPayloadData,
  formatPayloadWithAbi
} from '@/lib/payloads';
import { useCallback, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useSignAndSubmitTransaction,
  useWaitForTransaction
} from '@aptos-labs/react';
import { toast } from 'sonner';
import { useActiveVault } from '@/context/ActiveVaultProvider';
import { Separator } from '@/components/ui/separator';
import { AnimatePresence, motion } from 'motion/react';
import { LoadingSpinner } from '@/components/LoaderSpinner';
import SimulationCoinRow from '@/components/SimulationCoinRow';
import { PendingTransactionRow } from '@/components/PendingTransactionRow';
import { useRouter } from 'next/navigation';
import { jsonStringify } from '@/lib/storage';
import Link from 'next/link';
import useAnalytics from '@/hooks/useAnalytics';
import ExecuteProposalConfirmationActions from '@/components/ExecuteProposalConfirmationActions';
import { padEstimatedGas } from '@/lib/gas';
import { TransactionParser } from '@aptos-labs/js-pro';

export default function ProposalPage() {
  const trackEvent = useAnalytics();

  const queryClient = useQueryClient();
  const router = useRouter();

  const { vaultAddress, id } = useActiveVault();

  const {
    sequenceNumber,
    transaction: { data: transaction },
    signaturesRequired: { data: signaturesRequired },
    owners,
    innerPayload,
    entryFunctionAbi,
    isUserApproved,
    transactionPayload,
    canExecute,
    hasEnoughApprovals,
    hasEnoughRejections,
    simulation,
    pendingTransactionsAhead,
    latestSequenceNumber: { data: latestSequenceNumber },
    isNext,
    hasUserCastedVote
  } = useActiveProposal();

  const balanceChanges = simulation.data
    ? TransactionParser.getBalanceChanges(
        TransactionParser.create().parseTransaction(simulation.data)
      )[vaultAddress]
    : undefined;

  // Voting

  const {
    hash: secondaryActionHash,
    signAndSubmitTransaction: signAndSubmitSecondaryAction,
    isPending: isSignAndSubmitSecondaryActionPending
  } = useSignAndSubmitTransaction({
    onSuccess(data, variables) {
      trackEvent('vote_proposal', {
        hash: data.hash,
        action:
          'data' in variables &&
          'function' in variables.data &&
          variables.data.function ===
            '0x1::multisig_account::approve_transaction'
            ? 'approve'
            : 'reject'
      });
    }
  });

  const {
    isSuccess: isSecondaryActionSuccess,
    isLoading: isSecondaryTransactionLoading
  } = useWaitForTransaction({ hash: secondaryActionHash });

  useEffect(() => {
    if (isSecondaryActionSuccess) {
      queryClient.invalidateQueries();
      toast.success('Transaction voted!');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSecondaryActionSuccess]);

  const handleSecondaryAction = useCallback(
    (approve: boolean) =>
      signAndSubmitSecondaryAction({
        data: createMultisigVoteTransactionPayloadData({
          vaultAddress,
          sequenceNumber,
          approve
        })
      }),
    [sequenceNumber, signAndSubmitSecondaryAction, vaultAddress]
  );

  const isSecondaryActionLoading =
    isSignAndSubmitSecondaryActionPending || isSecondaryTransactionLoading;

  // Primary Action

  const {
    hash: primaryActionHash,
    signAndSubmitTransaction: signAndSubmitPrimaryAction,
    isPending: isSignAndSubmitPrimaryActionPending
  } = useSignAndSubmitTransaction({
    onSuccess(data, variables) {
      if ('data' in variables && 'function' in variables.data) {
        if (
          variables.data.function ===
          '0x1::multisig_account::execute_transaction'
        ) {
          trackEvent('execute_proposal', { hash: data.hash });
        } else if (
          variables.data.function ===
          '0x1::multisig_account::execute_rejected_transaction'
        ) {
          trackEvent('remove_proposal', { hash: data.hash });
        }
      }
    }
  });

  const {
    isSuccess: isPrimaryActionSuccess,
    isLoading: isPrimaryTransactionLoading
  } = useWaitForTransaction({ hash: primaryActionHash });

  useEffect(() => {
    if (isPrimaryActionSuccess) {
      queryClient.invalidateQueries();
      toast.success('Transaction executed!');
      router.push(`/vault/${id}/transactions`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPrimaryActionSuccess]);

  const handlePrimaryAction = useCallback(
    async (action: 'execute' | 'remove') => {
      if (action === 'remove') {
        signAndSubmitPrimaryAction({
          data: {
            function: '0x1::multisig_account::execute_rejected_transaction',
            functionArguments: [vaultAddress]
          }
        });
      }

      if (action === 'execute') {
        const transaction = await transactionPayload.refetch();

        if (!transaction.data) {
          return toast.error(
            'There was an issue building your transaction, please try again.'
          );
        }

        signAndSubmitPrimaryAction({ transaction: transaction.data });
      }
    },
    [signAndSubmitPrimaryAction, transactionPayload, vaultAddress]
  );

  const isPrimaryActionLoading =
    isSignAndSubmitPrimaryActionPending || isPrimaryTransactionLoading;

  // Conditionals

  const actionsVariant = useMemo(() => {
    if (!hasEnoughApprovals && !hasEnoughRejections) return 'voting';
    if (hasEnoughRejections && !hasEnoughApprovals && isNext)
      return 'can-remove';
    if (hasEnoughApprovals && canExecute.data && isNext) return 'can-execute';
    return 'waiting';
  }, [hasEnoughApprovals, hasEnoughRejections, canExecute.data, isNext]);

  const renderConfirmationActions = useMemo(
    // eslint-disable-next-line react/display-name
    () => () => {
      return (
        <ExecuteProposalConfirmationActions
          actionVariant={actionsVariant}
          isPrimaryActionLoading={isPrimaryActionLoading}
          isPrimaryActionDisabled={
            !isNext ||
            (hasEnoughApprovals ? !canExecute.data : !hasEnoughRejections)
          }
          isSecondaryActionLoading={isSecondaryActionLoading}
          onRemoveTransaction={() => handlePrimaryAction('remove')}
          onExecuteTransaction={() => handlePrimaryAction('execute')}
          onVote={(approve) => handleSecondaryAction(approve)}
          hasUserCastedVote={hasUserCastedVote}
          isUserApproved={isUserApproved}
        />
      );
    },
    [
      actionsVariant,
      canExecute.data,
      handlePrimaryAction,
      handleSecondaryAction,
      hasEnoughApprovals,
      hasEnoughRejections,
      hasUserCastedVote,
      isNext,
      isPrimaryActionLoading,
      isSecondaryActionLoading,
      isUserApproved
    ]
  );

  if (!transaction) return null;

  return (
    <div className="p-4 md:p-8 h-full">
      <PageVaultHeader title={`Proposal #${sequenceNumber}`} />

      <br />

      <div className="pb-12 grid grid-cols-8 gap-4">
        <Card className="col-span-8 lg:col-span-5 h-fit">
          <CardHeader>
            <CardTitle>Transaction Details</CardTitle>
            <CardDescription>
              This is a pending proposal that has not yet been executed.
            </CardDescription>
          </CardHeader>
          <Separator />
          {transaction.payload ? (
            <CardContent className="flex flex-col gap-4">
              <div>
                <CardTitle>Payload</CardTitle>
                <CardDescription>
                  The transaction payload is the function and arguments that
                  will be executed.
                </CardDescription>
                <div className="flex-1 overflow-auto w-full p-2 border rounded-md text-xs mt-2 bg-secondary">
                  {innerPayload && entryFunctionAbi.data && (
                    <CodeBlock
                      value={jsonStringify(
                        formatPayloadWithAbi(
                          innerPayload,
                          entryFunctionAbi.data
                        )
                      )}
                      className="[&>pre]:!bg-transparent "
                    />
                  )}
                </div>
              </div>

              <div className="pt-2">
                <AnimatePresence mode="popLayout">
                  {simulation.isLoading ? (
                    <motion.div
                      key="simulation-loading"
                      initial={{ opacity: 0, filter: 'blur(10px)' }}
                      animate={{ opacity: 1, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, filter: 'blur(10px)' }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="w-full flex justify-center items-center py-8">
                        <LoadingSpinner />
                      </div>
                    </motion.div>
                  ) : simulation.isSimulationError ? (
                    <motion.div
                      key="simulation-error"
                      initial={{ opacity: 0, filter: 'blur(10px)' }}
                      animate={{ opacity: 1, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, filter: 'blur(10px)' }}
                      transition={{ duration: 0.3 }}
                    >
                      <CardTitle>Transaction Simulation</CardTitle>
                      <CardDescription className="mb-4">
                        This simulation shows a preview of the
                        transaction&apos;s details when executed.
                      </CardDescription>
                      <div className="w-full flex">
                        <div className="text-destructive bg-destructive/10 p-4 rounded-lg text-sm border border-destructive border-dashed">
                          <>{simulation.simulationError}</>
                        </div>
                      </div>
                    </motion.div>
                  ) : simulation.isSuccess ? (
                    <motion.div
                      key="simulation-success"
                      initial={{ opacity: 0, filter: 'blur(10px)' }}
                      animate={{ opacity: 1, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, filter: 'blur(10px)' }}
                      transition={{ duration: 0.3 }}
                      className="flex flex-col gap-4"
                    >
                      <div>
                        <CardHeader className="!px-0">
                          <CardTitle>Balance Changes</CardTitle>
                          <CardDescription className="mb-4">
                            This shows a preview of the vault&apos;s asset
                            changes after the transaction is executed.
                          </CardDescription>
                        </CardHeader>
                        {balanceChanges ? (
                          <div className="pb-4 pt-2 flex flex-col gap-2">
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
                          <div className="text-muted-foreground border border-dashed rounded-lg w-full bg-secondary text-center text-sm py-8">
                            No balance changes
                          </div>
                        )}
                      </div>
                      <div>
                        <CardHeader className="!px-0">
                          <CardTitle>Miscellaneous Details</CardTitle>
                          <CardDescription>
                            Other details about the transaction including gas
                            and expiration.
                          </CardDescription>
                        </CardHeader>
                        <div className="py-4 grid grid-cols-2 gap-2 text-sm text-muted-foreground font-display">
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
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              <div className="hidden lg:block">
                {renderConfirmationActions()}
              </div>
            </CardContent>
          ) : (
            <CardContent>
              <div className="flex flex-col items-center justify-center gap-2">
                <CardTitle className="text-destructive">
                  Unsupported Transaction
                </CardTitle>
                <CardDescription>
                  This type of transaction is not supported by Petra Vault and
                  must be executed manually.
                </CardDescription>
              </div>
            </CardContent>
          )}
        </Card>

        <div className="col-span-8 lg:col-span-3 h-full flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Confirmations</CardTitle>
              <CardDescription>
                The transaction requires {signaturesRequired} approval
                {signaturesRequired === 1 ? '' : 's'} from the owners to
                execute.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground grid grid-cols-2 lg:grid-cols-3 gap-4">
                {owners.data?.map((owner) => {
                  const isApproved = transaction.votes.approvals.some(
                    (approval) => AccountAddress.from(owner).equals(approval)
                  );
                  const isRejected = transaction.votes.rejections.some(
                    (rejection) => AccountAddress.from(owner).equals(rejection)
                  );

                  return (
                    <div
                      key={owner}
                      className="flex items-center gap-2 w-full flex-wrap"
                    >
                      <div className="min-w-[20px] min-h-[20px]">
                        <AptosAvatar value={owner} size={20} />
                      </div>
                      <p>{truncateAddress(owner)}</p>
                      <Badge
                        variant={
                          isApproved
                            ? 'success'
                            : isRejected
                              ? 'destructive'
                              : 'secondary'
                        }
                        className="px-1"
                      >
                        {isApproved ? (
                          <CheckCircledIcon />
                        ) : isRejected ? (
                          <CrossCircledIcon />
                        ) : (
                          <QuestionMarkCircledIcon />
                        )}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {(pendingTransactionsAhead?.length ?? 0) > 0 &&
            latestSequenceNumber && (
              <Card className="gap-2">
                <CardHeader>
                  <CardTitle>Pending Transactions Ahead</CardTitle>
                  <CardDescription>
                    Transactions ahead in the queue must be executed first
                    before this one can be executed.
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  {pendingTransactionsAhead?.map((transaction, i) => {
                    const sequenceNumber = latestSequenceNumber + i + 1;
                    return (
                      <Link
                        key={transaction.payloadHash}
                        href={`/vault/${id}/proposal/pending/${sequenceNumber}`}
                      >
                        <PendingTransactionRow
                          isNext={latestSequenceNumber + 1 === sequenceNumber}
                          transaction={transaction}
                          sequenceNumber={sequenceNumber}
                          showSequenceNumber={false}
                        />
                      </Link>
                    );
                  })}
                </CardContent>
              </Card>
            )}

          {simulation.data && (
            <>
              <Card className="!gap-0">
                <CardHeader>
                  <CardTitle>Writesets</CardTitle>
                  <CardDescription>
                    The writesets are the changes that will be made to the
                    account&apos;s resources.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CodeBlock
                    value={jsonStringify(simulation.data.changes)}
                    className="[&>pre]:!bg-transparent [&>pre]:!p-2 max-h-96 overflow-auto w-full p-2 border rounded-md text-xs mt-4 bg-secondary"
                  />
                </CardContent>
              </Card>
              <Card className="!gap-0">
                <CardHeader>
                  <CardTitle>Events</CardTitle>
                  <CardDescription>
                    The events are the events that will be emitted by the
                    transaction.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CodeBlock
                    value={jsonStringify(simulation.data.events)}
                    className="[&>pre]:!bg-transparent [&>pre]:!p-2 max-h-96 overflow-auto w-full p-2 border rounded-md text-xs mt-4 bg-secondary"
                  />
                </CardContent>
              </Card>
            </>
          )}

          <Card className="block lg:hidden">
            <CardContent>{renderConfirmationActions()}</CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
