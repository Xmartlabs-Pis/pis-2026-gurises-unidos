'use client';

import { NavigationGuardLink as Link } from 'nextjs-nav-guard';
import { SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
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
        render={
          <Link
            href={item.href}
            onClick={() => {
              if (pathname === item.href) setOpenMobile(false);
            }}
          />
        }
      >
        <Icon />
        <span>{item.title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
