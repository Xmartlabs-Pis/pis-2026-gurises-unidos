import { Header } from '@/components/header';
import { PublicGeographyProvider } from '@/components/public-geography';
import { PublicSessionToolbar } from '@/components/public-session-toolbar';
import { auth } from '@/auth';
import { cn } from 'cn';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div
      className={cn(
        'theme-public bg-background flex min-h-full flex-auto shrink-0 flex-col',
        session?.user &&
          '[--public-session-toolbar-height:0px] lg:[--public-session-toolbar-height:2.5rem]'
      )}
    >
      <PublicGeographyProvider>
        {session?.user && <PublicSessionToolbar email={session.user.email} />}
        <Header />
        <main className="bg-background flex flex-1 flex-col">{children}</main>
      </PublicGeographyProvider>
    </div>
  );
}
