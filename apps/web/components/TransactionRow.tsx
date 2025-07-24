'use client';

import { ExecutionEvent } from '@/hooks/useMultisigExecutionEvents';
import { getEntryFunctionDisplayName } from '@/lib/displayNames';
import {
  EntryFunctionPayloadResponse,
  MultisigPayloadResponse,
  Network,
  UserTransactionResponse
} from '@aptos-labs/ts-sdk';
import {
  CheckCircledIcon,
  CheckIcon,
  Cross1Icon,
  CrossCircledIcon,
  ExclamationTriangleIcon,
  GlobeIcon
} from '@radix-ui/react-icons';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { getExplorerUrl } from '@aptos-labs/js-pro';
import { AptosAvatar } from 'aptos-avatars-react';
import AddressDisplay from './AddressDisplay';
import { deserializeMultisigTransactionPayload } from '@/lib/payloads';

interface TransactionRowProps {
  transaction: UserTransactionResponse;
  network?: Network;
  executionEvent?: ExecutionEvent;
}

export default function TransactionRow({
  transaction,
  network,
  executionEvent
}: TransactionRowProps) {
  let transactionPayload:
    | Pick<EntryFunctionPayloadResponse, 'function'>
    | undefined;

  if (transaction.payload.type === 'entry_function_payload') {
    transactionPayload = transaction.payload as EntryFunctionPayloadResponse;
  }

  if (transaction.payload.type === 'multisig_payload') {
    transactionPayload = (transaction.payload as MultisigPayloadResponse)
      .transaction_payload;
  }

  if (!transactionPayload && executionEvent?.payload) {
    transactionPayload = deserializeMultisigTransactionPayload(
      executionEvent.payload
    ) as Pick<EntryFunctionPayloadResponse, 'function'>;
  }

  const statusTextColor = useMemo(() => {
    if (executionEvent?.type === 'success') return 'text-green-700';
    if (executionEvent?.type === 'failed') return 'text-yellow-700';
    if (executionEvent?.type === 'rejected')
      return 'text-destructive-foreground';
    return 'text-muted-foreground';
  }, [executionEvent]);

  const statusBackgroundColor = useMemo(() => {
    if (executionEvent?.type === 'success') return 'bg-green-500/20';
    if (executionEvent?.type === 'failed') return 'bg-yellow-500/20';
    if (executionEvent?.type === 'rejected') return 'bg-destructive/20';
    return 'bg-accent';
  }, [executionEvent]);

  const statusIcon = useMemo(() => {
    if (executionEvent?.type === 'success')
      return <CheckIcon className="size-4" />;
    if (executionEvent?.type === 'failed')
      return <ExclamationTriangleIcon className="size-4" />;
    if (executionEvent?.type === 'rejected')
      return <Cross1Icon className="size-4" />;
    return <GlobeIcon className="size-4" />;
  }, [executionEvent]);

  if (!transactionPayload) return null;

  return (
    <motion.a
      href={getExplorerUrl({
        network: network,
        path: `txn/${transaction.version}`
      })}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center w-full p-2 px-4 rounded-md hover:bg-secondary cursor-pointer transition-all"
    >
      <div
        className={cn(
          'flex p-1 md:p-2 items-center justify-between rounded-full w-fit',
          statusBackgroundColor,
          statusTextColor
        )}
      >
        {statusIcon}
      </div>

      <div className="flex flex-col flex-1 px-2 md:px-4 py-1 overflow-hidden">
        <p className="text-xs md:text-sm font-display w-full font-semibold truncate">
          {getEntryFunctionDisplayName(transactionPayload.function)}
        </p>
        <p className="text-xs text-muted-foreground w-full truncate">
          {transaction.timestamp && (
            <span className="text-xs">
              {new Date(Number(transaction.timestamp) / 1000).toLocaleString()}
            </span>
          )}
        </p>
      </div>

      <div className="flex text-sm py-1 gap-4 w-fit">
        <div className="items-center hidden sm:flex">
          <div className="flex items-center gap-2">
            <AptosAvatar value={transaction.sender} size={20} />
            <p className="font-display text-xs md:text-sm font-medium ml-1">
              <AddressDisplay address={transaction.sender} />
            </p>
          </div>
        </div>

        <div className="flex items-center text-xs md:text-sm">
          {executionEvent?.approvals !== undefined ? (
            <div className="flex items-center gap-2 text-green-700">
              <p>{executionEvent?.approvals}</p>
              <CheckCircledIcon className="md:size-4" />
            </div>
          ) : null}
          {executionEvent?.rejections !== undefined ? (
            <div className="flex items-center gap-2 text-red-700">
              <p>{executionEvent?.rejections}</p>
              <CrossCircledIcon className="size-4" />
            </div>
          ) : null}
        </div>
      </div>
    </motion.a>
  );
}
