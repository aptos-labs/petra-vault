'use client';

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

interface NavItemGroupProps {
  title?: string;
  className?: string;
  size?: 'sm' | 'lg';
  items: {
    name: string;
    url?: string;
    icon: React.ComponentType;
    target?: string;
    activePaths?: string[];
    disabled?: boolean;
  }[];
}

export function NavItemGroup({
  title,
  items,
  className,
  size
}: NavItemGroupProps) {
  const pathname = usePathname();

  return (
    <SidebarGroup
      className={cn('group-data-[collapsible=icon]:hidden', className)}
    >
      {title && <SidebarGroupLabel className="z-10">{title}</SidebarGroupLabel>}
      <SidebarMenu>
        {items.map((item) => {
          const isActive = item.activePaths
            ? item.activePaths?.some((path) => pathname === path)
            : item.url === pathname;
          return (
            <SidebarMenuItem key={item.name}>
              {isActive && (
                <motion.div
                  layoutId="active-nav-item"
                  className="absolute left-0 right-0 top-0 bottom-0 inset-0 bg-secondary z-0 rounded-sm "
                  transition={{
                    duration: 0.05,
                    type: 'spring',
                    damping: 31,
                    stiffness: 200
                  }}
                />
              )}
              <SidebarMenuButton
                asChild
                disabled={!item.url || item.disabled}
                size={size}
                className={cn(
                  'transition-all',
                  isActive
                    ? 'hover:!bg-transparent text-foreground'
                    : 'hover:!bg-accent/40 text-foreground/85'
                )}
                data-testid={`nav-item-${item.name.toLowerCase()}`}
              >
                <Link
                  href={item.url ?? '/'}
                  className="relative flex z-10 "
                  target={item.target}
                >
                  <item.icon />
                  <span>{item.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
