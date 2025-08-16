import { useEffect, useMemo, useState } from 'react';
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { ProcessedCoin, useCoins } from '@/context/CoinsProvider';
import { Separator } from '../ui/separator';
import { ArrowLeftIcon, Pencil1Icon } from '@radix-ui/react-icons';
import { formatUnits, parseUnits } from '@aptos-labs/js-pro';
import CodeBlock from '../CodeBlock';
import { AptosAvatar } from 'aptos-avatars-react';
import { AccountAddress, InputEntryFunctionData } from '@aptos-labs/ts-sdk';
import { createMultisigTransactionPayloadData } from '@/lib/payloads';
import { useActiveVault } from '@/context/ActiveVaultProvider';
import {
  useAddressFromName,
  useSignAndSubmitTransaction,
  useSimulateTransaction,
  useWaitForTransaction
} from '@aptos-labs/react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import VerticalCutReveal from '../ui/vertical-cut-reveal';
import { AnimatePresence, motion } from 'motion/react';
import { isAddress, isEns } from '@/lib/address';
import ExpandingContainer from '../ExpandingContainer';
import { LoadingSpinner } from '../LoaderSpinner';
import { formatBigIntToNumber, isNumber } from '@/lib/units';
import { Abis } from '@/lib/abis';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { jsonStringify } from '@/lib/storage';
import CoinAvatar from '../CoinAvatar';
import useAnalytics from '@/hooks/useAnalytics';
import AddressDisplay from '../AddressDisplay';

interface SendCoinsModalProps {
  onClose?: () => void;
}

