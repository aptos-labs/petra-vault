'use client';

import { SidebarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useSidebar } from '@/components/ui/sidebar';
import Link from 'next/link';
import { useIsMobile } from '@/hooks/useMobile';

export function SiteHeader() {
  const isMobile = useIsMobile();
  const { toggleSidebar } = useSidebar();

  return (
    <header className="flex sticky top-0 z-50 w-full items-center bg-background rounded-b-md">
      <div className="flex h-[var(--header-height)] w-full items-center gap-2 px-6">
        {isMobile && (
          <>
            <Button
              className="h-8 w-8"
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
            >
              <SidebarIcon />
            </Button>
            <Separator orientation="vertical" className="mr-2 h-4" />
          </>
        )}

        <Link
          href="/"
          className="flex items-center gap-3 font-semibold font-display tracking-wide"
          data-testid="site-header-logo"
        >
          <img src="/petra_logo.png" alt="Petra Vault" className="w-4" />
          Petra Vault
        </Link>
      </div>
    </header>
  );
}
