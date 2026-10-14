import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { UserActionsMenu } from '@/components/users/user-actions-menu';
import { ROLE_LABELS, STATUS_LABELS, STATUS_CLASSNAMES } from '@/lib/users/constants';
import { fullName, formatDate, type User } from '@/lib/users/format';

export function UsersTable({ users, currentUserId }: { users: User[]; currentUserId: number }) {
  return (
    <>
      <div className="flex flex-col gap-3 xl:hidden">
        {users.length === 0 && (
          <p className="text-muted-foreground rounded-[14px] border py-12 text-center">
            No se encontraron usuarios
          </p>
        )}
        {users.map((user) => (
          <Card key={user.id} className="shrink-0 gap-3 py-4">
            <CardContent className="flex items-start justify-between gap-3 px-4">
              <div className="min-w-0">
                <p className="text-foreground truncate font-medium">{fullName(user)}</p>
                <p className="text-muted-foreground truncate text-sm">{user.email}</p>
                <p className="text-foreground mt-1 text-sm">{ROLE_LABELS[user.role]}</p>
              </div>
              <UserActionsMenu user={user} isCurrentUser={user.id === currentUserId} />
            </CardContent>
            <CardContent className="flex items-center justify-between gap-3 px-4">
              <Badge className={STATUS_CLASSNAMES[user.status]}>{STATUS_LABELS[user.status]}</Badge>
              <span className="text-muted-foreground text-sm">{formatDate(user.lastAccess)}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="hidden min-h-0 w-full flex-1 overflow-auto rounded-[14px] border xl:block xl:max-h-fit [&_[data-slot=table-container]]:overflow-visible">
        <Table className="table-fixed">
          <TableHeader className="[&_th]:bg-muted [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:shadow-[inset_0_-1px_0_0_var(--border)] [&_tr]:border-b-0">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-muted-foreground h-10 w-56 px-4 py-2.5">Nombre</TableHead>
              <TableHead className="text-muted-foreground h-10 w-32 px-4 py-2.5">
                Correo electrónico
              </TableHead>
              <TableHead className="text-muted-foreground h-10 w-38 px-4 py-2.5">Rol</TableHead>
              <TableHead className="text-muted-foreground h-10 w-38 px-4 py-2.5">Estado</TableHead>
              <TableHead className="text-muted-foreground h-10 w-45 px-4 py-2.5">
                Último acceso
              </TableHead>
              <TableHead className="text-muted-foreground h-10 w-26 px-4 py-2.5 text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="text-muted-foreground h-120 text-center">
                  No se encontraron usuarios
                </TableCell>
              </TableRow>
            )}
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="text-foreground h-15 truncate px-4 py-3 font-medium">
                  {user.firstName} {user.lastName}
                </TableCell>
                <TableCell className="text-muted-foreground h-15 truncate px-4 py-3">
                  {user.email}
                </TableCell>
                <TableCell className="text-foreground h-15 px-4 py-3">
                  {ROLE_LABELS[user.role]}
                </TableCell>
                <TableCell className="h-15 px-4 py-3">
                  <Badge className={STATUS_CLASSNAMES[user.status]}>
                    {STATUS_LABELS[user.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground h-15 px-4 py-3">
                  {formatDate(user.lastAccess)}
                </TableCell>
                <TableCell className="h-15 px-4 py-3 text-right">
                  <UserActionsMenu user={user} isCurrentUser={user.id === currentUserId} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
