import { Separator } from "../ui/separator";

import { DialogTitle } from "../ui/dialog";

import { DialogContent, DialogHeader } from "../ui/dialog";

import { DialogDescription } from "../ui/dialog";
import { useEffect, useMemo } from "react";
import { createMultisigTransactionPayloadData } from "@/lib/payloads";
import { useActiveVault } from "@/context/ActiveVaultProvider";
import { InputEntryFunctionData } from "@aptos-labs/ts-sdk";
import CodeBlock from "../CodeBlock";
import { Button } from "../ui/button";
import { ExternalLinkIcon, Pencil1Icon } from "@radix-ui/react-icons";
import { toast } from "sonner";
import { getExplorerUrl } from "@aptos-labs/js-pro";
import { AptosAvatar } from "aptos-avatars-react";
import { truncateAddress } from "@aptos-labs/wallet-adapter-react";
import {
  useSignAndSubmitTransaction,
  useWaitForTransaction,
} from "@aptos-labs/react";
import { useRouter } from "next/navigation";
import { DialogClose } from "@radix-ui/react-dialog";
import { Abis } from "@/lib/abis";
import { jsonStringify } from "@/lib/storage";

export default function RemoveOwnerModal({
  ownerToRemove,
}: {
  ownerToRemove: string;
}) {
  const router = useRouter();

  const { vaultAddress, id, network, signaturesRequired, owners } =
    useActiveVault();

  const { transactionPayload, innerPayload } = useMemo(() => {
    const innerPayload = {
      function: "0x1::multisig_account::remove_owner",
      functionArguments: [ownerToRemove],
      typeArguments: [],
    } satisfies InputEntryFunctionData;

    const payload = createMultisigTransactionPayloadData({
      vaultAddress,
      payload: {
        abi: Abis["0x1::multisig_account::remove_owner"],
        ...innerPayload,
      },
    });

    return { transactionPayload: payload, innerPayload };
  }, [ownerToRemove, vaultAddress]);

  const { hash, signAndSubmitTransaction, isPending } =
    useSignAndSubmitTransaction();

  const { isSuccess } = useWaitForTransaction({ hash });

  const createProposal = async () => {
    if (!transactionPayload) return;
    signAndSubmitTransaction({ data: transactionPayload });
  };

  useEffect(() => {
    if (isSuccess) {
      toast.success("Successfully created the transaction");
      router.push(`/vault/${id}/transactions`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  return (
    <DialogContent>
      <div className="w-full flex flex-col gap-4">
        <DialogHeader className="w-full">
          <DialogTitle>Confirm New Proposal</DialogTitle>
          <DialogDescription>
            This proposal will remove an owner from the vault.
          </DialogDescription>
        </DialogHeader>
        <Separator className="w-full" />
        <div className="flex flex-col gap-4 w-full">
          <div className="w-full">
            <h3 className="font-display text-lg font-semibold tracking-wide">
              Owner to Remove
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <AptosAvatar value={ownerToRemove} size={20} />
              <p className="font-display text-sm font-medium ml-1">
                {truncateAddress(ownerToRemove)}
              </p>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" className="size-7" asChild>
                  <a
                    href={getExplorerUrl({
                      network,
                      path: `account/${ownerToRemove}`,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLinkIcon />
                  </a>
                </Button>
              </div>
            </div>
          </div>

          {signaturesRequired.data && owners.data && (
            <div className="w-full">
              <h3 className="font-display text-lg font-semibold tracking-wide">
                New Signatures Required
              </h3>
              <div className="flex items-center mt-2 gap-2 font-display">
                <span className="font-medium">
                  {signaturesRequired.data} signature
                  {signaturesRequired.data === 1 ? "" : "s"}
                </span>{" "}
                <span className="text-muted-foreground">
                  required out of {owners.data.length - 1} owners
                </span>
              </div>
            </div>
          )}

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
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              className="flex-1"
              onClick={createProposal}
              isLoading={isPending}
            >
              <Pencil1Icon />
              Create Proposal
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  );
}
