'use client';

import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/components/ui/sidebar';
import { truncateAddress, useWallet } from '@aptos-labs/wallet-adapter-react';
import { AptosAvatar } from 'aptos-avatars-react';
import { Skeleton } from './ui/skeleton';
import {
  CaretSortIcon,
  CopyIcon,
  GlobeIcon,
  LinkBreak2Icon
} from '@radix-ui/react-icons';
import { getExplorerUrl } from '@aptos-labs/js-pro';
import { AnimatePresence, motion } from 'motion/react';

export function NavUser() {
  const { isMobile } = useSidebar();

  const { connected, account, disconnect, network } = useWallet();

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {!connected || !account || !network ? (
        <motion.div
          key="skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <Skeleton className="h-12 w-full rounded-lg" />
        </motion.div>
      ) : (
        <motion.div
          key="connected"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    disabled={!connected}
                    data-testid={`nav-user-${account.address.toString()}`}
                  >
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AptosAvatar
                        value={account?.address.toString() ?? ''}
                        size={32}
                      />
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {account.ansName ??
                          truncateAddress(account.address.toString())}
                      </span>
                      <span className="truncate text-xs capitalize text-muted-foreground">
                        {network.name}
                      </span>
                    </div>
                    <CaretSortIcon className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-sm"
                  side={isMobile ? 'bottom' : 'top'}
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AptosAvatar
                          value={account?.address.toString() ?? ''}
                          size={32}
                        />
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">
                          {account.ansName ??
                            truncateAddress(account.address.toString())}
                        </span>
                        <span className="truncate text-xs capitalize text-muted-foreground">
                          {network.name}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onClick={() => {
                        navigator.clipboard.writeText(
                          account.address.toString()
                        );
                      }}
                    >
                      <CopyIcon />
                      Copy Address
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        window.open(
                          getExplorerUrl({
                            network: network.name,
                            path: `account/${account.address.toString()}`
                          }),
                          '_blank'
                        );
                      }}
                    >
                      <GlobeIcon />
                      View in Explorer
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={disconnect}>
                    <LinkBreak2Icon />
                    Disconnect
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
