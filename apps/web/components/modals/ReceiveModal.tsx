import {
  DialogContent,
  DialogDescription,
  DialogTitle
} from '@/components/ui/dialog';
import { useActiveVault } from '@/context/ActiveVaultProvider';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'motion/react';
import { Button } from '../ui/button';
import { ShareIcon } from 'lucide-react';
import { toast } from 'sonner';
import { truncateAddress } from '@aptos-labs/wallet-adapter-react';
import { AptosAvatar } from 'aptos-avatars-react';
import VerticalCutReveal from '../ui/vertical-cut-reveal';
import CopyButton from '../CopyButton';

export default function ReceiveModal() {
  const { vaultAddress, vault } = useActiveVault();

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Hello, check out my Petra Vault!',
          text: `\nHere's my vault address: ${vaultAddress}\n`,
          url: window.location.href
        });
      } else {
        // Fallback for browsers that don't support the Web Share API
        navigator.clipboard.writeText(vaultAddress);
        toast.success(
          'Address copied to clipboard (sharing not supported in this browser)'
        );
      }
    } catch {
      /* empty */
    }
  };

  return (
    <DialogContent className="max-w-md">
      <DialogTitle />
      <DialogDescription />
      <div className="flex flex-col gap-4 py-4">
        <div className="flex flex-col items-center">
          <div className="font-display text-lg font-semibold">
            <VerticalCutReveal
              splitBy="characters"
              staggerDuration={0.025}
              staggerFrom="first"
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 21
              }}
            >
              Receive Assets
            </VerticalCutReveal>
          </div>
          <div className="text-sm text-muted-foreground">
            <VerticalCutReveal
              splitBy="characters"
              staggerDuration={0.015}
              staggerFrom="first"
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 21
              }}
            >
              Use this wallet address to receive assets.
            </VerticalCutReveal>
          </div>
        </div>

        <motion.div
          className="relative flex items-center justify-center p-4 w-fit mx-auto rounded-sm border"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.8,
            type: 'spring',
            delay: 0.25
          }}
        >
          <QRCodeSVG
            value={vaultAddress}
            size={200}
            bgColor={'#ffffff'}
            fgColor={'#000000'}
            level={'H'}
          />
          <div className="absolute top-1/2 right-1/2 -translate-y-1/2 translate-x-1/2">
            <div className="bg-background p-2 rounded-full">
              <AptosAvatar value={vaultAddress} size={48} />
            </div>
          </div>
        </motion.div>

        <div className="flex items-center justify-center w-full flex-col gap-4">
          <div className="flex flex-col items-center">
            <h3 className="font-display font-semibold">
              <VerticalCutReveal
                staggerDuration={0.025}
                staggerFrom="last"
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 21,
                  delay: 0.2
                }}
              >
                {vault?.name}
              </VerticalCutReveal>
            </h3>
            <p className="text-sm text-muted-foreground">
              <VerticalCutReveal
                staggerDuration={0.015}
                staggerFrom="first"
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 21,
                  delay: 0.2
                }}
              >
                {truncateAddress(vaultAddress)}
              </VerticalCutReveal>
            </p>
          </div>

          <motion.div
            className="flex justify-center items-center gap-10 w-full"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, type: 'spring', delay: 0.3 }}
          >
            <div className="flex flex-col items-center gap-2">
              <CopyButton text={vaultAddress} />
              <p className="text-sm text-muted-foreground">Copy</p>
            </div>

            <div className="flex flex-col items-center gap-2">
              <Button variant="outline" size="icon" onClick={handleShare}>
                <ShareIcon />
              </Button>
              <p className="text-sm text-muted-foreground">Share</p>
            </div>
          </motion.div>
        </div>
      </div>
    </DialogContent>
  );
}
