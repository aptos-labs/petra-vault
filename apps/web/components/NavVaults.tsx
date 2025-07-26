'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar';
import { useParams, useRouter } from 'next/navigation';
import { useVaults } from '@/context/useVaults';
import { useMemo } from 'react';
import { createVaultId, parseVaultId } from '@/lib/vaults';
import { truncateAddress } from '@aptos-labs/wallet-adapter-react';
import { AptosAvatar } from 'aptos-avatars-react';
import { Network } from '@aptos-labs/ts-sdk';
import {
  CaretSortIcon,
  CheckCircledIcon,
  PlusIcon
} from '@radix-ui/react-icons';
import { Button } from './ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function NavVaults() {
  const router = useRouter();

  const { vaultId } = useParams();

  const { vaults } = useVaults();

  const parsedVaultId = parseVaultId(decodeURIComponent(vaultId as string));

  const selectedVault = useMemo(() => {
    return (
      parsedVaultId &&
      vaults.find(
        (vault) =>
          vault.address.equals(parsedVaultId.address) &&
          vault.network === parsedVaultId.network
      )
    );
  }, [vaults, parsedVaultId]);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            asChild
            data-testid="nav-vaults-dropdown-menu-trigger"
          >
            <SidebarMenuButton
              size="lg"
              variant="outline"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground bg-secondary"
            >
              {parsedVaultId && (
                <div className="flex aspect-square size-8 items-center justify-center">
                  <AptosAvatar
                    value={parsedVaultId?.address.toString() ?? ''}
                    size={32}
                  />
                </div>
              )}
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold font-display">
                  {selectedVault ? selectedVault.name : 'No vault selected'}
                </span>
                <span className="text-muted-foreground">
                  {selectedVault
                    ? truncateAddress(selectedVault.address.toString())
                    : 'Select a vault'}
                </span>
              </div>
              <CaretSortIcon className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 flex flex-col gap-1"
            align="start"
          >
            <div className="p-2 text-sm text-muted-foreground w-full">
              Select a Petra Vault
            </div>
            {vaults.map((vault) => {
              const isSelected =
                selectedVault?.address.equals(vault.address) &&
                selectedVault?.network === vault.network;
              return (
                <DropdownMenuItem
                  key={`${vault.address.toString()}-${vault.network}`}
                  onClick={() => {
                    if (isSelected) return;
                    router.push(`/vault/${createVaultId(vault)}`);
                  }}
                  className={cn(
                    'flex p-2',
                    isSelected && 'bg-secondary hover:!bg-secondary'
                  )}
                  data-testid={`nav-vault-${vault.address.toString()}-${vault.network}`}
                >
                  <AptosAvatar value={vault.address.toString()} size={32} />
                  <div className="flex leading-none min-w-56">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-end gap-1">
                        <span className="font-semibold font-display">
                          {vault.name}
                        </span>
                        {vault.network !== Network.MAINNET && (
                          <span className="capitalize text-xs opacity-30">
                            {vault.network}
                          </span>
                        )}
                      </div>
                      <span className="text-muted-foreground">
                        {truncateAddress(vault.address.toString())}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      {isSelected && (
                        <CheckCircledIcon className="size-4 text-green-700" />
                      )}
                    </div>
                  </div>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="hover:!bg-transparent">
              <Link href="/onboarding" className="w-full">
                <Button variant="outline" className="w-full ">
                  <PlusIcon />
                  Create Vault
                </Button>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
