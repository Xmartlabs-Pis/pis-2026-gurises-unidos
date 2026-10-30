'use client';

import { type MouseEvent, useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { cn } from 'cn';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { type NavigationItem, isItemActive } from './navigation';

const NAV_ITEM_CLASS = 'h-10 gap-3 [&_svg]:size-5 md:h-8 md:gap-2 md:[&_svg]:size-4';

interface SidebarNavItem {
  item: NavigationItem;
  pathname: string;
}

export function SidebarNavItem({ item, pathname }: SidebarNavItem) {
  const Icon = item.icon;
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={item.title}
        isActive={isItemActive(pathname, item)}
        className={NAV_ITEM_CLASS}
        render={<Link href={item.href} onClick={() => setOpenMobile(false)} />}
      >
        <Icon />
        <span>{item.title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function SidebarCollapsibleNavItem({ item, pathname }: SidebarNavItem) {
  const Icon = item.icon;
  const children = item.children ?? [];
  const [open, setOpen] = useState(() => children.some((c) => isItemActive(pathname, c)));
  const { state, isMobile, setOpen: setSidebarOpen, setOpenMobile } = useSidebar();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (state === 'collapsed' && !isMobile) {
      event.preventDefault();
      setSidebarOpen(true);
      setOpen(true);
      return;
    }

    setOpenMobile(false);
  }

  return (
    <SidebarMenuItem>
      <Collapsible open={open} onOpenChange={setOpen}>
        <SidebarMenuButton
          tooltip={item.title}
          isActive={isItemActive(pathname, item) || children.some((c) => isItemActive(pathname, c))}
          render={<Link href={item.href} onClick={handleClick} />}
        >
          <Icon />
          <span>{item.title}</span>
        </SidebarMenuButton>
        <CollapsibleTrigger
          render={<SidebarMenuAction />}
          aria-label={open ? `Contraer ${item.title}` : `Expandir ${item.title}`}
        >
          <ChevronDown className={cn('transition-transform', open && 'rotate-180')} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {children.map((child) => (
              <SidebarMenuSubItem key={child.id}>
                <SidebarMenuSubButton
                  isActive={isItemActive(pathname, child)}
                  render={<Link href={child.href} onClick={() => setOpenMobile(false)} />}
                >
                  <span>{child.title}</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}
