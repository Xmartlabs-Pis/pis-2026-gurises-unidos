import Link from 'next/link';
import { Users } from 'lucide-react';
import { auth } from '@/auth';
import { Button } from '@/components/ui/button';

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { UsersListToolbar } from '@/components/users/users-list-toolbar';
import { UsersTable } from '@/components/users/users-table';
import { UserStatsCards } from '@/components/users/user-stats-cards';
import { ErrorScreen } from '@/components/error-screen';
import { PageHeader } from '@/components/layout/page-header';
import { getUserList, getUserStats, parseUserListFilters } from '@/lib/users/list';

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();

  if (session?.user.role !== 'admin') {
    return <ErrorScreen code={403} />;
  }

  const filters = parseUserListFilters(await searchParams);
  const [users, stats] = await Promise.all([getUserList(filters), getUserStats()]);

  const hasOnlyCurrentAdmin = stats.total <= 1;

  return (
    <div className="bg-primary-foreground flex w-full flex-1 flex-col xl:min-h-0 xl:overflow-hidden">
      <div className="mx-auto flex w-full max-w-296 flex-1 flex-col xl:min-h-0">
        <div className="flex w-full shrink-0 flex-col items-start justify-between gap-3 px-4 pt-6 pb-2.5 sm:flex-row sm:px-6">
          <PageHeader
            className="mx-auto w-full max-w-[1185px]"
            eyebrow="Administración"
            title="Usuarios"
            description="Administrá las personas que tienen acceso al sistema."
          />

          <Button
            size="lg"
            className="h-9 gap-2.5 px-4 py-2"
            nativeButton={false}
            render={<Link href="/management/users/new" />}
          >
            + Nuevo usuario
          </Button>
        </div>

        {hasOnlyCurrentAdmin ? (
          <div className="flex w-full flex-col gap-5 px-4 pt-6 pb-8 sm:px-6">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Users />
                </EmptyMedia>
                <EmptyTitle>Todavía no hay usuarios registrados</EmptyTitle>
                <EmptyDescription>
                  Cuando agregues personas al sistema, vas a verlas listadas acá con su rol y
                  estado.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button nativeButton={false} render={<Link href="/management/users/new" />}>
                  Crear primer usuario
                </Button>
              </EmptyContent>
            </Empty>
          </div>
        ) : (
          <div className="flex w-full flex-1 flex-col gap-5 px-4 pt-6 pb-8 sm:px-6 xl:min-h-0">
            <div className="shrink-0">
              <UserStatsCards stats={stats} />
            </div>

            <div className="shrink-0">
              <UsersListToolbar filters={filters} filteredCount={users.length} />
            </div>

            <UsersTable users={users} currentUserId={Number(session.user.id)} />
          </div>
        )}
      </div>
    </div>
  );
}
