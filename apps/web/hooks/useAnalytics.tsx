/* eslint-disable @typescript-eslint/no-empty-object-type */

import { useParams } from 'next/navigation';

import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { parseVaultId } from '@/lib/vaults';
import { useCallback } from 'react';

import { sendGAEvent } from '@next/third-parties/google';

type AnalyticsEvent = {
  proposals: {
    create_proposal: { entry_function_id?: string; hash: string };
    create_add_owner_proposal: { hash: string };
    create_remove_owner_proposal: { hash: string };
    create_publish_contract_proposal: { hash: string };
    create_update_signatures_required_proposal: { hash: string };
    vote_proposal: { hash: string; action?: 'approve' | 'reject' };
    execute_proposal: { hash: string };
    remove_proposal: { hash: string };
  };
  onboarding: {
    set_vault_name: {};
    set_vault_config: { signatures_required: number; owners: number };
    create_new_vault: {
      hash: string;
      signatures_required: number;
      owners: number;
    };
    select_discovered_vault: {};
    manual_import_vault: { owners: number };
    create_imported_vault: { signatures_required: number; owners: number };
    backup_import_vault: { vault_count: number };
  };
  send_receive: {
    send_coins_review_draft: {};
    create_send_coins_proposal: {
      hash: string;
      asset: string;
      asset_name: string;
      asset_symbol: string;
      amount: string;
      recipient: string;
    };
    receive_attempt: {};
    receive_copied: {};
    receive_scanned: {};
  };
  explore: {
    view_app: { app_name: string; app_url: string };
  };
  embedded_view: {
    sign_and_submit_transaction_approved: { hash: string };
    sign_and_submit_transaction_rejected: {};
  };
  settings: {
    delete_vault_attempt: {};
    delete_vault_success: {};
    download_backup_file: {};
  };
};

export type EventName = {
  [K in keyof AnalyticsEvent]: keyof AnalyticsEvent[K];
}[keyof AnalyticsEvent];

export type EventParams<T extends EventName> = {
  [K in keyof AnalyticsEvent]: AnalyticsEvent[K][T & keyof AnalyticsEvent[K]];
}[keyof AnalyticsEvent];

function trackEvent<T extends EventName>(
  eventName: T,
  eventParams: EventParams<T>
) {
  if (typeof window !== 'undefined' && window.gtag) {
    sendGAEvent('event', eventName, eventParams);
  }
}

export default function useAnalytics() {
  const { account, network } = useWallet();

  const { vaultId } = useParams();

  const parsedVaultId =
    typeof vaultId === 'string'
      ? parseVaultId(decodeURIComponent(vaultId))
      : null;

  return useCallback(
    <T extends EventName>(eventName: T, eventParams: EventParams<T>) =>
      trackEvent<T>(eventName, {
        ...eventParams,
        vault_address: parsedVaultId?.address.toStringWithoutPrefix(),
        vault_network: parsedVaultId?.network,
        account_network: network?.name,
        account_address: account?.address.toStringWithoutPrefix()
      }),
    [account, parsedVaultId, network]
  );
}
