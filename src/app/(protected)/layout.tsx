import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { TopbarProvider } from '@/components/layout/topbar-context';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Topbar } from '@/components/topbar';

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.mustChangePassword) {
    redirect('/password-reset');
  }

  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value !== 'false';

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <TopbarProvider>
        <AppSidebar user={session.user} />
        <SidebarInset className="min-h-0 min-w-0">
          <Topbar />
          <div className="bg-surface-page flex min-h-0 flex-1 flex-col overflow-auto *:flex-1">
            {children}
          </div>
        </SidebarInset>
      </TopbarProvider>
    </SidebarProvider>
  );
}
