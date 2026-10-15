'use client';

import { startTransition, useActionState, useEffect, type SubmitEvent } from 'react';
import { FormProvider, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { requestPasswordReset } from '@/app/actions/password-recovery';
import { TextInputField } from '@/components/ui/forms/text-input-field';
import { Button } from '@/components/ui/button';
import { forgotPasswordFormSchema, type ForgotPasswordFormValues } from '@/lib/validation/password';

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, {});
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordFormSchema) as Resolver<ForgotPasswordFormValues>,
    defaultValues: { email: '' },
  });
  const { handleSubmit, setError, clearErrors, getFieldState } = form;

  useEffect(() => {
    if (state.errors?.email?.[0]) {
      setError('email', { type: 'server', message: state.errors.email[0] });
    }
  }, [state, setError]);

  function clearServerError() {
    if (getFieldState('email').error?.type === 'server') {
      clearErrors('email');
    }
  }

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    return handleSubmit(() => {
      startTransition(() => {
        formAction(new FormData(formElement));
      });
    })(event);
  }

  if (state.success) {
    return (
      <p
        role="status"
        className="border-border bg-muted text-foreground rounded-lg border px-4 py-3 text-sm"
      >
        Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña. Revisá
        tu bandeja de entrada.
      </p>
    );
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <TextInputField
          id="email"
          name="email"
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          onChange={clearServerError}
        />
        <Button type="submit" disabled={pending} className="h-9 w-full shadow-xs/10">
          Enviar enlace
        </Button>
      </form>
    </FormProvider>
  );
}
