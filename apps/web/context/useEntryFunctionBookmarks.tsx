'use client';

import { storageOptionsSerializers } from '@/lib/storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface EntryFunctionBookmark {
  /** Canonical `0x{address}::{module}::{function}` string; unique within a vault. */
  entryFunction: string;
  /** When the bookmark was saved, used for stable newest-first ordering. */
  createdAt: number;
}

interface EntryFunctionBookmarksState {
  /** Bookmarks keyed by vault id (`network:address`). */
  bookmarks: Record<string, EntryFunctionBookmark[]>;
  hasHydrated: boolean;
}

interface EntryFunctionBookmarksActions {
  getBookmarks: (vaultId: string) => EntryFunctionBookmark[];
  addBookmark: (vaultId: string, entryFunction: string) => void;
  removeBookmark: (vaultId: string, entryFunction: string) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useEntryFunctionBookmarks = create<
  EntryFunctionBookmarksState & EntryFunctionBookmarksActions
>()(
  persist(
    (set, get) => ({
      bookmarks: {},
      hasHydrated: false,

      getBookmarks: (vaultId) => get().bookmarks[vaultId] ?? [],

      addBookmark: (vaultId, entryFunction) => {
        const existing = get().bookmarks[vaultId] ?? [];
        // Bookmarks are unique per entry function within a vault.
        if (existing.some((b) => b.entryFunction === entryFunction)) return;

        set((state) => ({
          bookmarks: {
            ...state.bookmarks,
            [vaultId]: [...existing, { entryFunction, createdAt: Date.now() }]
          }
        }));
      },

      removeBookmark: (vaultId, entryFunction) => {
        set((state) => ({
          bookmarks: {
            ...state.bookmarks,
            [vaultId]: (state.bookmarks[vaultId] ?? []).filter(
              (b) => b.entryFunction !== entryFunction
            )
          }
        }));
      },

      setHasHydrated: (hasHydrated) => set({ hasHydrated })
    }),
    {
      name: '@petra-vault/entry-function-bookmarks',
      storage: createJSONStorage(() => localStorage, storageOptionsSerializers),
      partialize: (state) => ({
        bookmarks: state.bookmarks,
        hasHydrated: state.hasHydrated
      }),
      onRehydrateStorage: (state) => () => state.setHasHydrated(true)
    }
  )
);
