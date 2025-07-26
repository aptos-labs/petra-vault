import { AptosAvatar } from 'aptos-avatars-react';
import { truncateAddress } from '@aptos-labs/wallet-adapter-react';
import { Vault } from '@/lib/types/vaults';
import { createVaultId } from '@/lib/vaults';
import Link from 'next/link';
import { useAptBalance } from '@aptos-labs/react';
import { Skeleton } from './ui/skeleton';
import { formatUnits } from '@aptos-labs/js-pro';
import { AnimatePresence, motion } from 'motion/react';
import { Network } from '@aptos-labs/ts-sdk';

export default function VaultRow({ vault }: { vault: Vault }) {
  const { data: balance, isLoading: isLoadingBalance } = useAptBalance({
    address: vault.address,
    network: { network: vault.network }
  });

  return (
    <Link
      href={`/vault/${createVaultId(vault)}`}
      data-testid={`vault-row-${vault.address.toString()}`}
    >
      <motion.div className="flex items-center bg-secondary/70 rounded-md hover p-2 gap-2 hover:bg-secondary transition-colors cursor-pointer">
        <AptosAvatar value={vault.address.toString()} size={32} />
        <div className="flex flex-col">
          <div className="flex items-start gap-1">
            <p className="font-display text-sm font-semibold">{vault.name}</p>
            {vault.network !== Network.MAINNET && (
              <span className="capitalize text-xs opacity-30">
                {vault.network}
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-xs">
            {truncateAddress(vault.address.toString())}
          </p>
        </div>
        <div className="ml-auto">
          <AnimatePresence mode="popLayout">
            {isLoadingBalance || balance === undefined ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Skeleton className="w-10 h-4" />
              </motion.div>
            ) : (
              <motion.p
                key="balance"
                className="text-muted-foreground text-xs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {Number(formatUnits(balance, 8)).toLocaleString(undefined, {
                  minimumSignificantDigits: 2
                })}{' '}
                APT
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </Link>
  );
}
