import { PendingMultisigTransaction } from '@/hooks/useMultisigPendingTransactions';
import { getEntryFunctionDisplayName } from '@/lib/displayNames';
import { deserializeMultisigTransactionPayload } from '@/lib/payloads';
import { cn } from '@/lib/utils';
import { CheckIcon, GlobeIcon } from '@radix-ui/react-icons';
import { motion } from 'motion/react';
import { useMemo } from 'react';
import { Badge } from './ui/badge';
import useMultisigSignaturesRequired from '@/hooks/useMultisigSignaturesRequired';
import useMultisigOwners from '@/hooks/useMultisigOwners';
import { AccountAddress } from '@aptos-labs/ts-sdk';

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
  const { data: multisigOwners } = useMultisigOwners({
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

  const votesByOwners = useMemo(() => {
    return transaction.votes.approvals.filter((approval) => {
      return multisigOwners?.some((owner) =>
        AccountAddress.from(owner).equals(AccountAddress.from(approval))
      );
    });
  }, [multisigOwners, transaction.votes.approvals]);

  const hasEnoughApprovals = useMemo(
    () => votesByOwners.length >= Number(signaturesRequired),
    [votesByOwners.length, signaturesRequired]
  );

  const isHashedTransaction = transaction.payload === undefined;

  const transactionPayload = useMemo(() => {
    if (!transaction.payload) return undefined;
    return deserializeMultisigTransactionPayload(transaction.payload);
  }, [transaction.payload]);

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
          {isHashedTransaction
            ? 'Hashed Transaction'
            : transactionPayload
              ? getEntryFunctionDisplayName(transactionPayload.function)
              : 'Unsupported Transaction'}
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
            {votesByOwners.length} / {signaturesRequired}
          </Badge>
        )}
      </div>
    </motion.div>
  );
}
