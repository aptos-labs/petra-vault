'use client';

import { PropsWithChildren } from 'react';
import LayoutTabs from '@/components/LayoutTabs';

const tabs = [
  {
    id: 'apps',
    label: 'Apps',
    href: '/vault/[vaultId]/explore'
  }
  // {
  //   id: 'search',
  //   label: 'Search',
  //   href: '/vault/[vaultId]/explore/search'
  // }
];

export default function VaultExploreLayout({ children }: PropsWithChildren) {
  return (
    <div className="h-full flex flex-col">
      <LayoutTabs layoutId="explore" tabs={tabs} />

      {children}
    </div>
  );
}
