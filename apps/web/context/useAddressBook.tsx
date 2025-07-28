'use client';

import { AccountAddress, Network } from '@aptos-labs/ts-sdk';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { storageOptionsSerializers } from '@/lib/storage';

export interface AddressBookEntry {
  address: AccountAddress;
  name: string;
  network: Network;
  createdAt: number;
  updatedAt: number;
}

interface AddressBookState {
  entries: AddressBookEntry[];
  hasHydrated: boolean;
}

interface AddressBookActions {
  addEntry: (entry: Omit<AddressBookEntry, 'createdAt' | 'updatedAt'>) => void;
  updateEntry: (address: AccountAddress, network: Network, name: string) => void;
  removeEntry: (address: AccountAddress, network: Network) => void;
  getEntry: (address: AccountAddress, network: Network) => AddressBookEntry | undefined;
  getEntriesForNetwork: (network: Network) => AddressBookEntry[];
  setHasHydrated: (hasHydrated: boolean) => void;
  clearAllEntries: () => void;
}

export const useAddressBook = create<AddressBookState & AddressBookActions>()(
  persist(
    (set, get) => ({
      entries: [],
      hasHydrated: false,

      addEntry: (entry) => {
        const existing = get().entries.find(
          (e) =>
            e.address.equals(entry.address) && e.network === entry.network
        );
        
        if (existing) {
          throw new Error('Entry already exists for this address and network');
        }

        const now = Date.now();
        const newEntry: AddressBookEntry = {
          ...entry,
          createdAt: now,
          updatedAt: now
        };

        set((state) => ({
          entries: [...state.entries, newEntry]
        }));
      },

      updateEntry: (address, network, name) => {
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.address.equals(address) && entry.network === network
              ? { ...entry, name, updatedAt: Date.now() }
              : entry
          )
        }));
      },

      removeEntry: (address, network) => {
        set((state) => ({
          entries: state.entries.filter(
            (entry) =>
              !(entry.address.equals(address) && entry.network === network)
          )
        }));
      },

      getEntry: (address, network) => {
        return get().entries.find(
          (entry) =>
            entry.address.equals(address) && entry.network === network
        );
      },

      getEntriesForNetwork: (network) => {
        return get().entries.filter((entry) => entry.network === network);
      },

      setHasHydrated: (hasHydrated) => set({ hasHydrated }),

      clearAllEntries: () => set({ entries: [] })
    }),
    {
      name: '@petra-vault/address-book',
      storage: createJSONStorage(() => localStorage, storageOptionsSerializers),
      partialize: (state) => ({
        entries: state.entries,
        hasHydrated: state.hasHydrated
      }),
      onRehydrateStorage: (state) => () => state.setHasHydrated(true)
    }
  )
);