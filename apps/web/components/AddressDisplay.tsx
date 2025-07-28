import { useNameFromAddress, useNetwork } from '@aptos-labs/react';
import {
  AccountAddress,
  AccountAddressInput,
  truncateAddress,
  Network
} from '@aptos-labs/ts-sdk';
import { useAddressBook } from '@/context/useAddressBook';

interface AddressDisplayProps {
  address: AccountAddressInput;
  truncate?: boolean;
  disableAnsName?: boolean;
  network?: Network; // Optional network override
}

export default function AddressDisplay({
  address,
  truncate = true,
  disableAnsName = false,
  network
}: AddressDisplayProps) {
  const { network: currentNetwork } = useNetwork();
  const { getEntry } = useAddressBook();
  
  const accountAddress = address ? AccountAddress.from(address) : undefined;
  const targetNetwork = network || currentNetwork;

  // Check for custom name in address book first
  const customEntry = accountAddress && targetNetwork 
    ? getEntry(accountAddress, targetNetwork) 
    : undefined;

  const { data: ansName } = useNameFromAddress({
    address: accountAddress,
    enabled: !disableAnsName && !customEntry, // Only fetch ANS if no custom name
    staleTime: 1000 * 60 * 60 * 24 // 24 hours
  });

  const displayName = customEntry?.name ?? ansName?.toString();

  return (
    <>
      {displayName ??
        (address
          ? truncate
            ? truncateAddress(AccountAddress.from(address).toString())
            : address.toString()
          : undefined)}
    </>
  );
}
