import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { getUserStats } from '@/lib/users/list';

type UserStats = Awaited<ReturnType<typeof getUserStats>>;

const STAT_CARDS: { key: keyof UserStats; label: string }[] = [
  { key: 'total', label: 'Total de usuarios' },
  { key: 'admins', label: 'Administradores' },
  { key: 'coordinators', label: 'Coordinadores' },
  { key: 'pendingInvitations', label: 'Invitaciones pendientes' },
];

export function UserStatsCards({ stats }: { stats: UserStats }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {STAT_CARDS.map(({ key, label }) => (
        <Card key={key}>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">{stats[key]}</CardTitle>
            <CardDescription>{label}</CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
