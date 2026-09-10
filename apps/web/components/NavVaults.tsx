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
import { useEffect, useMemo, useRef, useState } from 'react';
import { createVaultId, parseVaultId } from '@/lib/vaults';
import { truncateAddress } from '@aptos-labs/wallet-adapter-react';
import { AptosAvatar } from 'aptos-avatars-react';
import { Network } from '@aptos-labs/ts-sdk';
import {
  CaretSortIcon,
  CheckCircledIcon,
  MagnifyingGlassIcon,
  PlusIcon
} from '@radix-ui/react-icons';
import { Button } from './ui/button';
import { Input } from './ui/input';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Vault } from '@/lib/types/vaults';

/**
 * Fewer vaults than this fit in the menu without help, so the list renders in
 * full and the search field stays out of the way.
 */
const LONG_VAULT_LIST_LENGTH = 6;

export function NavVaults() {
  const router = useRouter();

  const { vaultId } = useParams();

  const { vaults } = useVaults();

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const isVaultListLong = vaults.length >= LONG_VAULT_LIST_LENGTH;

  // The menu focuses its content when it opens, so take focus back on the next
  // frame to let the list be filtered by typing right away.
  useEffect(() => {
    if (!isOpen || !isVaultListLong) return;
    const frame = requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [isOpen, isVaultListLong]);

  // Short lists have no search field, so they are never filtered.
  const query = isVaultListLong ? search.trim().toLowerCase() : '';

  const filteredVaults = useMemo(() => {
    if (!query) return vaults;
    return vaults.filter(
      (vault) =>
        vault.name.toLowerCase().includes(query) ||
        vault.address.toString().toLowerCase().includes(query)
    );
  }, [vaults, query]);

  const isVaultSelected = (vault: Vault) =>
    !!selectedVault?.address.equals(vault.address) &&
    selectedVault?.network === vault.network;

  const handleSelectVault = (vault: Vault) => {
    setIsOpen(false);
    if (isVaultSelected(vault)) return;
    router.push(`/vault/${createVaultId(vault)}`);
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) setSearch('');
          }}
        >
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
            {isVaultListLong && (
              <div className="px-1 pb-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={(event) => {
                      // The menu's typeahead would otherwise swallow the keys
                      // typed here to move focus between vaults instead.
                      if (event.key.length === 1) event.stopPropagation();
                      if (event.key === 'Enter' && filteredVaults[0]) {
                        handleSelectVault(filteredVaults[0]);
                      }
                    }}
                    placeholder="Search vaults"
                    className="h-8 pl-8"
                    data-testid="nav-vaults-search-input"
                  />
                </div>
              </div>
            )}
            {query && filteredVaults.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No vaults found
              </div>
            ) : (
              <div
                className={cn(
                  'flex flex-col gap-1',
                  isVaultListLong &&
                    'max-h-64 overflow-y-auto overflow-x-hidden'
                )}
              >
                {filteredVaults.map((vault) => {
                  const isSelected = isVaultSelected(vault);
                  return (
                    <DropdownMenuItem
                      key={`${vault.address.toString()}-${vault.network}`}
                      onClick={() => handleSelectVault(vault)}
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
              </div>
            )}
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
