import AddOwnerProposalForm, {
  AddOwnerProposalFormValues
} from '../forms/AddOwnerProposalForm';

import { Separator } from '../ui/separator';

import { DialogTitle } from '../ui/dialog';

import { DialogContent, DialogHeader } from '../ui/dialog';

import { DialogDescription } from '../ui/dialog';
import { useEffect, useMemo, useState } from 'react';
import { createMultisigTransactionPayloadData } from '@/lib/payloads';
import { useActiveVault } from '@/context/ActiveVaultProvider';
import CodeBlock from '../CodeBlock';
import { Button } from '../ui/button';
import { ExternalLinkIcon, Pencil1Icon } from '@radix-ui/react-icons';
import { toast } from 'sonner';
import { getExplorerUrl } from '@aptos-labs/js-pro';
import { AptosAvatar } from 'aptos-avatars-react';
import {
  useSignAndSubmitTransaction,
  useWaitForTransaction
} from '@aptos-labs/react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Abis } from '@/lib/abis';
import { jsonStringify } from '@/lib/storage';
import useAnalytics from '@/hooks/useAnalytics';
import AddressDisplay from '../AddressDisplay';

export default function AddOwnerModal({
  owners,
  signaturesRequired
}: {
  owners: string[];
  signaturesRequired: number;
}) {
  const trackEvent = useAnalytics();
  const queryClient = useQueryClient();
  const [page, setPage] = useState<'add' | 'confirm'>('add');
  const [savedFormValues, setSavedFormValues] =
    useState<AddOwnerProposalFormValues>();

  const router = useRouter();

  const { vaultAddress, id, network } = useActiveVault();

  const { transactionPayload, innerPayload } = useMemo(() => {
    if (!savedFormValues)
      return { transactionPayload: undefined, innerPayload: undefined };

    const payload = createMultisigTransactionPayloadData({
      vaultAddress,
      payload: {
        abi: Abis[
          '0x1::multisig_account::add_owners_and_update_signatures_required'
        ],
        function:
          '0x1::multisig_account::add_owners_and_update_signatures_required',
        functionArguments: [
          [savedFormValues.address],
          savedFormValues.signaturesRequired
        ]
      }
    });

    return {
      transactionPayload: payload,
      innerPayload: {
        function:
          '0x1::multisig_account::add_owners_and_update_signatures_required',
        functionArguments: [
          [savedFormValues.address],
          savedFormValues.signaturesRequired
        ],
        typeArguments: []
      }
    };
  }, [savedFormValues, vaultAddress]);

  const { hash, signAndSubmitTransaction, isPending } =
    useSignAndSubmitTransaction({
      onSuccess: (data) => {
        trackEvent('create_add_owner_proposal', { hash: data.hash });
      }
    });

  const { isSuccess, isError } = useWaitForTransaction({ hash });

  const createProposal = async () => {
    if (!transactionPayload) return;
    signAndSubmitTransaction({ data: transactionPayload });
  };

  useEffect(() => {
    if (isSuccess) {
      queryClient.invalidateQueries();
      toast.success('Successfully created the transaction');
      router.push(`/vault/${id}/transactions`);
    } else if (isError) {
      toast.error('Failed to create the transaction');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, isError]);

  return (
    <DialogContent>
      {page === 'add' && (
        <div className="w-full flex flex-col gap-4">
          <DialogHeader className="w-full">
            <DialogTitle>Add Owners</DialogTitle>
            <DialogDescription>
              Add additional owners to the vault that can vote, propose, and
              execute transactions. transactions.
            </DialogDescription>
          </DialogHeader>
          <Separator className="w-full" />
          <AddOwnerProposalForm
            vaultAddress={vaultAddress}
            owners={owners?.map((owner) => owner) ?? []}
            signaturesRequired={Number(signaturesRequired ?? 1)}
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
              This proposal will add a new owner to the vault that can vote,
              propose, and execute transactions.
            </DialogDescription>
          </DialogHeader>
          <Separator className="w-full" />
          <div className="flex flex-col gap-4 w-full">
            <div className="w-full">
              <h3 className="font-display text-lg font-semibold tracking-wide">
                New Owner
              </h3>
              <div className="flex items-center gap-2 mt-2">
                <AptosAvatar value={savedFormValues.address} size={20} />
                <p className="font-display text-sm font-medium ml-1">
                  <AddressDisplay address={savedFormValues.address} />
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    asChild
                  >
                    <a
                      href={getExplorerUrl({ network })}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLinkIcon />
                    </a>
                  </Button>
                </div>
              </div>
            </div>

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
                  required out of {(owners?.length ?? 0) + 1} owners
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
                onClick={() => setPage('add')}
              >
                Back
              </Button>
              <Button
                type="submit"
                className="flex-1"
                onClick={createProposal}
                isLoading={isPending}
                data-testid="add-owner-create-proposal-button"
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
