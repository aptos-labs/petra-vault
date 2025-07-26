'use client';

import { SidebarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useSidebar } from '@/components/ui/sidebar';
import Link from 'next/link';
import { useIsMobile } from '@/hooks/useMobile';
import Image from 'next/image';

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
          href="/home"
          className="flex items-center font-semibold font-display tracking-wide"
          data-testid="site-header-logo"
        >
          <Image
            src="/petra_logo.svg"
            alt="Petra Vault"
            className="w-5 text-black mr-2"
            width={20}
            height={20}
          />
          <span className="leading-none text-lg translate-y-0.25">
            Petra Vault
          </span>
        </Link>
      </div>
    </header>
  );
}
