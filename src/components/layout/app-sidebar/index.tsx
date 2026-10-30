'use client';

import { usePathname } from 'next/navigation';
import Image from 'next/image';
import type { Session } from 'next-auth';
import { XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import logo from '@/assets/logo.png';
import { AppSidebarFooter } from './footer';
import { filterNavGroups, flattenNavItems, NAV_GROUPS } from './navigation';
import { SidebarCollapsibleNavItem, SidebarNavItem } from './nav-item';
import Link from 'next/link';

interface Props {
  user: Session['user'];
}

export function AppSidebar({ user }: Props) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const navGroups = filterNavGroups(NAV_GROUPS, user.role);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex h-12 items-center gap-2 overflow-hidden p-2 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0!">
              <Link
                href="/dashboard"
                onClick={() => setOpenMobile(false)}
                className="flex min-w-0 flex-1 items-center gap-2"
              >
                <Image
                  className="size-8 shrink-0 rounded-md"
                  src={logo}
                  alt=""
                  width={32}
                  height={32}
                />
                <span className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold">Gurises Unidos</span>
                  <span className="text-xs">ONG Uruguay</span>
                </span>
              </Link>
              <Button
                variant="ghost"
                size="icon-sm"
                className="ml-auto md:hidden"
                onClick={() => setOpenMobile(false)}
              >
                <XIcon />
                <span className="sr-only">Cerrar menú</span>
              </Button>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="space-y-2">
        {navGroups.map((group) => {
          const items = isMobile ? flattenNavItems(group.items) : group.items;

          return (
            <SidebarGroup key={group.id} className="first:pb-0 last:pt-0">
              <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-y-1">
                  {items.map((item) =>
                    !isMobile && item.children?.length ? (
                      <SidebarCollapsibleNavItem key={item.id} item={item} pathname={pathname} />
                    ) : (
                      <SidebarNavItem key={item.id} item={item} pathname={pathname} />
                    )
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <AppSidebarFooter user={user} />
      <SidebarRail />
    </Sidebar>
  );
}
