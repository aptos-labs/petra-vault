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
import { hasWindow } from '@/lib/utils';
import { LoadingSpinner } from './LoaderSpinner';
import { useMutation } from '@tanstack/react-query';
import { ModuleViewReturnType } from '@/lib/types/modules';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { useVaults } from '@/context/useVaults';
import { Dialog, DialogTrigger } from './ui/dialog';
import UploadImportJSONModal from './modals/UploadImportJSONModal';
import { Vault } from '@/lib/types/vaults';
import { useRouter } from 'next/navigation';
import { AccountAddress, Network } from '@aptos-labs/ts-sdk';
import useAnalytics from '@/hooks/useAnalytics';

export default function OnboardingAddOrImport() {
  const trackEvent = useAnalytics();
  const router = useRouter();
  const { page, vaultName, importVaultAddress } = useOnboarding();
  const { vaults, importVaults } = useVaults();

  const { client } = useClients();

  const account = useAccount();
  const network = useNetwork();

  const { data: discoveredAccounts, isLoading: isLoadingDiscoveredAccounts } =
    useMultisigDiscoveredAccounts({
      address: account?.address.toString(),
      network
    });

  const filteredDiscoveredAccounts = discoveredAccounts?.filter(
    (e) =>
      !vaults.some((v) => v.address.equals(e) && v.network === network.network)
  );

  const {
    mutate: handleLookUpAndImportAccount,
    isPending: isLookingUpAndImporting
  } = useMutation({
    mutationFn: async (address: string) => {
      if (!account) {
        toast.error('Please connect your wallet to import a Multisig account');
        return;
      }

      try {
        const owners = await client.fetchViewModule<
          ModuleViewReturnType<'0x1::multisig_account::owners'>
        >({
          payload: {
            function: '0x1::multisig_account::owners',
            functionArguments: [address]
          }
        });

        if (
          owners
            .at(0)
            ?.find((e) => AccountAddress.from(e).equals(account?.address))
        ) {
          vaultName.set(address);
          page.set('set-name');
          importVaultAddress.set(address);
        } else {
          toast.error(
            'Your connected account is not an owner of this Multisig account.'
          );
        }
        trackEvent('manual_import_vault', { owners: owners.length });
      } catch {
        toast.error('This account is not a Multisig account');
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
                  Import an existing vault related to your wallet
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
              {isLoadingDiscoveredAccounts || !hasWindow() ? (
                <div
                  key="is-loading-discovered-accounts"
                  className="flex flex-col items-center gap-2"
                >
                  <LoadingSpinner className="my-4" />
                </div>
              ) : network.network === Network.DEVNET ? (
                <div className="pt-2">
                  <div className="flex flex-col items-center gap-2 border border-dashed bg-secondary rounded-sm">
                    <p className="text-muted-foreground text-xs font-display py-8">
                      Vault discovery is not available on Devnet.
                    </p>
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
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
