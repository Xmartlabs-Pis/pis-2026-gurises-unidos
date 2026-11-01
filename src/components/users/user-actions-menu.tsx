'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { resendInvitation } from '@/app/actions/users';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DeleteUserDialog } from '@/components/users/delete-user-dialog';
import { ResetPasswordDialog } from '@/components/users/reset-password-dialog';
import { UserStatusDialog } from '@/components/users/user-status-dialog';
import { notify } from '@/lib/notify';
import { fullName, type User } from '@/lib/users/format';

export function UserActionsMenu({ user, isCurrentUser }: { user: User; isCurrentUser: boolean }) {
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResendingInvitation, startResendInvitation] = useTransition();
  const isPendingInvitation = user.status === 'pendingInvitation';
  const showStatusAction = !isCurrentUser && !isPendingInvitation;
  const showResetPasswordAction = !isCurrentUser && !isPendingInvitation;

  function handleResendInvitation() {
    startResendInvitation(async () => {
      const result = await resendInvitation(user.id);

      if (result.error) {
        notify.error({ title: result.error });
        return;
      }

      notify.success({ title: `Se reenvió la invitación a ${user.email}` });
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" aria-label={`Acciones para ${fullName(user)}`}>
              <MoreHorizontal />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="max-h-104 w-56 rounded-md border">
          <DropdownMenuItem
            render={<Link href={`/management/users/${user.id}/edit`} />}
            className="text-popover-foreground font-sans text-sm leading-5 font-medium tracking-normal"
          >
            Editar
          </DropdownMenuItem>
          {isPendingInvitation && (
            <DropdownMenuItem
              className="text-popover-foreground font-sans text-sm leading-5 font-medium tracking-normal"
              disabled={isResendingInvitation}
              onClick={handleResendInvitation}
            >
              Reenviar invitación
            </DropdownMenuItem>
          )}
          {showResetPasswordAction && (
            <DropdownMenuItem
              className="text-popover-foreground font-sans text-sm leading-5 font-medium tracking-normal"
              onClick={() => setIsResetPasswordDialogOpen(true)}
            >
              Restablecer contraseña
            </DropdownMenuItem>
          )}
          {showStatusAction && (
            <DropdownMenuItem
              className="text-popover-foreground font-sans text-sm leading-5 font-medium tracking-normal"
              onClick={() => setIsStatusDialogOpen(true)}
            >
              {user.status === 'disabled' ? 'Habilitar' : 'Deshabilitar'}
            </DropdownMenuItem>
          )}
          {!isCurrentUser && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                className="h-8 w-54 gap-2 rounded-sm px-2 py-1.5 font-sans text-sm leading-5 font-medium tracking-normal"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                Eliminar
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {showResetPasswordAction && (
        <ResetPasswordDialog
          userId={user.id}
          userName={fullName(user)}
          open={isResetPasswordDialogOpen}
          onOpenChange={setIsResetPasswordDialogOpen}
        />
      )}
      {showStatusAction && (
        <UserStatusDialog
          user={user}
          open={isStatusDialogOpen}
          onOpenChange={setIsStatusDialogOpen}
        />
      )}
      {!isCurrentUser && (
        <DeleteUserDialog
          user={user}
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        />
      )}
    </>
  );
}
