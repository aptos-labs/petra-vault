import { createVaultId } from '@/lib/vaults';
import { AccountAddress, Network } from '@aptos-labs/ts-sdk';
import constate from 'constate';
import { useVaults } from './useVaults';
import useMultisigSignaturesRequired from '@/hooks/useMultisigSignaturesRequired';
import useMultisigOwners from '@/hooks/useMultisigOwners';
import { useAccount } from '@aptos-labs/react';

export const [ActiveVaultProvider, useActiveVault] = constate(
  ({ vaultAddress, network }: { vaultAddress: string; network: Network }) => {
    const account = useAccount();

    const { vaults } = useVaults();

    const vault = vaults.find(
      (v) => v.address.toString() === vaultAddress && v.network === network
    );

    const owners = useMultisigOwners({
      address: vaultAddress.toString(),
      network: { network }
    });

    const signaturesRequired = useMultisigSignaturesRequired({
      address: vaultAddress.toString(),
      network: { network }
    });

    const isOwner = owners.data?.some(
      (owner) =>
        account &&
        AccountAddress.from(account.address).equals(AccountAddress.from(owner))
    );

    return {
      vaultAddress,
      network,
      id: createVaultId({
        address: AccountAddress.from(vaultAddress),
        network
      }),
      vault,
      owners,
      signaturesRequired,
      isOwner
    };
  }
);
