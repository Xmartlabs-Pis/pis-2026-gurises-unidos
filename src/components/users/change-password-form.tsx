'use client';

import {
  startTransition,
  useActionState,
  useEffect,
  useState,
  type ComponentProps,
  type SubmitEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { FormProvider, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePassword, type PasswordFormState } from '@/app/actions/password';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import InputVisibilityToggle from '@/components/ui/forms/input-visibility-toggle';
import { TextInputField } from '@/components/ui/forms/text-input-field';
import { notify } from '@/lib/notify';
import { changePasswordSchema, type ChangePasswordFormValues } from '@/lib/validation/password';

const INITIAL_STATE: PasswordFormState = {};

export function ChangePasswordForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(changePassword, INITIAL_STATE);
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema) as Resolver<ChangePasswordFormValues>,
    defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
  });
  const { handleSubmit } = form;

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    return handleSubmit(() => {
      startTransition(() => {
        formAction(new FormData(formElement));
      });
    })(event);
  }

  useEffect(() => {
    if (state.formError) {
      notify.error({ title: state.formError });
      return;
    }
    if (!state.success) return;
    router.replace('/login?passwordChanged=1');
  }, [state, router]);

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} noValidate>
        <Card className="gap-4 pt-5 pb-5">
          <CardHeader className="px-6">
            <CardTitle className="leading-6 font-semibold">Contraseña</CardTitle>
            <CardDescription>
              Usá al menos 8 caracteres, con una mayúscula, una minúscula y un número. Al cambiarla
              vas a tener que iniciar sesión de nuevo.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <PasswordField
                id="current-password"
                name="currentPassword"
                label="Contraseña actual"
                messages={state.errors?.currentPassword}
                autoComplete="current-password"
                className="md:col-span-2"
              />
              <PasswordField
                id="new-password"
                name="newPassword"
                label="Nueva contraseña"
                messages={state.errors?.newPassword}
                maxLength={72}
                autoComplete="new-password"
              />
              <PasswordField
                id="confirm-new-password"
                name="confirmNewPassword"
                label="Confirmar nueva contraseña"
                messages={state.errors?.confirmNewPassword}
                maxLength={72}
                autoComplete="new-password"
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              size="lg"
              className="w-fit px-4"
              disabled={pending}
            >
              {pending ? 'Cambiando…' : 'Cambiar contraseña'}
            </Button>
          </CardContent>
        </Card>
      </form>
    </FormProvider>
  );
}

function PasswordField(props: Omit<ComponentProps<typeof TextInputField>, 'type'>) {
  const [visible, setVisible] = useState(false);

  return (
    <TextInputField
      {...props}
      type={visible ? 'text' : 'password'}
      trailingAction={
        <InputVisibilityToggle
          visible={visible}
          onToggle={() => setVisible((current) => !current)}
        />
      }
    />
  );
}
