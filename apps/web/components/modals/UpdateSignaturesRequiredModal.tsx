'use client';

import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useActiveVault } from '@/context/ActiveVaultProvider';
import { createMultisigTransactionPayloadData } from '@/lib/payloads';
import { Abis } from '@/lib/abis';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import {
  useSignAndSubmitTransaction,
  useWaitForTransaction
} from '@aptos-labs/react';
import { toast } from 'sonner';
import { Pencil1Icon } from '@radix-ui/react-icons';
import CodeBlock from '@/components/CodeBlock';
import useAnalytics from '@/hooks/useAnalytics';
import UpdateSignaturesRequiredForm, {
  UpdateSignaturesRequiredFormValues
} from '@/components/forms/UpdateSignaturesRequiredForm';
import { jsonStringify } from '@/lib/storage';

export default function UpdateSignaturesRequiredModal({
  ownersCount,
  currentSignaturesRequired
}: {
  ownersCount: number;
  currentSignaturesRequired: number;
}) {
  const trackEvent = useAnalytics();
  const [page, setPage] = useState<'update' | 'confirm'>('update');
  const [savedFormValues, setSavedFormValues] =
    useState<UpdateSignaturesRequiredFormValues>();

  const router = useRouter();
  const { vaultAddress, id } = useActiveVault();

  const { transactionPayload, innerPayload } = useMemo(() => {
    if (!savedFormValues)
      return { transactionPayload: undefined, innerPayload: undefined };

    const payload = createMultisigTransactionPayloadData({
      vaultAddress,
      payload: {
        abi: Abis['0x1::multisig_account::update_signatures_required'],
        function: '0x1::multisig_account::update_signatures_required',
        functionArguments: [savedFormValues.signaturesRequired]
      }
    });

    return {
      transactionPayload: payload,
      innerPayload: {
        function: '0x1::multisig_account::update_signatures_required',
        functionArguments: [savedFormValues.signaturesRequired],
        typeArguments: []
      }
    };
  }, [savedFormValues, vaultAddress]);

  const { hash, signAndSubmitTransaction, isPending } =
    useSignAndSubmitTransaction({
      onSuccess: (data) => {
        trackEvent('create_update_signatures_required_proposal', {
          hash: data.hash
        });
      }
    });

  const { isSuccess, isError } = useWaitForTransaction({ hash });

  const createProposal = async () => {
    if (!transactionPayload) return;
    signAndSubmitTransaction({ data: transactionPayload });
  };

  useEffect(() => {
    if (isSuccess) {
      toast.success('Successfully created the transaction');
      router.push(`/vault/${id}/transactions`);
    } else if (isError) {
      toast.error('Failed to create the transaction');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, isError]);

  return (
    <DialogContent>
      {page === 'update' && (
        <div className="w-full flex flex-col gap-4">
          <DialogHeader className="w-full">
            <DialogTitle>Update Signatures Required</DialogTitle>
            <DialogDescription>
              Update the number of signatures required to execute transactions
              in this vault.
            </DialogDescription>
          </DialogHeader>
          <Separator className="w-full" />
          <UpdateSignaturesRequiredForm
            ownersCount={ownersCount}
            currentSignaturesRequired={currentSignaturesRequired}
            onSubmit={(values) => {
              setSavedFormValues(values);
              setPage('confirm');
            }}
          />
        </div>
      )}

      {page === 'confirm' && savedFormValues && transactionPayload && (
        <div className="w-full flex flex-col gap-4">
          <DialogHeader className="w-full">
            <DialogTitle>Confirm New Proposal</DialogTitle>
            <DialogDescription>
              This proposal will update the number of signatures required to
              execute transactions.
            </DialogDescription>
          </DialogHeader>
          <Separator className="w-full" />
          <div className="flex flex-col gap-4 w-full">
            <div className="w-full">
              <h3 className="font-display text-lg font-semibold tracking-wide">
                New Signatures Required
              </h3>
              <div className="flex items-center mt-2 gap-2 font-display">
                <span className="font-medium">
                  {savedFormValues.signaturesRequired} signature
                  {savedFormValues.signaturesRequired === 1 ? '' : 's'}
                </span>{' '}
                <span className="text-muted-foreground">
                  required out of {ownersCount} owners
                </span>
              </div>
            </div>

            <div className="w-full">
              <h3 className="font-display text-lg font-semibold tracking-wide">
                Payload
              </h3>
              <div className="max-h-96 overflow-auto w-full p-2 border rounded-md text-xs mt-2 bg-secondary">
                <CodeBlock
                  value={jsonStringify(innerPayload)}
                  className="[&>pre]:!bg-transparent"
                />
              </div>
            </div>

            <Separator className="w-full mt-2" />

            <div className="w-full flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPage('update')}
              >
                Back
              </Button>
              <Button
                type="submit"
                className="flex-1"
                onClick={createProposal}
                isLoading={isPending}
                data-testid="update-signatures-required-create-proposal-button"
              >
                <Pencil1Icon />
                Create Proposal
              </Button>
            </div>
          </div>
        </div>
      )}
    </DialogContent>
  );
}