export default function SendCoinsModal({ onClose }: SendCoinsModalProps) {
  const trackEvent = useAnalytics();
  const queryClient = useQueryClient();

  const [page, setPage] = useState<
    'recipient-and-amount' | 'select-coin' | 'confirm'
  >('recipient-and-amount');

  const [recipient, setRecipient] = useState<string>('');
  const [amount, setAmount] = useState<string>('0');
  const [debouncedAmount] = useDebounce(amount, 250);

  const [selectedCoin, setSelectedCoin] = useState<ProcessedCoin>();

  const [search, setSearch] = useState<string>('');

  const router = useRouter();

  const { coins } = useCoins();

  const { vaultAddress, id, network } = useActiveVault();

  const { data: resolvedAddress, isLoading: isResolvingAddress } =
    useAddressFromName({
      name: isEns(recipient) ? recipient.toLowerCase() : undefined,
      enabled: !!recipient && isEns(recipient.toLowerCase())
    });

  const recipientAddress = useMemo(() => {
    if (isEns(recipient)) return resolvedAddress?.toString();
    if (isAddress(recipient, { ignoreSpecial: true, fixAddress: true }))
      return recipient;
    return undefined;
  }, [resolvedAddress, recipient]);

  useEffect(() => {
    if (coins && !selectedCoin && coins[0]?.metadata?.asset_type) {
      setSelectedCoin(coins[0]);
    }
  }, [coins, selectedCoin]);

  const handleRecipientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRecipient(e.target.value);
  };

  const matchesSearch = (searchCoin: ProcessedCoin, searchTerm: string) => {
    const coinInfo = coins?.find(
      (info) => info.metadata?.symbol === searchCoin.metadata?.symbol
    );
    return (
      searchCoin.metadata?.symbol?.toLowerCase().includes(searchTerm) ||
      searchCoin.metadata?.name?.toLowerCase().includes(searchTerm) ||
      coinInfo?.metadata?.name?.toLowerCase().includes(searchTerm)
    );
  };

  const filteredCoins = coins?.filter((c) => {
    const formattedSearch = search?.toLowerCase() ?? '';
    if (!formattedSearch) return true;
    return matchesSearch(c, formattedSearch);
  });

  const { transactionPayload, innerPayload } = useMemo(() => {
    const amount = debouncedAmount ?? '0';

    if (!selectedCoin || !recipientAddress || !amount || !isNumber(amount)) {
      return { transactionPayload: undefined, innerPayload: undefined };
    }

    if (!isAddress(recipientAddress)) {
      return { transactionPayload: undefined, innerPayload: undefined };
    }

    if (Number(amount) < 0) {
      return { transactionPayload: undefined, innerPayload: undefined };
    }

    let transactionPayload;
    let innerPayload: InputEntryFunctionData;

    if (selectedCoin.balance.assetType.includes('::')) {
      innerPayload = {
        function: '0x1::aptos_account::transfer_coins',
        functionArguments: [
          recipientAddress,
          parseUnits(amount, selectedCoin.balance.metadata.decimals).toString()
        ],
        typeArguments: [selectedCoin.balance.assetType]
      };
      transactionPayload = createMultisigTransactionPayloadData({
        vaultAddress,
        payload: {
          ...innerPayload,
          abi: Abis['0x1::aptos_account::transfer_coins']
        }
      });
    } else {
      innerPayload = {
        function: '0x1::primary_fungible_store::transfer',
        functionArguments: [
          selectedCoin.balance.assetType,
          recipientAddress,
          parseUnits(amount, selectedCoin.balance.metadata.decimals).toString()
        ],
        typeArguments: ['0x1::fungible_asset::Metadata']
      };
      transactionPayload = createMultisigTransactionPayloadData({
        vaultAddress,
        payload: {
          ...innerPayload,
          abi: Abis['0x1::primary_fungible_store::transfer']
        }
      });
    }

    return { transactionPayload, innerPayload };
  }, [selectedCoin, recipientAddress, debouncedAmount, vaultAddress]);

  const { data: simulationData } = useSimulateTransaction({
    data: innerPayload,
    sender: AccountAddress.from(vaultAddress),
    network: { network },
    options: {
      estimateGasUnitPrice: true,
      estimateMaxGasAmount: true,
      estimatePrioritizedGasUnitPrice: true
    }
  });

  const { data: isPayloadValid, error: payloadError } = useQuery({
    queryKey: ['is-payload-valid', simulationData?.hash],
    queryFn: async () => {
      if (
        !selectedCoin ||
        !recipient ||
        !debouncedAmount ||
        !recipientAddress ||
        debouncedAmount === ''
      )
        throw new Error('Please enter a valid recipient and amount');

      if (debouncedAmount === '0')
        throw new Error('Amount must be greater than 0');

      if (!isNumber(debouncedAmount))
        throw new Error('Amount is not a valid number');

      if (
        Number(debouncedAmount) >
        Number(
          formatUnits(
            BigInt(selectedCoin.balance.amount),
            selectedCoin.balance.metadata.decimals ?? 8
          )
        )
      ) {
        throw new Error('Insufficient balance to send');
      }

      if (!simulationData?.success)
        throw new Error(`Simulation failed: ${simulationData?.vm_status}`);

      return true;
    },
    enabled: simulationData !== undefined,
    retry: 0
  });

  const { hash, signAndSubmitTransaction, isPending } =
    useSignAndSubmitTransaction({
      onSuccess: (data) => {
        if (!selectedCoin || !recipientAddress) return;
        trackEvent('create_send_coins_proposal', {
          hash: data.hash,
          asset: selectedCoin?.balance.assetType,
          asset_name: selectedCoin.balance.metadata.name,
          asset_symbol: selectedCoin.balance.metadata.symbol,
          amount: amount,
          recipient:
            AccountAddress.from(recipientAddress).toStringWithoutPrefix()
        });
      }
    });

  const { isSuccess } = useWaitForTransaction({ hash });

  const createProposal = async () => {
    if (!transactionPayload) return;
    signAndSubmitTransaction({ data: transactionPayload });
  };

  const reset = () => {
    setPage('recipient-and-amount');
    setRecipient('');
    setAmount('');
    setSelectedCoin(coins?.[0]);
  };

  const handleSetMax = () => {
    if (!selectedCoin || !simulationData) return;

    setAmount(
      formatUnits(
        BigInt(selectedCoin.balance.amount),
        selectedCoin.balance.metadata.decimals
      )
    );
  };

  useEffect(() => {
    if (isSuccess) {
      toast.success('Successfully created the transaction');
      queryClient.invalidateQueries();
      onClose?.();
      reset();
      router.push(`/vault/${id}/transactions`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  const sendAmountValue = useMemo(() => {
    if (
      !isNumber(amount) ||
      !selectedCoin ||
      !selectedCoin.price?.usd ||
      Number(amount) <= 0
    ) {
      return undefined;
    }
    return Number(amount) * selectedCoin.price.usd;
  }, [selectedCoin, amount]);

  if (coins?.length === 0) {
    return (
      <DialogContent>
        <div className="w-full flex flex-col gap-4">
          <DialogHeader className="w-full">
            <DialogTitle>Send Coins</DialogTitle>
          </DialogHeader>
        </div>
        <br />
        <div className="flex flex-col gap-4">
          <div className="bg-secondary py-8 rounded-md border-dashed border text-center text-muted-foreground text-sm">
            <p>You don&apos;t have any coins to send.</p>
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    );
  }

  return (
    <DialogContent className="p-0">
      <div className="w-full flex flex-col gap-4">
        <DialogTitle />
        <DialogDescription />

        <div className="flex flex-col items-center px-6 pb-0">
          <VerticalCutReveal
            splitBy="characters"
            staggerDuration={0.025}
            staggerFrom="first"
            containerClassName="font-display text-lg font-semibold"
            transition={{ type: 'spring', stiffness: 200, damping: 21 }}
          >
            Send Coins
          </VerticalCutReveal>
          <VerticalCutReveal
            splitBy="characters"
            staggerDuration={0.015}
            staggerFrom="first"
            containerClassName="flex items-center justify-center text-sm text-muted-foreground"
            transition={{ type: 'spring', stiffness: 200, damping: 21 }}
          >
            Create a proposal to send coins to another wallet.
          </VerticalCutReveal>
        </div>

        <ExpandingContainer className="p-6 pt-2">
          {page === 'recipient-and-amount' && (
            <div className="h-full flex flex-col gap-4">
              <div className="flex flex-col gap-2 w-full">
                <Label>Recipient</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={recipient}
                    onChange={handleRecipientChange}
                    data-testid="send-coins-recipient-input"
                  />

                  {(isResolvingAddress || recipient) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-8"
                    >
                      {isResolvingAddress ? (
                        <LoadingSpinner className="w-8" />
                      ) : (
                        <AptosAvatar value={recipient} size={32} />
                      )}
                    </motion.div>
                  )}
                </div>
              </div>

              {recipientAddress && selectedCoin && (
                <div>
                  <div className="flex flex-col w-full">
                    <div className="flex items-center justify-between">
                      <Label>You&apos;re sending</Label>
                      <Button
                        size="sm"
                        variant="link"
                        className="w-fit px-4 text-xs"
                        disabled={!simulationData}
                        onClick={handleSetMax}
                      >
                        MAX
                      </Button>
                    </div>
                    <div className="flex gap-2 w-full">
                      <div className="relative w-full">
                        <Input
                          placeholder="0.00"
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full pr-12"
                          data-testid="send-coins-amount-input"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-display">
                          {selectedCoin.metadata?.symbol ??
                            selectedCoin.balance.metadata.symbol}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="w-fit px-4"
                        asChild
                        onClick={() => setPage('select-coin')}
                      >
                        <div className="flex items-center gap-2">
                          <CoinAvatar
                            coin={selectedCoin}
                            className="md:w-6 md:h-6"
                          />
                          <span>
                            {selectedCoin.metadata?.symbol ??
                              selectedCoin.balance.metadata.symbol}
                          </span>
                        </div>
                      </Button>
                    </div>
                    <div className="flex justify-between w-full text-xs text-muted-foreground mt-2 px-2">
                      {sendAmountValue !== undefined && sendAmountValue > 0 ? (
                        <div className="">
                          ${sendAmountValue.toLocaleString()}
                        </div>
                      ) : (
                        <div />
                      )}

                      <button type="button" onClick={handleSetMax}>
                        {formatUnits(
                          BigInt(selectedCoin.balance.amount),
                          selectedCoin.balance.metadata.decimals
                        ).toLocaleString()}{' '}
                        {selectedCoin.metadata?.symbol ??
                          selectedCoin.balance.metadata.symbol}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={() => setPage('confirm')}
                disabled={!recipient || !amount || !isPayloadValid}
                data-testid="send-coins-review-draft-button"
              >
                Review Draft
              </Button>

              <AnimatePresence mode="popLayout">
                {payloadError && (
                  <motion.p
                    key={`payload-error-${payloadError.message}`}
                    initial={{
                      opacity: 0,
                      y: 5,
                      filter: 'blur(10px)'
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      filter: 'blur(0px)'
                    }}
                    exit={{
                      opacity: 0,
                      y: -10,
                      filter: 'blur(10px)'
                    }}
                    className="text-destructive-foreground text-center text-sm font-display"
                  >
                    {payloadError.message}
                  </motion.p>
                )}
                {recipient !== '' &&
                  !simulationData?.hash &&
                  !recipientAddress && (
                    <motion.p
                      key="recipient-error"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-destructive-foreground text-center text-sm font-display"
                    >
                      Please enter a valid recipient address to create a
                      proposal.
                    </motion.p>
                  )}
              </AnimatePresence>
            </div>
          )}

          {page === 'select-coin' && (
            <div className="flex flex-col w-full items-center gap-4 min-h-96">
              <div className="flex items-center gap-2 w-full">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setPage('recipient-and-amount');
                    setSearch('');
                  }}
                >
                  <ArrowLeftIcon />
                </Button>
                <Input
                  placeholder="Search..."
                  onChange={(e) => setSearch(e.target.value)}
                  className="rounded-full"
                />
              </div>
              <ul className="flex flex-col w-full gap-4 max-h-96 overflow-y-auto">
                {(filteredCoins?.length ?? 0) > 0 ? (
                  filteredCoins?.map((c) => (
                    <li key={c.balance.assetType} className="list-none w-full">
                      <button
                        type="button"
                        className="w-full px-4 py-2 rounded-md bg-secondary/70 hover:bg-secondary cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedCoin(c);
                          setSearch('');
                          setPage('recipient-and-amount');
                        }}
                        role="option"
                      >
                        <div className="flex items-center gap-2">
                          <CoinAvatar
                            asset={c.balance.assetType}
                            logoUrl={c.metadata?.logo_url}
                            className="w-8 h-8"
                          />

                          <div className="flex flex-col items-start pl-2">
                            <span className="font-display">
                              {c.metadata?.name ?? c.balance.metadata.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {c.metadata?.symbol ?? c.balance.metadata.symbol}
                            </span>
                          </div>

                          <div className="flex flex-col items-end ml-auto gap-1">
                            <span className="text-xs font-medium">
                              {formatUnits(
                                BigInt(c.balance.amount),
                                c.balance.metadata.decimals
                              )}{' '}
                              {c.balance.metadata.symbol}
                            </span>
                            {c.price?.usd && (
                              <span className="text-xs text-muted-foreground">
                                $
                                {(
                                  formatBigIntToNumber(
                                    BigInt(c.balance.amount),
                                    c.balance.metadata.decimals
                                  ) * c.price.usd
                                ).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No results found
                  </div>
                )}
              </ul>
            </div>
          )}

          {page === 'confirm' &&
            innerPayload &&
            transactionPayload &&
            selectedCoin &&
            recipientAddress && (
              <div className="w-full flex flex-col gap-4">
                <Separator className="w-full" />

                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-display text-sm">Recipient</h3>
                    <div className="flex items-center gap-2">
                      <AptosAvatar value={recipient} size={16} />
                      <p className="font-display font-medium ml-1">
                        <AddressDisplay address={recipientAddress} />
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <h3 className="font-display text-sm">Amount</h3>
                    <div className="flex items-center gap-2">
                      <CoinAvatar coin={selectedCoin} size="sm" />

                      <span className="font-display font-medium">
                        {amount} {selectedCoin?.balance.metadata.symbol}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator className="w-full mt-2" />

                <div className="w-full">
                  <h3 className="font-display text-lg font-semibold tracking-wide">
                    Payload
                  </h3>
                  <div className="max-h-96 overflow-auto w-full p-2 border rounded-md text-xs mt-2 bg-secondary">
                    <CodeBlock
                      value={jsonStringify(innerPayload)}
                      className="[&>pre]:!bg-transparent"
                    />
                  </div>
                </div>

                <Separator className="w-full mt-2" />

                <div className="w-full flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPage('recipient-and-amount')}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    onClick={createProposal}
                    isLoading={isPending}
                    data-testid="send-coins-create-proposal-button"
                  >
                    <Pencil1Icon />
                    Create Proposal
                  </Button>
                </div>
              </div>
            )}
        </ExpandingContainer>
      </div>
    </DialogContent>
  );
}
