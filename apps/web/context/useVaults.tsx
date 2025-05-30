'use client';

import { storageOptionsSerializers } from '@/lib/storage';
import { Vault } from '@/lib/types/vaults';
import { AccountAddress } from '@aptos-labs/ts-sdk';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface VaultsState {
  vaults: Vault[];
  hasHydrated: boolean;
}

interface VaultsActions {
  createVault: (vault: Vault) => void;
  updateVault: (vault: Vault) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  deleteVault: (address: AccountAddress) => void;
  importVaults: (vaults: Vault[]) => void;
}

export const useVaults = create<VaultsState & VaultsActions>()(
  persist(
    (set, get) => ({
      ...{
        vaults: [],
        hasHydrated: false
      },
      ...{
        createVault: (vault) => {
          if (
            get().vaults.find(
              (v) =>
                v.address.equals(vault.address) && v.network === vault.network
            )
          )
            throw new Error('Vault already exists');
          set((state) => ({
            ...state,
            vaults: [...state.vaults, vault]
          }));
        },
        updateVault: (vault) => {
          set((state) => ({
            ...state,
            vaults: state.vaults.map((v) =>
              v.address.equals(vault.address) ? vault : v
            )
          }));
        },
        setHasHydrated: (hasHydrated) => set({ hasHydrated }),
        deleteVault: (address) =>
          set((state) => ({
            ...state,
            vaults: state.vaults.filter((v) => !v.address.equals(address))
          })),
        importVaults: (vaults) =>
          set((state) => ({
            ...state,
            vaults: [
              ...state.vaults,
              ...vaults.filter(
                // Do not import vaults that already exist
                (v) => !state.vaults.find((e) => e.address.equals(v.address))
              )
            ]
          }))
      }
    }),
    {
      name: '@petra-vault/vaults',
      storage: createJSONStorage(() => localStorage, storageOptionsSerializers),
      partialize: (state) => ({
        ...state,
        hasHydrated: state.hasHydrated
      }),
      onRehydrateStorage: (state) => () => state.setHasHydrated(true)
    }
  )
);
