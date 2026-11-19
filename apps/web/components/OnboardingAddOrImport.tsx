'use client';

import MultisigNameForm from '@/components/forms/VaultNameForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import useMultisigDiscoveredAccounts from '@/hooks/useMultisigDiscoveredAccounts';
import { getExplorerUrl } from '@aptos-labs/js-pro';
import { useAccount, useClients, useNetwork } from '@aptos-labs/react';
import { AptosAvatar } from 'aptos-avatars-react';
import { ExternalLinkIcon } from 'lucide-react';
import { truncateAddress } from '@aptos-labs/wallet-adapter-react';
import { useOnboarding } from '@/context/OnboardingProvider';
import ExpandingContainer from './ExpandingContainer';
import { LoadingSpinner } from './LoaderSpinner';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { useVaults } from '@/context/useVaults';
import { Dialog, DialogTrigger } from './ui/dialog';
import UploadImportJSONModal from './modals/UploadImportJSONModal';
import { Vault } from '@/lib/types/vaults';
import { useRouter } from 'next/navigation';
import { Network } from '@aptos-labs/ts-sdk';
import {
  MultisigOwnershipResult,
  parseVaultAddress,
  verifyMultisigOwnership
} from '@/lib/multisigDiscovery';
import useAnalytics from '@/hooks/useAnalytics';

