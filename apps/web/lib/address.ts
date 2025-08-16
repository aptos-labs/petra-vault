import { AccountAddress } from '@aptos-labs/ts-sdk';

export function isAddressOrEns(address: string) {
  return (
    address.endsWith('.apt') || AccountAddress.isValid({ input: address }).valid
  );
}

export function isEns(address: string) {
  return address.endsWith('.apt');
}

export function isAddress(
  address: string,
  options?: { ignoreSpecial?: boolean; fixAddress?: boolean }
) {
  if (options?.fixAddress) {
    address = address.startsWith('0x') ? address : `0x${address}`;
  }
  let isValid = AccountAddress.isValid({ input: address, strict: true }).valid;
  if (options?.ignoreSpecial) isValid = isValid && address.length > 3;
  return isValid;
}

export function isApt(address: string) {
  return (
    address === '0x1::aptos_coin::AptosCoin' ||
    (isAddress(address) &&
      AccountAddress.from(address).equals(AccountAddress.from('0xa')))
  );
}

export function normalizeAddress(address: string) {
  return AccountAddress.from(address).toString().toLowerCase();
}
