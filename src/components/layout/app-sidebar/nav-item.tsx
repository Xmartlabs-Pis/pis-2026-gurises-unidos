'use client';

import { NavigationGuardLink as Link } from 'nextjs-nav-guard';
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavigationItem, isItemActive } from './navigation';

const NAV_ITEM_CLASS = 'h-10 gap-3 [&_svg]:size-5 md:h-8 md:gap-2 md:[&_svg]:size-4';

interface SidebarNavItem {
  item: NavigationItem;
  pathname: string;
}

export function SidebarNavItem({ item, pathname }: SidebarNavItem) {
  const Icon = item.icon;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={item.title}
        isActive={isItemActive(pathname, item)}
        className={NAV_ITEM_CLASS}
        render={<Link href={item.href} />}
      >
        <Icon />
        <span>{item.title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
