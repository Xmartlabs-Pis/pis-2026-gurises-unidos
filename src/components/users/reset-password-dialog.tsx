'use client';

import { useState, useTransition, type TransitionStartFunction } from 'react';
import { FormProvider, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Copy } from 'lucide-react';
import { resetPassword, type PasswordFormState } from '@/app/actions/password';
import { Button } from '@/components/ui/button';
import { TextInputField } from '@/components/ui/forms/text-input-field';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { copyText } from '@/lib/clipboard';
import { notify } from '@/lib/notify';
import { generateTemporaryPassword } from '@/lib/users';
import { resetPasswordFormSchema } from '@/lib/validation/password';

type ResetPasswordValues = {
  newPassword: string;
};

type ResetPasswordDialogProps = {
  userId: number;
  userName: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function ResetPasswordDialog({
  userId,
  userName,
  open,
  onOpenChange,
}: ResetPasswordDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleOpenChange(nextOpen: boolean) {
    if (pending) return;

    setUncontrolledOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }

  return (
    <AlertDialog open={open ?? uncontrolledOpen} onOpenChange={handleOpenChange}>
      {open === undefined && (
        <AlertDialogTrigger
          render={<Button type="button" variant="outline" size="lg" className="w-fit px-4" />}
        >
          Restablecer contraseña
        </AlertDialogTrigger>
      )}
      <AlertDialogContent>
        <ResetPasswordForm
          userId={userId}
          userName={userName}
          pending={pending}
          startTransition={startTransition}
        />
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ResetPasswordForm({
  userId,
  userName,
  pending,
  startTransition,
}: {
  userId: number;
  userName: string;
  pending: boolean;
  startTransition: TransitionStartFunction;
}) {
  const [state, setState] = useState<PasswordFormState>({});
  const [initialPassword] = useState(generateTemporaryPassword);
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordFormSchema) as Resolver<ResetPasswordValues>,
    defaultValues: { newPassword: initialPassword },
  });
  const { handleSubmit, getValues } = form;

  async function handleCopy() {
    try {
      await copyText(getValues('newPassword'));
      notify.success({ title: 'Contraseña copiada al portapapeles' });
    } catch {
      notify.error({ title: 'No se pudo copiar la contraseña' });
    }
  }

  function handleReset() {
    void handleSubmit(({ newPassword }) => {
      const formData = new FormData();
      formData.set('userId', String(userId));
      formData.set('newPassword', newPassword);

      startTransition(async () => {
        const response = await resetPassword({}, formData);
        setState(response);

        if (response.success) {
          notify.success({ title: 'La contraseña se restableció correctamente' });
        }
      });
    })();
  }

  return (
    <FormProvider {...form}>
      <AlertDialogHeader>
        <AlertDialogTitle>
          {state.success
            ? `Contraseña de ${userName} restablecida`
            : `¿Restablecer la contraseña de ${userName}?`}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {state.success
            ? 'Compartí esta contraseña temporal con la persona. Se le pedirá cambiarla al ingresar.'
            : 'La contraseña actual dejará de funcionar. La persona deberá cambiar la contraseña temporal al ingresar.'}
        </AlertDialogDescription>
      </AlertDialogHeader>

      <TextInputField
        id="reset-password"
        name="newPassword"
        type="text"
        label="Contraseña temporal"
        readOnly={state.success || pending}
        maxLength={72}
        messages={state.errors?.newPassword}
        trailingAction={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Copiar contraseña"
            onClick={handleCopy}
          >
            <Copy className="size-3" />
          </Button>
        }
      />

      {state.formError && (
        <p role="alert" className="text-destructive text-sm">
          {state.formError}
        </p>
      )}

      <AlertDialogFooter>
        {state.success ? (
          <AlertDialogCancel>Listo</AlertDialogCancel>
        ) : (
          <>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction type="button" disabled={pending} onClick={handleReset}>
              {pending ? 'Restableciendo…' : 'Restablecer'}
            </AlertDialogAction>
          </>
        )}
      </AlertDialogFooter>
    </FormProvider>
  );
}
