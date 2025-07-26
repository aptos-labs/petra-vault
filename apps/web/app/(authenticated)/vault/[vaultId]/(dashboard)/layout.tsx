'use client';

import { useCoins } from '@/context/CoinsProvider';
import { useActiveVault } from '@/context/ActiveVaultProvider';
import { hasWindow } from '@/lib/utils';
import { AnimatePresence, motion } from 'motion/react';
import { PropsWithChildren, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowTopRightIcon } from '@radix-ui/react-icons';
import { ArrowDownRightIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import ReceiveModal from '@/components/modals/ReceiveModal';
import PageVaultHeader from '@/components/PageVaultHeader';
import SendCoinsModal from '@/components/modals/SendCoinsModal';
import useAnalytics from '@/hooks/useAnalytics';
import LayoutTabs from '@/components/LayoutTabs';

const tabs = [
  {
    id: 'coins',
    label: 'Coins',
    href: '/vault/[vaultId]'
  },
  {
    id: 'transactions',
    label: 'Transactions',
    href: '/vault/[vaultId]/transactions'
  }
];

export default function VaultLayout({ children }: PropsWithChildren) {
  const trackEvent = useAnalytics();
  const [isSendCoinsModalOpen, setIsSendCoinsModalOpen] = useState(false);

  const { totalValue, isLoading: isLoadingCoins } = useCoins();

  const { isOwner } = useActiveVault();

  return (
    <div className="p-4 md:p-8 flex flex-col h-full">
      <PageVaultHeader title="Dashboard" />

      <br />

      <div className="md:flex md:items-center md:justify-between">
        <div>
          <AnimatePresence mode="popLayout" initial={false}>
            {isLoadingCoins || !hasWindow() || totalValue === undefined ? (
              <motion.div
                key="portfolio-balance-skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-2"
              >
                <Skeleton key="label-skeleton" className="w-24 h-5" />
                <Skeleton key="value-skeleton" className="w-32 h-9" />
              </motion.div>
            ) : (
              <motion.div
                key="portfolio-balance"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-2"
              >
                <p className="font-display tracking-wide text-sm">
                  Total Balance
                </p>
                <p className="text-3xl font-display font-bold tracking-wide">{`$${(totalValue ?? 0).toLocaleString()}`}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex gap-2 mt-4 md:mt-0 w-full md:w-auto">
          <Dialog
            open={isSendCoinsModalOpen}
            onOpenChange={setIsSendCoinsModalOpen}
          >
            <Button
              size="lg"
              className="px-6 flex-1 md:flex-none rounded-md"
              onClick={() => {
                trackEvent('send_coins_review_draft', {});
                setIsSendCoinsModalOpen(true);
              }}
              disabled={!isOwner}
              data-testid="send-coins-button"
            >
              Send <ArrowTopRightIcon className="w-6 h-6" />
            </Button>
            <SendCoinsModal onClose={() => setIsSendCoinsModalOpen(false)} />
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="px-6 flex-1 md:flex-none rounded-md"
                variant="outline"
              >
                Receive <ArrowDownRightIcon className="w-6 h-6" />
              </Button>
            </DialogTrigger>
            <ReceiveModal />
          </Dialog>
        </div>
      </div>

      <br />

      <LayoutTabs layoutId="dashboard" tabs={tabs} />

      <div className="flex-1">{children}</div>
    </div>
  );
}
