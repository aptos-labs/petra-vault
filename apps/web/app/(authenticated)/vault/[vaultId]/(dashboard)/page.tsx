'use client';

import { useCoins } from '@/context/CoinsProvider';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo } from 'react';
import { parseUnits } from '@aptos-labs/js-pro';
import { Skeleton } from '@/components/ui/skeleton';
import CoinAvatar from '@/components/CoinAvatar';
import TokenPriceChart from '@/components/TokenPriceChart';

export default function VaultPage() {
  const { coins } = useCoins();

  const sortedCoins = useMemo(() => {
    if (!coins) return undefined;

    return [...coins].sort((a, b) => {
      let aValue: bigint = BigInt(0);
      let bValue: bigint = BigInt(0);

      aValue = a.price?.usd
        ? parseUnits(a.balance.amount.toString(), a.balance.metadata.decimals) *
          parseUnits(a.price.usd.toFixed(20), 2)
        : 0n;

      bValue = b.price?.usd
        ? parseUnits(b.balance.amount.toString(), b.balance.metadata.decimals) *
          parseUnits(b.price.usd.toFixed(20), 2)
        : 0n;

      return Number(bValue - aValue);
    });
  }, [coins]);

  return (
    <div className="h-full">
      <br />
      <AnimatePresence mode="popLayout" initial={false}>
        {!sortedCoins ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 rounded-lg border border-border/50"
              >
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="text-right space-y-2">
                  <Skeleton className="h-4 w-20 ml-auto" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                </div>
              </div>
            ))}
          </motion.div>
        ) : sortedCoins.length === 0 ? (
          <motion.div
            key="no-coins"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-16 font-display text-muted-foreground bg-secondary border border-dashed rounded-lg"
          >
            No coins found in this vault
          </motion.div>
        ) : (
          <motion.div
            key="coins"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {sortedCoins.map((coin, index) => {
              const { balance, price, metadata } = coin;
              const amount =
                Number(balance.amount) /
                Math.pow(10, balance.metadata.decimals);
              const formattedAmount = amount.toLocaleString(undefined, {
                maximumFractionDigits: 6
              });

              const symbol = metadata?.symbol || balance.metadata.symbol;
              const name = metadata?.name || balance.metadata.name;

              // Calculate USD value if price is available
              const usdValue = price?.usd
                ? (amount * price.usd).toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    maximumFractionDigits: 2
                  })
                : undefined;

              return (
                <motion.div
                  key={balance.metadata.assetType}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-2 md:gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <CoinAvatar coin={coin} size="lg" />

                  <div className="flex-1">
                    <div className="font-medium font-display text-sm md:text-md">
                      {name}
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground">
                      {price?.usd ? (
                        <span>{`$${price.usd.toFixed(2)} `}</span>
                      ) : undefined}
                      {price?.usd_24h_change ? (
                        <span
                          className={
                            price.usd_24h_change > 0
                              ? 'text-green-500'
                              : 'text-red-500'
                          }
                        >
                          {price.usd_24h_change.toFixed(2)}%
                        </span>
                      ) : undefined}
                      {metadata?.website_url && (
                        <a
                          href={metadata.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-[10px] md:text-xs underline hover:text-primary"
                        >
                          Website
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="hidden sm:block">
                    <TokenPriceChart
                      address={balance.metadata.assetType}
                      className="mx-2"
                    />
                  </div>

                  <div className="text-right">
                    <div className="font-medium font-display text-sm md:text-md">
                      {formattedAmount} {symbol}
                    </div>
                    {usdValue && (
                      <div className="text-xs md:text-sm text-muted-foreground">
                        {usdValue}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