export default function OnboardingAddOrImport() {
  const trackEvent = useAnalytics();
  const router = useRouter();
  const { page, vaultName, importVaultAddress } = useOnboarding();
  const { vaults, importVaults } = useVaults();

  const { aptos } = useClients();

  const account = useAccount();
  const network = useNetwork();

  const {
    data: discovery,
    isLoading: isLoadingDiscoveredAccounts,
    isError: isDiscoveryError,
    error: discoveryError,
    isFetching: isFetchingDiscovery,
    refetch: refetchDiscovery
  } = useMultisigDiscoveredAccounts({
    address: account?.address.toString(),
    network
  });

  const filteredDiscoveredAccounts = discovery?.accounts.filter(
    (e) =>
      !vaults.some((v) => v.address.equals(e) && v.network === network.network)
  );

  const {
    mutate: handleLookUpAndImportAccount,
    isPending: isLookingUpAndImporting
  } = useMutation({
    mutationFn: async (input: string) => {
      if (!account) {
        toast.error('Please connect your wallet to import a Multisig account');
        return;
      }

      const vaultAddress = parseVaultAddress(input);
      if (!vaultAddress) {
        toast.error(
          'This is not a valid address. Enter the vault address, starting with 0x.'
        );
        return;
      }

      let ownership: MultisigOwnershipResult;
      try {
        ownership = await verifyMultisigOwnership(
          aptos,
          vaultAddress,
          account.address
        );
      } catch (error) {
        // A failed request says nothing about the address; don't report it as
        // "not a multisig".
        toast.error(
          `Could not verify this vault on ${network.network}: ${
            error instanceof Error ? error.message : 'unknown error'
          }. Please try again.`
        );
        return;
      }

      switch (ownership.status) {
        case 'owner':
          trackEvent('manual_import_vault', {
            owners: ownership.owners.length
          });
          vaultName.set(vaultAddress.toString());
          page.set('set-name');
          importVaultAddress.set(vaultAddress.toString());
          break;
        case 'not-owner':
          toast.error(
            'Your connected account is not an owner of this Multisig account.'
          );
          break;
        case 'not-multisig':
          toast.error(
            `This address is not a Multisig account on ${network.network}. Check the address and that your wallet is on the right network.`
          );
          break;
      }
    }
  });

  const handleImportVaults = (vaults: Vault[]) => {
    trackEvent('backup_import_vault', { vault_count: vaults.length });
    importVaults(vaults);
    router.push(`/`);
    toast.success(
      `Imported ${vaults.length} vault${vaults.length > 1 ? 's' : ''} successfully`
    );
  };

  return (
    <motion.div
      className="w-full flex flex-col gap-2 pb-12"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
    >
      <Card className="w-full">
        <CardContent>
          <MultisigNameForm
            onSubmit={(values) => {
              vaultName.set(values.name);
              importVaultAddress.set('');
              page.set('set-config');
              trackEvent('set_vault_name', {});
            }}
          />
        </CardContent>
      </Card>

      <div className="relative w-full text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border my-2">
        <span className="relative z-10 bg-background px-2 font-display text-muted-foreground">
          Or Import an Existing Vault
        </span>
      </div>

      <div className="w-full flex flex-col gap-2">
        <div className="flex justify-between">
          <Label>Vault Address</Label>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Enter a vault address"
            value={importVaultAddress.current}
            onChange={(e) => importVaultAddress.set(e.target.value)}
          />

          <Button
            variant="secondary"
            isLoading={isLookingUpAndImporting}
            disabled={!importVaultAddress.current}
            onClick={() => {
              if (importVaultAddress.current) {
                handleLookUpAndImportAccount(importVaultAddress.current);
              }
            }}
          >
            Import Vault
          </Button>
        </div>
        <Card className="flex gap-2 mt-2">
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-display text-sm font-semibold">
                  Discovered Vaults
                </h3>
                <p className="font-display text-xs text-muted-foreground">
                  Vaults your wallet created or has voted on
                </p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="link"
                    size="sm"
                    className="py-0 text-xs h-fit"
                    data-testid="import-vaults-json-button"
                  >
                    Import Backup File
                  </Button>
                </DialogTrigger>
                <UploadImportJSONModal onImport={handleImportVaults} />
              </Dialog>
            </div>

            <ExpandingContainer debounce={100}>
              {!account || isLoadingDiscoveredAccounts ? (
                <div
                  key="is-loading-discovered-accounts"
                  className="flex flex-col items-center gap-2"
                >
                  <LoadingSpinner className="my-4" />
                </div>
              ) : network.network === Network.DEVNET ? (
                <div className="pt-2">
                  <div className="flex flex-col items-center gap-2 border border-dashed bg-secondary rounded-sm">
                    <p className="text-muted-foreground text-xs font-display py-8 px-4 text-center">
                      Vault discovery is not available on Devnet. Enter a vault
                      address above or import a backup file.
                    </p>
                  </div>
                </div>
              ) : isDiscoveryError ? (
                <div key="discovery-error" className="pt-2">
                  <div
                    className="flex flex-col items-center gap-2 border border-dashed bg-secondary rounded-sm px-4 py-6 text-center"
                    data-testid="vault-discovery-error"
                  >
                    <p className="text-destructive text-xs font-display font-semibold">
                      Vault discovery failed
                    </p>
                    <p className="text-muted-foreground text-xs font-display break-words max-w-full">
                      {discoveryError instanceof Error
                        ? discoveryError.message
                        : 'An unknown error occurred.'}
                    </p>
                    <p className="text-muted-foreground text-xs font-display">
                      This does not mean you have no vaults. Try again, enter a
                      vault address above, or import a backup file.
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      isLoading={isFetchingDiscovery}
                      onClick={() => refetchDiscovery()}
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              ) : filteredDiscoveredAccounts?.length === 0 ? (
                <div className="pt-2">
                  <div className="flex flex-col items-center gap-2 border border-dashed bg-secondary rounded-sm">
                    <p className="text-muted-foreground text-xs font-display py-8">
                      No vaults found
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  key="discovered-accounts"
                  className="flex flex-col gap-2 max-h-72 overflow-scroll overflow-x-hidden"
                >
                  {filteredDiscoveredAccounts?.map((e) => (
                    <div
                      key={e.toString()}
                      className="flex items-center gap-2 mt-2"
                    >
                      <AptosAvatar value={e.toString()} size={20} />
                      <p className="font-display text-sm font-medium ml-1">
                        {truncateAddress(e.toString())}
                      </p>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        asChild
                      >
                        <a
                          href={getExplorerUrl({
                            network: network.network,
                            path: `account/${e.toString()}`
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLinkIcon />
                        </a>
                      </Button>
                      <div className="flex items-center gap-2 ml-auto">
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => {
                            trackEvent('select_discovered_vault', {});
                            importVaultAddress.set(e.toString());
                            handleLookUpAndImportAccount(e.toString());
                          }}
                        >
                          Import
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ExpandingContainer>

            {account &&
              network.network !== Network.DEVNET &&
              !isLoadingDiscoveredAccounts && (
                <div
                  className="mt-3 flex flex-col gap-1 text-xs font-display text-muted-foreground"
                  data-testid="vault-discovery-help"
                >
                  {discovery?.truncated && (
                    <p>
                      Only your most recent multisig activity was scanned, so
                      older vaults may be missing.
                    </p>
                  )}
                  {discovery && discovery.failedLookups > 0 && (
                    <p>
                      {discovery.failedLookups} lookup
                      {discovery.failedLookups > 1 ? 's' : ''} failed, so this
                      list may be incomplete.{' '}
                      <button
                        type="button"
                        className="underline underline-offset-2"
                        onClick={() => refetchDiscovery()}
                      >
                        Retry
                      </button>
                    </p>
                  )}
                  <p>
                    Only vaults this wallet created or has proposed or voted on
                    can be discovered. Can&apos;t see yours, for example because
                    you were just added as an owner? Ask a co-owner for the
                    vault address and enter it above, or import a backup file.
                    Ownership is always verified on-chain before importing.
                  </p>
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
