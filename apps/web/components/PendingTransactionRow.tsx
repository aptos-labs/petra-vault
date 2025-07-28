import { PendingMultisigTransaction } from '@/hooks/useMultisigPendingTransactions';
import { getEntryFunctionDisplayName } from '@/lib/displayNames';
import { deserializeMultisigTransactionPayload } from '@/lib/payloads';
import { cn } from '@/lib/utils';
import { CheckIcon, GlobeIcon } from '@radix-ui/react-icons';
import { motion } from 'motion/react';
import { useMemo } from 'react';
import { Badge } from './ui/badge';
import useMultisigSignaturesRequired from '@/hooks/useMultisigSignaturesRequired';

interface PendingTransactionRowProps {
  transaction: PendingMultisigTransaction;
  sequenceNumber: number;
  isNext?: boolean;
  showSequenceNumber?: boolean;
}

export function PendingTransactionRow({
  transaction,
  sequenceNumber,
  isNext = false,
  showSequenceNumber = true
}: PendingTransactionRowProps) {
  const { data: signaturesRequired } = useMultisigSignaturesRequired({
    address: transaction.multisigAddress.toString()
  });

  const statusTextColor = useMemo(() => {
    return 'text-muted-foreground';
  }, []);

  const statusBackgroundColor = useMemo(() => {
    return 'bg-accent';
  }, []);

  const statusIcon = useMemo(() => {
    return <GlobeIcon className="size-4" />;
  }, []);

  const hasEnoughApprovals = useMemo(
    () => transaction.votes.approvals.length >= Number(signaturesRequired),
    [transaction.votes.approvals.length, signaturesRequired]
  );

  return (
    <motion.div className="flex items-center w-full p-2 px-4 hover:bg-secondary/70 group-data-expanded:!bg-secondary transition-all rounded-md cursor-pointer">
      <div
        className={cn(
          'p-2 items-center justify-between rounded-full hidden md:flex',
          statusBackgroundColor,
          statusTextColor
        )}
      >
        {statusIcon}
      </div>
      <div className="md:px-4 py-1 text-left">
        <p className={cn('text-sm font-display font-semibold')}>
          {transaction.payload
            ? getEntryFunctionDisplayName(
                deserializeMultisigTransactionPayload(transaction.payload)
                  .function
              )
            : 'Hashed Transaction'}
          {isNext && (
            <Badge
              variant="success"
              className="ml-2 uppercase text-[10px] md:text-xs"
            >
              Next
            </Badge>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          {transaction.creation && (
            <span className="text-xs">
              {transaction.creation.toLocaleString()}
            </span>
          )}
        </p>
      </div>
      <div className="flex flex-col md:flex-row items-center ml-auto gap-1 md:gap-4 ">
        {showSequenceNumber && (
          <Badge
            variant="outline"
            className="font-display text-[10px] md:text-xs"
          >
            Sequence Number #{sequenceNumber}
          </Badge>
        )}
        {signaturesRequired && (
          <Badge
            variant={hasEnoughApprovals ? 'success' : 'secondary'}
            className="ml-auto text-[10px] md:text-xs"
          >
            <CheckIcon />
            {transaction.votes.approvals.length} / {signaturesRequired}
          </Badge>
        )}
      </div>
    </motion.div>
  );
}
