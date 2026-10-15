'use client';

import { useState, useTransition } from 'react';
import { updateUserStatus } from '@/app/actions/users';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { notify } from '@/lib/notify';
import { fullName, type User } from '@/lib/users/format';

type UserStatusDialogProps = {
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'status'>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function UserStatusDialog({ user, open, onOpenChange }: UserStatusDialogProps) {
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const isDisabling = user.status !== 'disabled';
  const name = fullName(user);

  function handleOpenChange(nextOpen: boolean) {
    if (isPending) return;
    if (!nextOpen) setError(undefined);
    onOpenChange(nextOpen);
  }

  function handleConfirm() {
    startTransition(async () => {
      const result = await updateUserStatus(user.id, isDisabling ? 'disabled' : 'active');

      if (result.error) {
        setError(result.error);
        return;
      }

      notify.success({
        title: isDisabling ? `Se deshabilitó a ${name}` : `Se habilitó a ${name}`,
      });
      onOpenChange(false);
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isDisabling ? `¿Deshabilitar a ${name}?` : `¿Habilitar a ${name}?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isDisabling
              ? 'No va a poder iniciar sesión hasta que lo vuelvas a habilitar. Los proyectos que tiene asignados se mantienen.'
              : 'Va a poder volver a iniciar sesión en el sistema.'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <p role="alert" className="text-destructive text-center text-sm">
            {error}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={handleConfirm}>
            {isDisabling ? 'Deshabilitar' : 'Habilitar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
